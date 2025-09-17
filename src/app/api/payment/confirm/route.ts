import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { User, PricingPlan, DiscountCode, Subscription } from '@/models';
import StripeService from '@/lib/payment/stripe';
import RazorpayService from '@/lib/payment/razorpay';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      paymentMethod,
      paymentIntentId, // For Stripe
      orderId, // For Razorpay
      paymentId, // For Razorpay
      signature, // For Razorpay verification
      planId,
      discountCodeId
    } = body;

    // Validate required fields
    if (!paymentMethod || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For development/testing, allow simulation without full payment verification
    const isSimulation = process.env.NODE_ENV === 'development' && !paymentIntentId && !orderId;

    // Get the pricing plan
    let plan = await PricingPlan.findById(planId);
    
    // If not found by ID, try to find by name
    if (!plan) {
      plan = await PricingPlan.findOne({ name: planId });
    }
    
    // If still not found, try to convert string to ObjectId
    if (!plan && mongoose.Types.ObjectId.isValid(planId)) {
      const objectId = new mongoose.Types.ObjectId(planId);
      plan = await PricingPlan.findById(objectId);
    }
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Pricing plan not found' },
        { status: 400 }
      );
    }
    
    if (plan.status !== 'active') {
      return NextResponse.json(
        { error: 'Pricing plan is inactive' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let paymentDetails;
    let discountAmount = 0;
    let finalAmount = plan.price;

    // Verify payment based on payment method
    if (isSimulation) {
      // For development/testing, simulate successful payment
      paymentDetails = {
        paymentProviderId: `sim_${Date.now()}`,
        amount: plan.price,
        currency: plan.currency,
        metadata: {
          userId: user._id.toString(),
          planName: plan.name,
          billingCycle: plan.billingCycle
        }
      };
    } else if (paymentMethod === 'stripe') {
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'Payment intent ID is required for Stripe' },
          { status: 400 }
        );
      }

      // Get payment intent details from Stripe
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        );
      }

      paymentDetails = {
        paymentProviderId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      };

    } else if (paymentMethod === 'razorpay') {
      if (!orderId || !paymentId || !signature) {
        return NextResponse.json(
          { error: 'Order ID, payment ID, and signature are required for Razorpay' },
          { status: 400 }
        );
      }

      // Verify Razorpay payment signature
      const verificationResult = RazorpayService.verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      );

      if (!verificationResult.success) {
        return NextResponse.json(
          { error: 'Payment verification failed' },
          { status: 400 }
        );
      }

      // Get payment details from Razorpay
      const paymentResult = await RazorpayService.getPayment(paymentId);
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: 'Failed to get payment details' },
          { status: 500 }
        );
      }

      paymentDetails = {
        paymentProviderId: paymentResult.payment.id,
        amount: paymentResult.payment.amount / 100, // Convert from paise
        currency: paymentResult.payment.currency,
        metadata: paymentResult.payment.notes
      };
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment method' },
        { status: 400 }
      );
    }

    // Calculate discount if applicable
    if (discountCodeId) {
      const discountCode = await DiscountCode.findById(discountCodeId);
      if (discountCode) {
        discountAmount = discountCode.discountValue;
        if (discountCode.discountType === 'percentage') {
          discountAmount = (plan.price * discountCode.discountValue) / 100;
        }
        finalAmount = plan.price - discountAmount;
      }
    }

    // Calculate subscription end date
    const startDate = new Date();
    let endDate = new Date();

    if (plan.billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (plan.billingCycle === 'one-time') {
      // For one-time payments, set end date to 1 year from now
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription record
    const subscription = new Subscription({
      userId: user._id,
      planId: plan._id,
      status: 'active',
      startDate,
      endDate,
      billingCycle: plan.billingCycle,
      amount: plan.price,
      currency: plan.currency,
      paymentMethod,
      paymentProviderId: paymentDetails.paymentProviderId,
      discountCodeId: discountCodeId || undefined,
      discountAmount,
      finalAmount: paymentDetails.amount,
      metadata: {
        stripeCustomerId: paymentMethod === 'stripe' ? paymentDetails.metadata?.stripeCustomerId : undefined,
        razorpayCustomerId: paymentMethod === 'razorpay' ? paymentDetails.metadata?.razorpayCustomerId : undefined,
        invoiceUrl: paymentDetails.metadata?.invoiceUrl,
        receiptUrl: paymentDetails.metadata?.receiptUrl
      }
    });

    await subscription.save();

    // Update user subscription
    user.subscription = {
      planName: plan.name,
      status: 'active',
      startDate,
      endDate,
      credits: plan.maxCVs || 20,
      planId: plan._id
    };

    await user.save();

    // Increment discount code usage if applicable
    if (discountCodeId) {
      const discountCode = await DiscountCode.findById(discountCodeId);
      if (discountCode) {
        await discountCode.incrementUsage();
      }
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        plan: {
          id: plan._id,
          name: plan.name,
          features: plan.features
        }
      },
      user: {
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
