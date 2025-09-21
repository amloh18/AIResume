import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { User } from '@/models';
import StripeService from '@/lib/payment/stripe';
import RazorpayService from '@/lib/payment/razorpay';
import { LocationService } from '@/lib/payment/locationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { planName, amount, currency, paymentMethod, billingCycle } = body;

    if (!planName || !amount || !currency || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine payment partner based on currency
    const partner = currency === 'INR' ? 'razorpay' : 'stripe';

    if (partner === 'stripe') {
      // Handle Stripe payment
      const stripeResult = await StripeService.createPaymentIntent({
        amount: amount,
        currency: currency.toLowerCase(),
        customerId: user.stripeCustomerId,
        metadata: {
          userId: user._id.toString(),
          planName: planName,
          billingCycle: billingCycle || 'one-time'
        },
        description: `CV Circle - ${planName}`
      });

      if (!stripeResult.success) {
        return NextResponse.json(
          { success: false, error: stripeResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentIntentId: stripeResult.paymentIntentId,
        clientSecret: stripeResult.clientSecret,
        amount: stripeResult.amount,
        currency: stripeResult.currency,
        paymentMethod: 'stripe'
      });

    } else {
      // Handle Razorpay payment
      const razorpayResult = await RazorpayService.createOrder({
        amount: amount,
        currency: currency,
        receipt: `cv_circle_${Date.now()}`,
        notes: {
          userId: user._id.toString(),
          planName: planName,
          billingCycle: billingCycle || 'one-time'
        }
      });

      if (!razorpayResult.success) {
        return NextResponse.json(
          { success: false, error: razorpayResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: razorpayResult.orderId,
        amount: razorpayResult.amount,
        currency: razorpayResult.currency,
        paymentMethod: 'razorpay'
      });
    }

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
