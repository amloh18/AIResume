import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { razorpay } from '@/lib/payment/razorpay';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import subscriptionService from '@/lib/services/subscriptionService';
import { detectUserRegion } from '@/lib/services/regionDetectionService';

/**
 * Verify Razorpay payment and activate subscription
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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planKey,
      interval,
      couponId
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    // Verify payment signature
    const crypto = require('crypto');
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get order details to extract metadata
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const metadata = order.notes || {};
    const region = metadata.region || 'IN';
    const currency = payment.currency.toUpperCase() || 'INR';
    const amount = payment.amount / 100; // Convert from paise

    // Increment coupon usage if applicable
    if (couponId || metadata.couponId) {
      const coupon = await Coupon.findById(couponId || metadata.couponId);
      if (coupon) {
        await coupon.incrementUsage();
      }
    }

    // Activate subscription based on plan
    if (planKey === 'day_pass') {
      const result = await subscriptionService.activateDayPass(
        user._id.toString(),
        razorpay_payment_id,
        region,
        currency,
        amount
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to activate day pass' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        subscription: {
          planKey: 'day_pass',
          status: 'active',
          expiresAt: result.expiresAt,
          hoursRemaining: result.hoursRemaining
        }
      });
    } else if (planKey && ['pro_monthly', 'pro_quarterly', 'pro_yearly'].includes(planKey)) {
      const finalInterval = interval || (planKey === 'pro_monthly' ? 'monthly' : 
                                         planKey === 'pro_quarterly' ? 'quarterly' : 'yearly');
      
      const result = await subscriptionService.activateProPlan(
        user._id.toString(),
        planKey,
        finalInterval,
        razorpay_payment_id,
        region,
        currency,
        amount,
        undefined, // subscriptionId (for one-time payments)
        undefined // customerId
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to activate subscription' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        subscription: {
          planKey,
          status: 'active',
          interval: finalInterval
        }
      });
    }

    return NextResponse.json({ error: 'Invalid plan key' }, { status: 400 });

  } catch (error) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

