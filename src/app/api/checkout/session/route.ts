import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';
import User from '@/models/User';
import { stripe } from '@/lib/payment/stripe';
import { razorpay } from '@/lib/payment/razorpay';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { 
      planKey, 
      interval, 
      billingDetails, 
      discountCode, 
      provider 
    } = body;

    // Validate plan key
    const validPlanKeys = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'];
    if (!validPlanKeys.includes(planKey)) {
      return NextResponse.json({ error: 'Invalid plan key' }, { status: 400 });
    }

    // Get the plan from database
    const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine payment provider based on region or override
    let paymentProvider = provider;
    if (!paymentProvider) {
      // Auto-detect based on user's country or IP
      // For now, default to Stripe, but you can implement IP-based detection
      paymentProvider = 'stripe';
    }

    // Handle different plan types
    if (planKey === 'free') {
      // Free plan - no payment needed
      return NextResponse.json({ 
        success: true, 
        message: 'Free plan activated',
        planKey: 'free'
      });
    }

    if (planKey === 'day_pass') {
      // Day Pass - one-time payment
      return await handleDayPassPayment(plan, user, billingDetails, paymentProvider);
    } else {
      // Pro plans - subscription
      return await handleProPlanPayment(plan, user, interval, billingDetails, paymentProvider);
    }

  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDayPassPayment(
  plan: any, 
  user: any, 
  billingDetails: any, 
  provider: string
) {
  const amount = plan.price_one_time * 100; // Convert to cents/paisa

  if (provider === 'stripe') {
    try {
      // Create Stripe PaymentIntent for one-time payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: plan.currency.toLowerCase(),
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass'
        },
        customer: user.subscription?.providerCustomerId || undefined,
        description: `Day Pass - ${plan.name}`,
        receipt_email: billingDetails.email || user.email
      });

      return NextResponse.json({
        provider: 'stripe',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      });

    } catch (error) {
      console.error('Stripe PaymentIntent error:', error);
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
    }

  } else if (provider === 'razorpay') {
    try {
      // Create Razorpay Order for one-time payment
      const order = await razorpay.orders.create({
        amount: Math.round(amount),
        currency: plan.currency,
        receipt: `day_pass_${user._id}_${Date.now()}`,
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass'
        }
      });

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      });

    } catch (error) {
      console.error('Razorpay Order error:', error);
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
}

async function handleProPlanPayment(
  plan: any, 
  user: any, 
  interval: string, 
  billingDetails: any, 
  provider: string
) {
  // Determine the correct price based on interval
  let priceId: string | undefined;
  let amount: number;

  if (provider === 'stripe') {
    // Get the appropriate Stripe price ID
    if (interval === 'monthly') {
      priceId = plan.stripePriceId_monthly;
      amount = plan.price_monthly * 100;
    } else if (interval === 'quarterly') {
      priceId = plan.stripePriceId_quarterly;
      amount = plan.price_quarterly * 100;
    } else if (interval === 'yearly') {
      priceId = plan.stripePriceId_yearly;
      amount = plan.price_yearly * 100;
    }

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 400 });
    }

    try {
      // Create or get Stripe customer
      let customerId = user.subscription?.providerCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: billingDetails.name || `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user._id.toString()
          }
        });
        customerId = customer.id;
        
        // Update user with customer ID
        await User.findByIdAndUpdate(user._id, {
          'subscription.providerCustomerId': customerId
        });
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/settings?canceled=true`,
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          interval: interval
        },
        subscription_data: {
          metadata: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            interval: interval
          }
        }
      });

      return NextResponse.json({
        provider: 'stripe',
        redirect_url: session.url
      });

    } catch (error) {
      console.error('Stripe Checkout Session error:', error);
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
    }

  } else if (provider === 'razorpay') {
    // Get the appropriate Razorpay plan ID
    let planId: string | undefined;
    if (interval === 'monthly') {
      planId = plan.razorpayPlanId_monthly;
      amount = plan.price_monthly * 100;
    } else if (interval === 'quarterly') {
      planId = plan.razorpayPlanId_quarterly;
      amount = plan.price_quarterly * 100;
    } else if (interval === 'yearly') {
      planId = plan.razorpayPlanId_yearly;
      amount = plan.price_yearly * 100;
    }

    if (!planId) {
      return NextResponse.json({ error: 'Plan not configured for Razorpay' }, { status: 400 });
    }

    try {
      // Create Razorpay Subscription
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        total_count: null, // Ongoing subscription
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          interval: interval
        }
      });

      return NextResponse.json({
        provider: 'razorpay',
        subscription_id: subscription.id,
        plan_id: planId,
        status: subscription.status
      });

    } catch (error) {
      console.error('Razorpay Subscription error:', error);
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
}
