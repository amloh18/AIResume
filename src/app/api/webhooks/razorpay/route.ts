import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { razorpay } from '@/lib/payment/razorpay';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import Invoice from '@/models/Invoice';
import Coupon from '@/models/Coupon';
import subscriptionService from '@/lib/services/subscriptionService';
import crypto from 'crypto';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('x-razorpay-signature');

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
    await getConnection();

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
    const { planKey, userId, planId, type, region, couponCode, couponId } = payment.notes || {};

    if (!userId || !planKey) {
      console.error('Missing metadata in payment:', payment.id);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for payment:', payment.id);
      return;
    }

    // Increment coupon usage if applicable
    if (couponId || couponCode) {
      const coupon = couponId 
        ? await Coupon.findById(couponId)
        : await Coupon.findOne({ code: couponCode });
      
      if (coupon) {
        await coupon.incrementUsage();
      }
    }

    const regionCode = region || 'IN';
    const currency = payment.currency.toUpperCase() || 'INR';
    const amount = payment.amount / 100; // Convert from paisa

    if (planKey === 'day_pass' || type === 'day_pass') {
      // Activate day pass using subscription service
      const result = await subscriptionService.activateDayPass(
        userId,
        payment.id,
        regionCode,
        currency,
        amount
      );

      if (!result.success) {
        console.error('Failed to activate day pass:', result.error);
        return;
      }

      // Update provider customer ID if needed
      if (payment.customer_id && !user.subscription?.providerCustomerId) {
        await User.findByIdAndUpdate(userId, {
          'subscription.providerCustomerId': payment.customer_id
        });
      }

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      await Invoice.create({
        userId: userId,
        amount: amount,
        currency: currency,
        status: 'paid',
        planName: plan?.name || 'Day Pass',
        planId: planId || null,
        billingCycle: 'one-time',
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        description: `Day Pass - ${plan?.name || 'Day Pass'}`,
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id,
          couponCode: couponCode || null
        }
      });

      console.log(`✅ Day Pass activated for user ${user.email}`);
    } else if (planKey && ['pro_monthly', 'pro_quarterly', 'pro_yearly'].includes(planKey)) {
      // Handle pro plan activation (quarterly/yearly are one-time payments)
      const interval = planKey === 'pro_monthly' ? 'monthly' : 
                       planKey === 'pro_quarterly' ? 'quarterly' : 'yearly';
      
      const result = await subscriptionService.activateProPlan(
        userId,
        planKey,
        interval,
        payment.id,
        regionCode,
        currency,
        amount,
        undefined, // subscriptionId (for one-time payments)
        payment.customer_id
      );

      if (!result.success) {
        console.error('Failed to activate pro plan:', result.error);
        return;
      }

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      await Invoice.create({
        userId: userId,
        amount: amount,
        currency: currency,
        status: 'paid',
        planName: plan?.name || planKey,
        planId: planId || null,
        billingCycle: interval,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        description: `${plan?.name || planKey} - ${interval} subscription`,
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id,
          couponCode: couponCode || null
        }
      });

      console.log(`✅ Pro plan activated for user ${user.email}: ${planKey}`);
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

async function handleSubscriptionActivated(subscription: any) {
  try {
    const { planKey, userId, planId, interval, region, couponCode, couponId } = subscription.notes || {};

    if (!userId || !planKey) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Increment coupon usage if applicable
    if (couponId || couponCode) {
      const coupon = couponId 
        ? await Coupon.findById(couponId)
        : await Coupon.findOne({ code: couponCode });
      
      if (coupon) {
        await coupon.incrementUsage();
      }
    }

    // Calculate subscription period
    const startDate = new Date(subscription.start_at * 1000);
    const endDate = new Date(subscription.end_at * 1000);
    const regionCode = region || 'IN';
    
    // Get payment details if available
    const invoices = await razorpay.invoices.all({
      subscription_id: subscription.id,
      count: 1
    });
    
    const currency = invoices.items[0]?.currency || 'INR';
    const amount = invoices.items[0]?.amount ? invoices.items[0].amount / 100 : 0;

    // Activate subscription using subscription service
    const finalInterval = interval || (planKey === 'pro_monthly' ? 'monthly' : 
                                       planKey === 'pro_quarterly' ? 'quarterly' : 'yearly');
    
    const result = await subscriptionService.activateProPlan(
      userId,
      planKey,
      finalInterval,
      subscription.id, // Use subscription ID as payment ID
      regionCode,
      currency,
      amount,
      subscription.id, // subscriptionId
      subscription.customer_id
    );

    if (!result.success) {
      console.error('Failed to activate subscription:', result.error);
      return;
    }

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
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 });
    }
    const invoices = await razorpay.invoices.all({
      subscription_id: subscription.id,
      count: 1
    });

    if (invoices.items.length > 0) {
      const invoice = invoices.items[0];
      
      // Create invoice record for recurring payment
      await Invoice.create({
        userId: userId,
        amount: Number(invoice.amount || 0) / 100,
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

    // Handle subscription renewal
    const user = await User.findById(userId);
    if (user) {
      const result = await subscriptionService.handleSubscriptionRenewal(userId);
      
      if (!result.success) {
        console.error('Failed to handle subscription renewal:', result.error);
      }
    }

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
    const { planKey, userId, planId, type, region, couponCode, couponId } = order.notes || {};

    if (!userId || !planKey) {
      console.error('Invalid order metadata:', order.id);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for order:', order.id);
      return;
    }

    // Increment coupon usage if applicable
    if (couponId || couponCode) {
      const coupon = couponId 
        ? await Coupon.findById(couponId)
        : await Coupon.findOne({ code: couponCode });
      
      if (coupon) {
        await coupon.incrementUsage();
      }
    }

    const regionCode = region || 'IN';
    const currency = order.currency.toUpperCase() || 'INR';
    const amount = order.amount / 100; // Convert from paise

    if (planKey === 'day_pass' || type === 'day_pass') {
      // Activate day pass using subscription service
      const result = await subscriptionService.activateDayPass(
        userId,
        order.id,
        regionCode,
        currency,
        amount
      );

      if (!result.success) {
        console.error('Failed to activate day pass:', result.error);
        return;
      }

      // Update provider customer ID if needed
      if (order.customer_id && !user.subscription?.providerCustomerId) {
        await User.findByIdAndUpdate(userId, {
          'subscription.providerCustomerId': order.customer_id
        });
      }

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      await Invoice.create({
        userId: userId,
        amount: amount,
        currency: currency,
        status: 'paid',
        planName: plan?.name || 'Day Pass',
        planId: planId || null,
        billingCycle: 'one-time',
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        description: `Day Pass - ${plan?.name || 'Day Pass'}`,
        metadata: {
          razorpayOrderId: order.id,
          razorpayCustomerId: order.customer_id,
          couponCode: couponCode || null
        }
      });

      console.log(`✅ Day Pass activated for user ${user.email} via order payment`);
    } else if (planKey && ['pro_monthly', 'pro_quarterly', 'pro_yearly'].includes(planKey)) {
      // Handle pro plan activation (quarterly/yearly are one-time payments)
      const interval = planKey === 'pro_monthly' ? 'monthly' : 
                       planKey === 'pro_quarterly' ? 'quarterly' : 'yearly';
      
      const result = await subscriptionService.activateProPlan(
        userId,
        planKey,
        interval,
        order.id,
        regionCode,
        currency,
        amount,
        undefined, // subscriptionId (for one-time payments)
        order.customer_id
      );

      if (!result.success) {
        console.error('Failed to activate pro plan:', result.error);
        return;
      }

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      await Invoice.create({
        userId: userId,
        amount: amount,
        currency: currency,
        status: 'paid',
        planName: plan?.name || planKey,
        planId: planId || null,
        billingCycle: interval,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        description: `${plan?.name || planKey} - ${interval} subscription`,
        metadata: {
          razorpayOrderId: order.id,
          razorpayCustomerId: order.customer_id,
          couponCode: couponCode || null
        }
      });

      console.log(`✅ Pro plan activated for user ${user.email}: ${planKey}`);
    }
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}
