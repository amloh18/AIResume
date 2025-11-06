import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/payment/stripe';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import Invoice from '@/models/Invoice';
import { buffer } from 'micro';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    if (!stripe) {
      console.error('Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    await getConnection();

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  try {
    const { planKey, userId, planId, interval, region } = session.metadata;
    
    if (!userId || !planKey) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }

    // Get plan for invoice creation
    const PricingPlan = await getAdminPricingPlan();
    const plan = planId ? await PricingPlan.findById(planId) : null;

    // Use subscription service for activation
    const subscriptionService = (await import('@/lib/services/subscriptionService')).default;
    
    // Determine payment mode from session
    const isSubscription = session.mode === 'subscription';
    const isOneTimePayment = session.mode === 'payment';
    
    if (planKey === 'day_pass') {
      // Day pass: one-time payment
      const result = await subscriptionService.activateDayPass(
        userId,
        session.payment_intent || session.id,
        region || 'US',
        session.currency.toUpperCase(),
        session.amount_total / 100
      );

      if (!result.success) {
        console.error('Failed to activate day pass:', result.error);
        return;
      }

      // Update provider customer ID if needed
      if (session.customer && !user.subscription?.providerCustomerId) {
        await User.findByIdAndUpdate(userId, {
          'subscription.providerCustomerId': session.customer
        });
      }
    } else if (planKey && (planKey === 'pro_monthly' || planKey === 'pro_quarterly' || planKey === 'pro_yearly')) {
      // Pro plans
      const finalInterval = interval || (planKey === 'pro_monthly' ? 'monthly' : 
                                         planKey === 'pro_quarterly' ? 'quarterly' : 'yearly');
      
      const result = await subscriptionService.activateProPlan(
        userId,
        planKey,
        finalInterval,
        session.payment_intent || session.subscription || session.id,
        region || 'US',
        session.currency.toUpperCase(),
        session.amount_total / 100,
        session.subscription, // subscriptionId (for monthly recurring)
        session.customer
      );

      if (!result.success) {
        console.error('Failed to activate pro plan:', result.error);
        return;
      }
    }

    // Create invoice record
    const finalInterval = interval || (planKey === 'pro_monthly' ? 'monthly' : 
                                       planKey === 'pro_quarterly' ? 'quarterly' : 
                                       planKey === 'pro_yearly' ? 'yearly' : 
                                       planKey === 'day_pass' ? 'one-time' : 'monthly');
    
    await Invoice.create({
      userId: userId,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      status: 'paid',
      planName: plan?.name || planKey,
      planId: planId || null,
      billingCycle: finalInterval,
      paymentMethodType: 'stripe',
      paymentMethodLast4: session.payment_intent ? '****' : 'N/A',
      paidAt: new Date(),
      description: `${plan.name} - ${interval || 'monthly'} subscription`,
      metadata: {
        stripeSessionId: session.id,
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer
      }
    });

    console.log(`✅ User ${user.email} subscription activated: ${planKey}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    if (!stripe) {
      console.error('Stripe not configured');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const { planKey, userId, planId } = subscription.metadata;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    // Update subscription period
    const sub = subscription as any;
    await User.findByIdAndUpdate(userId, {
      'subscription.currentPeriodStart': new Date(sub.current_period_start * 1000),
      'subscription.currentPeriodEnd': new Date(sub.current_period_end * 1000)
    });

    // Create invoice record for recurring payment
    await Invoice.create({
      userId: userId,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: 'paid',
      planName: subscription.metadata.planName || 'Pro Plan',
      planId: planId,
      billingCycle: subscription.metadata.interval || 'monthly',
      paymentMethodType: 'stripe',
      paymentMethodLast4: '****',
      paidAt: new Date(),
      description: `Recurring payment - ${subscription.metadata.planName || 'Pro Plan'}`,
      metadata: {
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscription.id
      }
    });

    console.log(`✅ Recurring payment processed for user ${userId}: ${planKey}`);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const { planKey, userId } = subscription.metadata;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription update:', subscription.id);
      return;
    }

    const updateData: any = {
      'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
      'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
    };

    // Handle status changes
    if (subscription.status === 'canceled') {
      updateData['subscription.status'] = 'cancelled';
      updateData['subscription.endDate'] = new Date(subscription.canceled_at * 1000);
    } else if (subscription.status === 'active') {
      updateData['subscription.status'] = 'active';
    } else if (subscription.status === 'past_due') {
      updateData['subscription.status'] = 'inactive';
    }

    await User.findByIdAndUpdate(userId, updateData);

    console.log(`✅ Subscription updated for user ${userId}: ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const { planKey, userId } = subscription.metadata;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription deletion:', subscription.id);
      return;
    }

    // Downgrade to free plan
    await User.findByIdAndUpdate(userId, {
      currentPlanKey: 'free',
      'subscription.planKey': 'free',
      'subscription.status': 'cancelled',
      'subscription.endDate': new Date(),
      'subscription.provider': 'none',
      'subscription.interval': 'one-time'
    });

    console.log(`✅ Subscription cancelled for user ${userId}, downgraded to free`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    const { planKey, userId, planId, type, region } = paymentIntent.metadata;

    if (!userId || !planKey) {
      console.error('Invalid payment intent metadata:', paymentIntent.id);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for payment intent:', paymentIntent.id);
      return;
    }

    // Use subscription service for activation
    const subscriptionService = (await import('@/lib/services/subscriptionService')).default;
    
    if (type === 'day_pass') {
      // Activate day pass using subscription service
      const result = await subscriptionService.activateDayPass(
        userId,
        paymentIntent.id,
        region || 'US',
        paymentIntent.currency.toUpperCase(),
        paymentIntent.amount / 100
      );

      if (!result.success) {
        console.error('Failed to activate day pass:', result.error);
        return;
      }

      // Update provider customer ID if needed
      if (paymentIntent.customer && !user.subscription?.providerCustomerId) {
        await User.findByIdAndUpdate(userId, {
          'subscription.providerCustomerId': paymentIntent.customer
        });
      }
    } else if (planKey && (planKey === 'pro_monthly' || planKey === 'pro_quarterly' || planKey === 'pro_yearly')) {
      // Handle pro plan activation (quarterly/yearly are one-time payments)
      const interval = planKey === 'pro_monthly' ? 'monthly' : 
                       planKey === 'pro_quarterly' ? 'quarterly' : 'yearly';
      
      const result = await subscriptionService.activateProPlan(
        userId,
        planKey,
        interval,
        paymentIntent.id,
        region || 'US',
        paymentIntent.currency.toUpperCase(),
        paymentIntent.amount / 100,
        undefined, // subscriptionId (for one-time payments)
        paymentIntent.customer
      );

      if (!result.success) {
        console.error('Failed to activate pro plan:', result.error);
        return;
      }
    }

    // Create invoice record
    await Invoice.create({
      userId: userId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: 'paid',
      planName: plan.name,
      planId: planId,
      billingCycle: 'one-time',
      paymentMethodType: 'stripe',
      paymentMethodLast4: '****',
      paidAt: new Date(),
      description: `Day Pass - ${plan.name}`,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer
      }
    });

    console.log(`✅ Day Pass activated for user ${user.email}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  try {
    const { userId } = paymentIntent.metadata;

    if (userId) {
      // Update user subscription status to failed
      await User.findByIdAndUpdate(userId, {
        'subscription.status': 'inactive'
      });

      console.log(`❌ Payment failed for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}
