import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { razorpay } from '@/lib/payment/razorpay';
import User from '@/models/User';
import Invoice from '@/models/Invoice';

/**
 * Verify Razorpay payment signature
 * 
 * CRITICAL: This route only verifies payment signature.
 * Subscription activation is handled by the webhook to prevent race conditions.
 * 
 * Flow:
 * 1. Verify payment signature
 * 2. Check if payment already processed (idempotency)
 * 3. Return status to frontend (webhook will process activation)
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
      planKey
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
        alreadyProcessed: true,
        subscription: subscription ? {
          planKey: subscription.planKey,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          expiresAt: subscription.endDate
        } : null,
        message: 'Payment already processed'
      });
    }

    // Payment verified but not yet processed by webhook
    // Return pending status - webhook will process activation
    return NextResponse.json({
      success: true,
      pending: true,
      message: 'Payment verified. Subscription activation in progress...',
      paymentId: razorpay_payment_id
    });

  } catch (error) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

