import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getConnection } from '@/lib/database';
import { getAdminSubscription } from '@/models/admin-models';
import { getAdminUser } from '@/models/admin-models';
import { getAdminPricingPlan } from '@/models/admin-models';
import { convertToINR } from '@/lib/utils/currencyConverter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using cookie
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    try {
      jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin token' },
        { status: 401 }
      );
    }

    await getConnection();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // day, week, month, quarter, year

    const Subscription = await getAdminSubscription();
    const User = await getAdminUser();
    const PricingPlan = await getAdminPricingPlan();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch successful subscriptions (active status means payment was successful)
    const subscriptions = await Subscription.find({
      status: 'active',
      createdAt: { $gte: startDate }
    })
      .populate('planId', 'name key')
      .lean();

    // Group by currency
    const revenueByCurrency: Record<string, { amount: number; count: number }> = {};
    let totalInINR = 0;

    for (const sub of subscriptions) {
      const currency = sub.currency || 'INR';
      const amount = sub.finalAmount || sub.amount || 0;
      
      if (!revenueByCurrency[currency]) {
        revenueByCurrency[currency] = { amount: 0, count: 0 };
      }
      revenueByCurrency[currency].amount += amount;
      revenueByCurrency[currency].count += 1;

      // Convert to INR
      totalInINR += convertToINR(amount, currency);
    }

    // Get user purchase list with details
    const userPurchases = await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const user = await User.findById(sub.userId).select('email firstName lastName ip_location').lean();
          const plan = await PricingPlan.findById(sub.planId?._id || sub.planId).select('name key').lean();
          
          return {
            userId: sub.userId?.toString() || 'unknown',
            userEmail: user?.email || 'Unknown',
            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
            planName: plan?.name || sub.planId?.name || 'Unknown',
            planKey: plan?.key || sub.planId?.key || 'unknown',
            amount: sub.finalAmount || sub.amount || 0,
            currency: sub.currency || 'INR',
            amountInINR: convertToINR(sub.finalAmount || sub.amount || 0, sub.currency || 'INR'),
            purchaseDate: sub.createdAt || sub.startDate,
            paymentMethod: sub.paymentMethod || 'unknown',
            location: user?.ip_location || 'Unknown',
            invoiceUrl: sub.metadata?.invoiceUrl
          };
        } catch (error) {
          console.error('Error processing subscription:', error);
          return null;
        }
      })
    );

    // Filter out null values
    const validPurchases = userPurchases.filter(p => p !== null) as any[];

    return NextResponse.json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      revenueByCurrency,
      totalInINR: Math.round(totalInINR * 100) / 100,
      userPurchases: validPurchases.sort((a, b) => 
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      ),
      totalPurchases: subscriptions.length
    });
  } catch (error: any) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}

