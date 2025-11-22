import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getRazorpay } from '@/lib/payment/razorpay';
import User from '@/models/User';
import Invoice from '@/models/Invoice';

/**
 * Verify Razorpay payment signature
 * 
 * CRITICAL: This route ONLY verifies payment signature.
 * Subscription activation is handled EXCLUSIVELY by the webhook to prevent race conditions.
 * 
 * Flow:
 * 1. Verify payment signature
 * 2. Check if payment already processed (idempotency check)
 * 3. Return verification status to frontend
 * 
 * The frontend should poll /api/user/current-plan to check when the webhook has activated the subscription.
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
      razorpay_signature
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

    // Get payment details from Razorpay to verify status
    const razorpayInstance = getRazorpay();
    if (!razorpayInstance) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    
    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if payment is successful
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return NextResponse.json({ 
        error: `Payment not successful. Status: ${payment.status}` 
      }, { status: 400 });
    }

    // IDEMPOTENCY CHECK: Check if payment already processed by webhook
    const existingInvoice = await Invoice.findOne({
      'metadata.razorpayPaymentId': razorpay_payment_id,
      status: 'paid'
    });

    if (existingInvoice) {
      // Payment already processed by webhook
      console.log(`Payment ${razorpay_payment_id} already processed`);
      
      // Get current subscription status
      const updatedUser = await User.findById(user._id);
      const subscription = updatedUser?.subscription;
      
      return NextResponse.json({
        success: true,
        verified: true,
        alreadyProcessed: true,
        subscription: subscription ? {
          planKey: subscription.planKey,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          expiresAt: subscription.endDate
        } : null,
        message: 'Payment verified and already processed'
      });
    }

    // Payment verified but not yet processed by webhook
    // Return success - frontend should poll for subscription status
    return NextResponse.json({
      success: true,
      verified: true,
      pending: true,
      message: 'Payment verified. Subscription activation in progress...',
      paymentId: razorpay_payment_id,
      // Frontend should poll /api/user/subscription to check when webhook activates subscription
      pollEndpoint: '/api/user/subscription'
    });

  } catch (error) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

