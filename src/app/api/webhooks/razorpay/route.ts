import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { razorpay } from '@/lib/payment/razorpay';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import Invoice from '@/models/Invoice';
import crypto from 'crypto';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('x-razorpay-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Razorpay webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    await connectDB();

    console.log('Razorpay webhook event:', event.event);

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload.subscription.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(event.payload.subscription.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity);
        break;

      default:
        console.log(`Unhandled Razorpay event type: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    const { planKey, userId, planId, type } = payment.notes;

    if (!userId || !planKey) {
      console.error('Missing metadata in payment:', payment.id);
      return;
    }

    const user = await User.findById(userId);
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findById(planId);

    if (!user || !plan) {
      console.error('User or plan not found for payment:', payment.id);
      return;
    }

    if (type === 'day_pass') {
      // Handle Day Pass payment
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + (plan.dayPassDuration || 24));

      await User.findByIdAndUpdate(userId, {
        currentPlanKey: planKey,
        subscription: {
          planKey: planKey,
          status: 'active',
          startDate: new Date(),
          endDate: expiryDate,
          currentPeriodStart: new Date(),
          currentPeriodEnd: expiryDate,
          provider: 'razorpay',
          providerSubscriptionId: null,
          providerCustomerId: payment.customer_id,
          interval: 'one-time',
          seats: plan.maxCVs === -1 ? 1 : plan.maxCVs,
          storageUsed: 0
        }
      });

      // Create invoice record
      await Invoice.create({
        userId: userId,
        amount: payment.amount / 100, // Convert from paisa
        currency: payment.currency,
        status: 'paid',
        planName: plan.name,
        planId: planId,
        billingCycle: 'one-time',
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        description: `Day Pass - ${plan.name}`,
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id
        }
      });

      console.log(`✅ Day Pass activated for user ${user.email}`);
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

async function handleSubscriptionActivated(subscription: any) {
  try {
    const { planKey, userId, planId, interval } = subscription.notes;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    const user = await User.findById(userId);
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findById(planId);

    if (!user || !plan) {
      console.error('User or plan not found for subscription:', subscription.id);
      return;
    }

    // Calculate subscription period
    const startDate = new Date(subscription.start_at * 1000);
    const endDate = new Date(subscription.end_at * 1000);

    await User.findByIdAndUpdate(userId, {
      currentPlanKey: planKey,
      subscription: {
        planKey: planKey,
        status: 'active',
        startDate: startDate,
        endDate: endDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        provider: 'razorpay',
        providerSubscriptionId: subscription.id,
        providerCustomerId: subscription.customer_id,
        interval: interval || 'monthly',
        seats: plan.maxCVs === -1 ? 1 : plan.maxCVs,
        storageUsed: 0
      }
    });

    console.log(`✅ Subscription activated for user ${user.email}: ${planKey}`);
  } catch (error) {
    console.error('Error handling subscription activated:', error);
  }
}

async function handleSubscriptionCharged(subscription: any) {
  try {
    const { planKey, userId, planId } = subscription.notes;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription charge:', subscription.id);
      return;
    }

    // Get the latest invoice for this subscription
    const invoices = await razorpay.invoices.all({
      subscription_id: subscription.id,
      count: 1
    });

    if (invoices.items.length > 0) {
      const invoice = invoices.items[0];
      
      // Create invoice record for recurring payment
      await Invoice.create({
        userId: userId,
        amount: invoice.amount / 100,
        currency: invoice.currency,
        status: 'paid',
        planName: subscription.notes.planName || 'Pro Plan',
        planId: planId,
        billingCycle: subscription.notes.interval || 'monthly',
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        description: `Recurring payment - ${subscription.notes.planName || 'Pro Plan'}`,
        metadata: {
          razorpayInvoiceId: invoice.id,
          razorpaySubscriptionId: subscription.id
        }
      });
    }

    // Update subscription period
    await User.findByIdAndUpdate(userId, {
      'subscription.currentPeriodStart': new Date(subscription.current_start * 1000),
      'subscription.currentPeriodEnd': new Date(subscription.current_end * 1000)
    });

    console.log(`✅ Recurring payment processed for user ${userId}: ${planKey}`);
  } catch (error) {
    console.error('Error handling subscription charged:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const { planKey, userId } = subscription.notes;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription cancellation:', subscription.id);
      return;
    }

    // Update subscription status
    await User.findByIdAndUpdate(userId, {
      'subscription.status': 'cancelled',
      'subscription.endDate': new Date(subscription.ended_at * 1000)
    });

    console.log(`✅ Subscription cancelled for user ${userId}: ${planKey}`);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handleSubscriptionCompleted(subscription: any) {
  try {
    const { planKey, userId } = subscription.notes;

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription completion:', subscription.id);
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

    console.log(`✅ Subscription completed for user ${userId}, downgraded to free`);
  } catch (error) {
    console.error('Error handling subscription completed:', error);
  }
}

async function handleOrderPaid(order: any) {
  try {
    const { planKey, userId, planId, type } = order.notes;

    if (!userId || !planKey || type !== 'day_pass') {
      console.error('Invalid order metadata:', order.id);
      return;
    }

    const user = await User.findById(userId);
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findById(planId);

    if (!user || !plan) {
      console.error('User or plan not found for order:', order.id);
      return;
    }

    // Activate Day Pass
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (plan.dayPassDuration || 24));

    await User.findByIdAndUpdate(userId, {
      currentPlanKey: planKey,
      subscription: {
        planKey: planKey,
        status: 'active',
        startDate: new Date(),
        endDate: expiryDate,
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiryDate,
        provider: 'razorpay',
        providerSubscriptionId: null,
        providerCustomerId: order.customer_id,
        interval: 'one-time',
        seats: plan.maxCVs === -1 ? 1 : plan.maxCVs,
        storageUsed: 0
      }
    });

    // Create invoice record
    await Invoice.create({
      userId: userId,
      amount: order.amount / 100,
      currency: order.currency,
      status: 'paid',
      planName: plan.name,
      planId: planId,
      billingCycle: 'one-time',
      paymentMethodType: 'razorpay',
      paymentMethodLast4: '****',
      paidAt: new Date(),
      description: `Day Pass - ${plan.name}`,
      metadata: {
        razorpayOrderId: order.id,
        razorpayCustomerId: order.customer_id
      }
    });

    console.log(`✅ Day Pass activated for user ${user.email} via order payment`);
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}
