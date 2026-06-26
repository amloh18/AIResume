import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAdminSubscription } from '@/models/admin-models';
import { getAdminUser } from '@/models/admin-models';
import { getAdminPricingPlan } from '@/models/admin-models';
import { convertToINR } from '@/lib/utils/currencyConverter';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import PolarService from '@/lib/payment/polar';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using NextAuth session
    await requireAdmin(request);

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

    // Try fetching from Polar API first
    let orders: any[] = [];
    let usingPolar = false;

    if (process.env.POLAR_ACCESS_TOKEN) {
      try {
        const polarResult = await PolarService.listOrders({ limit: 100 });
        if (polarResult.success && polarResult.orders) {
          orders = polarResult.orders;
          usingPolar = true;
        }
      } catch (polarError) {
        console.warn('Failed to fetch orders from Polar API, using DB fallback:', polarError);
      }
    }

    const revenueByCurrency: Record<string, { amount: number; count: number }> = {};
    let totalInINR = 0;
    let userPurchases: any[] = [];
    let totalPurchasesCount = 0;

    if (usingPolar) {
      // Filter Polar orders by startDate
      const filteredOrders = orders.filter(order => new Date(order.created_at) >= startDate);
      totalPurchasesCount = filteredOrders.length;

      for (const order of filteredOrders) {
        const currency = (order.currency || 'USD').toUpperCase();
        const amount = (order.amount || 0) / 100;

        if (!revenueByCurrency[currency]) {
          revenueByCurrency[currency] = { amount: 0, count: 0 };
        }
        revenueByCurrency[currency].amount += amount;
        revenueByCurrency[currency].count += 1;

        totalInINR += convertToINR(amount, currency);
      }

      userPurchases = filteredOrders.map(order => {
        const currency = (order.currency || 'USD').toUpperCase();
        const amount = (order.amount || 0) / 100;
        return {
          userId: order.customer?.id || 'unknown',
          userEmail: order.customer?.email || 'Unknown',
          userName: order.customer?.name || 'Unknown',
          planName: order.product?.name || 'Unknown',
          planKey: order.product?.id || 'unknown',
          amount,
          currency,
          amountInINR: convertToINR(amount, currency),
          purchaseDate: order.created_at,
          paymentMethod: 'card',
          location: order.customer?.ip_address_country || 'Unknown',
          invoiceUrl: undefined
        };
      });
    } else {
      // Fallback: Fetch successful subscriptions from database
      const subscriptions = await Subscription.find({
        status: 'active',
        createdAt: { $gte: startDate }
      }).lean()
        .populate('planId', 'name key')
        .lean();

      totalPurchasesCount = subscriptions.length;

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
      const dbPurchases = await Promise.all(
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

      userPurchases = dbPurchases.filter(p => p !== null) as any[];
    }

    return NextResponse.json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      revenueByCurrency,
      totalInINR: Math.round(totalInINR * 100) / 100,
      userPurchases: userPurchases.sort((a, b) => 
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      ),
      totalPurchases: totalPurchasesCount
    });
  } catch (error: any) {
    console.error('Error fetching revenue data:', error);
    
    // Handle authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}

