import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import User from '@/models/User';
import { stripe } from '@/lib/payment/stripe';
import { razorpay } from '@/lib/payment/razorpay';
import { detectUserRegion, getPricingForRegion } from '@/lib/services/regionDetectionService';
import Coupon from '@/models/Coupon';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const { 
      planKey, 
      interval, 
      billingDetails, 
      discountCode, 
      couponCode,
      provider,
      returnUrl,
      triggerContext
    } = body;
    
    // Handle coupon/discount code
    let couponDiscount = null;
    if (couponCode || discountCode) {
      const code = (couponCode || discountCode).toUpperCase();
      const coupon = await Coupon.findOne({ code });
      
      if (coupon) {
        const validation = coupon.isValid();
        if (validation.valid) {
          // Check if coupon applies to this plan
          const isApplicable = 
            (!coupon.applicablePlanKeys || coupon.applicablePlanKeys.length === 0 || coupon.applicablePlanKeys.includes(planKey)) &&
            (!coupon.applicablePlans || coupon.applicablePlans.length === 0 || coupon.applicablePlans.includes(planKey));
          
          if (isApplicable) {
            couponDiscount = {
              code: coupon.code,
              type: coupon.type,
              value: coupon.discountValue || 0,
              id: coupon._id.toString()
            };
          }
        }
      }
    }

    // Validate plan key
    const validPlanKeys = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'];
    if (!validPlanKeys.includes(planKey)) {
      return NextResponse.json({ error: 'Invalid plan key' }, { status: 400 });
    }

    // Get the plan from database
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Detect user region from IP or use provided region
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const regionInfo = await detectUserRegion(ip);
    
    // Determine payment provider based on region or override
    let paymentProvider = provider;
    if (!paymentProvider) {
      // Auto-detect based on region
      paymentProvider = regionInfo.paymentPartner;
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
      return await handleDayPassPayment(plan, user, billingDetails, paymentProvider, regionInfo, couponDiscount);
    } else {
      // Pro plans - monthly (recurring) or quarterly/yearly (one-time)
      return await handleProPlanPayment(plan, user, interval, billingDetails, paymentProvider, returnUrl, regionInfo, couponDiscount);
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
  provider: string,
  regionInfo: any,
  couponDiscount?: any
) {
  // Get regional pricing
  const regionalPrice = getPricingForRegion(plan, regionInfo.countryCode);
  let amount = (regionalPrice?.price || plan.price_one_time || 0) * 100; // Convert to cents/paisa
  const currency = regionalPrice?.currency || plan.currency || 'USD';
  
  // Apply coupon discount
  if (couponDiscount && couponDiscount.type === 'percentage') {
    amount = Math.round(amount * (1 - couponDiscount.value / 100));
  } else if (couponDiscount && couponDiscount.type === 'fixed') {
    amount = Math.max(0, amount - (couponDiscount.value * 100));
  }

  if (provider === 'stripe') {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    try {
      // Use region-specific Stripe price ID if available, otherwise create payment intent
      const stripePriceId = regionalPrice?.stripePriceId;
      
      if (stripePriceId) {
        // Use existing Stripe price
        const session = await stripe.checkout.sessions.create({
          customer: user.subscription?.providerCustomerId || undefined,
          payment_method_types: ['card'],
          line_items: [{
            price: stripePriceId,
            quantity: 1,
          }],
          mode: 'payment', // One-time payment
          success_url: `${process.env.NEXTAUTH_URL || ''}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXTAUTH_URL || ''}/dashboard/settings?canceled=true`,
          metadata: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            type: 'day_pass',
            region: regionInfo.countryCode
          }
        });

        return NextResponse.json({
          provider: 'stripe',
          redirect_url: session.url
        });
      }

      // Fallback: Create PaymentIntent for one-time payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass',
          region: regionInfo.countryCode
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
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }
    try {
      // Use region-specific Razorpay plan ID if available, otherwise create order
      const razorpayPlanId = regionalPrice?.razorpayPlanId;
      
      if (razorpayPlanId) {
        // Create Razorpay subscription for one-time payment (total_count: 1)
        const subscription = await razorpay.subscriptions.create({
          plan_id: razorpayPlanId,
          total_count: 1, // One-time payment
          customer_notify: 1,
          notes: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            type: 'day_pass',
            region: regionInfo.countryCode
          }
        });

        return NextResponse.json({
          provider: 'razorpay',
          subscription_id: subscription.id,
          plan_id: razorpayPlanId
        });
      }

      // Fallback: Create Razorpay Order for one-time payment
      const order = await razorpay.orders.create({
        amount: Math.round(amount),
        currency: currency,
        receipt: `day_pass_${user._id}_${Date.now()}`,
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass',
          region: regionInfo.countryCode
        }
      });

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        checkout: true, // Use Razorpay Checkout
        coupon: couponDiscount ? {
          code: couponDiscount.code,
          id: couponDiscount.id
        } : null
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
  provider: string,
  returnUrl?: string,
  regionInfo?: any,
  couponDiscount?: any
) {
  // Get regional pricing
  const regionalPrice = regionInfo ? getPricingForRegion(plan, regionInfo.countryCode) : null;
  
  // Determine the correct price based on interval
  let priceId: string | undefined;
  let amount: number;
  let paymentMode: 'payment' | 'subscription' = 'subscription'; // Default to subscription
  
  // Monthly = recurring subscription, Quarterly/Yearly = one-time payment
  if (interval === 'quarterly' || interval === 'yearly') {
    paymentMode = 'payment'; // One-time payment
  }

  if (provider === 'stripe') {
    // Get the appropriate Stripe price ID (use regional if available)
    if (interval === 'monthly') {
      priceId = regionalPrice?.stripePriceId || plan.stripePriceId_monthly;
      amount = (regionalPrice?.price || plan.price_monthly || 0) * 100;
    } else if (interval === 'quarterly') {
      priceId = regionalPrice?.stripePriceId || plan.stripePriceId_quarterly;
      amount = (regionalPrice?.price || plan.price_quarterly || 0) * 100;
    } else if (interval === 'yearly') {
      priceId = regionalPrice?.stripePriceId || plan.stripePriceId_yearly;
      amount = (regionalPrice?.price || plan.price_yearly || 0) * 100;
    }
    
    // Apply coupon discount
    if (couponDiscount) {
      if (couponDiscount.type === 'percentage') {
        amount = Math.round(amount * (1 - couponDiscount.value / 100));
      } else if (couponDiscount.type === 'fixed') {
        amount = Math.max(0, amount - (couponDiscount.value * 100));
      }
    }

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
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
      const sessionConfig: any = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: paymentMode,
        success_url: `${returnUrl || process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl || process.env.NEXTAUTH_URL}/dashboard/settings?canceled=true`,
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          interval: interval,
          region: regionInfo?.countryCode || 'US',
          couponCode: couponDiscount?.code || '',
          couponId: couponDiscount?.id || ''
        }
      };

      // For subscriptions (monthly), add subscription_data
      if (paymentMode === 'subscription') {
        sessionConfig.subscription_data = {
          metadata: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            interval: interval,
            region: regionInfo?.countryCode || 'US'
          }
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return NextResponse.json({
        provider: 'stripe',
        redirect_url: session.url
      });

    } catch (error) {
      console.error('Stripe Checkout Session error:', error);
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
    }

  } else if (provider === 'razorpay') {
    // For Razorpay, we'll use Checkout (embedded form) for better UX
    // Calculate amount based on interval
    if (interval === 'monthly') {
      amount = (regionalPrice?.price || plan.price_monthly || 0) * 100; // Convert to paise
    } else if (interval === 'quarterly') {
      amount = (regionalPrice?.price || plan.price_quarterly || 0) * 100;
    } else if (interval === 'yearly') {
      amount = (regionalPrice?.price || plan.price_yearly || 0) * 100;
    }
    
    // Apply coupon discount
    if (couponDiscount) {
      if (couponDiscount.type === 'percentage') {
        amount = Math.round(amount * (1 - couponDiscount.value / 100));
      } else if (couponDiscount.type === 'fixed') {
        amount = Math.max(0, amount - (couponDiscount.value * 100));
      }
    }
    
    const currency = regionalPrice?.currency || plan.currency || 'INR';

    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }

    try {
      // Create Razorpay Order for Checkout
      const order = await razorpay.orders.create({
        amount: amount,
        currency: currency,
        receipt: `order_${user._id}_${Date.now()}`,
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          interval: interval,
          region: regionInfo?.countryCode || 'IN',
          couponCode: couponDiscount?.code || '',
          couponId: couponDiscount?.id || ''
        }
      });

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        checkout: true, // Use Razorpay Checkout
        coupon: couponDiscount ? {
          code: couponDiscount.code,
          id: couponDiscount.id
        } : null,
        metadata: {
          planKey: plan.key,
          interval: interval,
          userId: user._id.toString()
        }
      });

    } catch (error) {
      console.error('Razorpay Order error:', error);
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
}
