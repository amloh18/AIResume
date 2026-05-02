// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import subscriptionService from '@/lib/services/subscriptionService';

/**
 * Activate Day Pass after successful payment
 * This endpoint is called from webhooks or after payment confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const { 
      paymentId, 
      region, 
      currency, 
      price,
      paymentProvider 
    } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Detect region if not provided
    let finalRegion = region;
    let finalCurrency = currency || 'USD';
    let finalPrice = price;

    if (!finalRegion) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      const { detectUserRegion } = await import('@/lib/services/regionDetectionService');
      const regionInfo = await detectUserRegion(ip);
      finalRegion = regionInfo.countryCode;
      if (!finalCurrency) {
        finalCurrency = regionInfo.currency;
      }
    }

    // Activate day pass using subscription service
    const result = await subscriptionService.activateDayPass(
      user._id.toString(),
      paymentId,
      finalRegion,
      finalCurrency,
      finalPrice || 0
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to activate day pass' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Day pass activated successfully',
      expiresAt: result.expiresAt,
      hoursRemaining: result.hoursRemaining,
      subscription: {
        planKey: 'day_pass',
        status: 'active',
        expiresAt: result.expiresAt
      }
    });

  } catch (error) {
    console.error('Error activating day pass:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

