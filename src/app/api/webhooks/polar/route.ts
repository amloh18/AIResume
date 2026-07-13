// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getPolar } from '@/lib/payment/polar';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import Invoice from '@/models/Invoice';
import Transaction from '@/models/Transaction';
import InvoiceItem from '@/models/InvoiceItem';
import PaymentMethod from '@/models/PaymentMethod';
import WebhookLog from '@/models/WebhookLog';
import Coupon from '@/models/Coupon';
import subscriptionService from '@/lib/services/subscriptionService';
import { createTransaction } from '@/lib/services/transactionService';
import { withTransaction } from '@/lib/utils/db-transaction';
import crypto from 'crypto';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

function getPolarIdempotencyKey(event: any): string | null {
  if (event.data?.id) {
    return event.data.id;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();

    if (!webhookSecret) {
      console.error('POLAR_WEBHOOK_SECRET is missing');
      return NextResponse.json({ error: 'Missing webhook secret' }, { status: 400 });
    }

    let event;
    try {
      const headersRecord: Record<string, string> = {};
      headersList.forEach((value, key) => {
        headersRecord[key] = value;
      });
      
      event = validateEvent(body, headersRecord, webhookSecret);
    } catch (validationError) {
      if (validationError instanceof WebhookVerificationError) {
        console.error('Polar webhook signature verification failed:', validationError.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      console.error('Polar webhook validation error:', validationError);
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    await getConnection();

    const idempotencyKey = getPolarIdempotencyKey(event);
    
    if (idempotencyKey) {
      if (event.type === 'checkout.completed' && event.data?.id) {
        const checkoutId = event.data.id;
        const existingInvoice = await Invoice.findOne({
          'metadata.polarCheckoutId': checkoutId,
          status: 'paid'
        });

        if (existingInvoice) {
          console.log(`Checkout ${checkoutId} already processed (found in invoice)`);
          return NextResponse.json({ received: true, duplicate: true });
        }
      }

      const existingLogs = await WebhookLog.find({
        provider: 'polar',
        eventType: event.type,
        status: 'processed'
      });
      
      const existingLog = existingLogs.find((log: any) => {
        const payload = log.payload;
        if (payload?.id === idempotencyKey) return true;
        return false;
      });

      if (existingLog) {
        console.log(`Event already processed: ${event.type} for ${idempotencyKey}`);
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    let webhookLog;
    try {
      webhookLog = await WebhookLog.create({
        provider: 'polar',
        eventType: event.type,
        payload: event.data,
        status: 'pending'
      });
    } catch (logError) {
      console.error('Failed to log webhook:', logError);
    }

    console.log('Polar webhook event:', event.type);

    let processingError: Error | null = null;

    try {
      switch (event.type) {
        case 'checkout.completed':
          await handleCheckoutCompleted(event.data);
          break;

        case 'checkout.expired':
          await handleCheckoutExpired(event.data);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data);
          break;

        case 'subscription.updated':
          await handleSubscriptionUpdated(event.data);
          break;

        case 'subscription.cancelled':
          await handleSubscriptionCancelled(event.data);
          break;

        default:
          console.log(`Unhandled Polar event type: ${event.type}`);
      }

      if (webhookLog) {
        webhookLog.status = 'processed';
        await webhookLog.save();
      }

      return NextResponse.json({ received: true });

    } catch (error) {
      console.error('Error processing webhook:', error);
      processingError = error instanceof Error ? error : new Error(String(error));

      if (webhookLog) {
        webhookLog.status = 'failed';
        webhookLog.errorMessage = processingError.message;
        await webhookLog.save();
      }

      return NextResponse.json(
        { error: 'Webhook processing failed', message: processingError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Polar webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(checkout: any) {
  console.log('Processing Polar checkout.completed event:', checkout.id);

  const checkoutId = checkout.id;
  const customerId = checkout.customer?.id;
  const customerEmail = checkout.customer?.email;
  const amount = checkout.amount;
  const currency = checkout.currency;
  const metadata = checkout.metadata || {};
  const productId = checkout.product?.id;
  const productPriceId = checkout.productPrice?.id;

  const user = await User.findOne({ email: customerEmail });
  if (!user) {
    throw new Error(`User not found for email: ${customerEmail}`);
  }

  const userId = user._id.toString();
  const PricingPlan = await getAdminPricingPlan();
  let pricingPlan = null;

  if (metadata.planId) {
    pricingPlan = await PricingPlan.findById(metadata.planId);
  }
  if (!pricingPlan && metadata.planKey) {
    pricingPlan = await PricingPlan.findOne({ key: metadata.planKey });
  }
  if (!pricingPlan && metadata.planName) {
    pricingPlan = await PricingPlan.findOne({ name: metadata.planName });
  }
  if (!pricingPlan && productId) {
    pricingPlan = await PricingPlan.findOne({
      $or: [
        { polarProductId_monthly: productId },
        { polarProductId_yearly: productId },
        { polarProductId_quarterly: productId },
        { polarProductId_one_time: productId },
        { 'regionalPricing.polarProductId': productId }
      ]
    });
  }
  if (!pricingPlan && productPriceId) {
    pricingPlan = await PricingPlan.findOne({
      $or: [
        { polarPriceId_monthly: productPriceId },
        { polarPriceId_yearly: productPriceId },
        { polarPriceId_quarterly: productPriceId },
        { polarPriceId_one_time: productPriceId },
        { 'regionalPricing.polarPriceId': productPriceId }
      ]
    });
  }

  if (!pricingPlan) {
    console.error(`Pricing plan not found: ID=${metadata.planId}, Key=${metadata.planKey}, Name=${metadata.planName}, PolarProductId=${productId}`);
    throw new Error(`Pricing plan not found for checkout metadata or Polar IDs`);
  }

  const finalPlanName = pricingPlan.name || metadata.planName || 'Unknown Plan';
  const billingCycle = metadata.interval || metadata.billingCycle || 'one-time';

  const Coupon = await import('@/models/Coupon').then(m => m.default);
  let discountAmount = 0;
  let discountCodeId = null;

  if (metadata.discountCodeId) {
    const coupon = await Coupon.findById(metadata.discountCodeId);
    if (coupon) {
      discountCodeId = coupon._id;
      // amount is already in minor units (cents/pence). Convert to major for discount.
      const amountInMajor = amount / 100;
      if (coupon.discountType === 'percentage') {
        // Correct formula: discount = amountInMajor * (value / 100)
        discountAmount = amountInMajor * (coupon.discountValue / 100);
      } else if (coupon.discountType === 'fixed') {
        discountAmount = coupon.discountValue;
      }
    }
  }

  const finalAmount = amount / 100;

  // --- Resolve Actual Subscription ID ---
  let actualSubscriptionId = checkout.subscriptionId || checkout.subscription_id || checkout.subscription?.id;
  if (!actualSubscriptionId) {
    try {
      const { default: PolarService } = await import('@/lib/payment/polar');
      const polar = (PolarService as any).getPolar();
      if (polar) {
        const polarSubscriptions = await polar.subscriptions.list({
          customerEmail: customerEmail,
          limit: 1
        });
        const activeSub = (polarSubscriptions.items || []).find((s: any) => s.status === 'active');
        if (activeSub) actualSubscriptionId = activeSub.id;
      }
    } catch (err) {
      console.error('Failed to query actual Polar subscription ID:', err);
    }
  }
  actualSubscriptionId = actualSubscriptionId || checkoutId;

  await withTransaction(async (session) => {
    const subscription = await subscriptionService.createSubscription(
      user._id,
      pricingPlan._id,
      billingCycle as 'monthly' | 'quarterly' | 'yearly' | 'one-time',
      finalAmount,
      currency.toUpperCase(),
      'polar',
      actualSubscriptionId,
      discountCodeId,
      discountAmount,
      {
        polarCustomerId: customerId,
        region: metadata.region
      },
      session
    );

    const invoice = await Invoice.create([{
      userId: user._id,
      subscriptionId: subscription._id,
      subtotal: finalAmount + discountAmount,
      taxAmount: 0,
      amount: finalAmount,
      currency: currency.toUpperCase(),
      status: 'paid',
      planName: finalPlanName,
      planId: pricingPlan._id,
      billingCycle: billingCycle as 'monthly' | 'quarterly' | 'yearly' | 'one-time',
      dueDate: new Date(),
      invoiceDate: new Date(),
      paidAt: new Date(),
      paymentProvider: 'polar',
      metadata: {
        polarCheckoutId: checkoutId,
        polarCustomerId: customerId,
        productId: productId,
        productPriceId: productPriceId,
      }
    }], { session });

    const invoiceItem = await InvoiceItem.create([{
      invoiceId: invoice[0]._id,
      description: `${finalPlanName} Subscription`,
      quantity: 1,
      unitPrice: finalAmount + discountAmount,
      amount: finalAmount + discountAmount,
      type: 'subscription',
      metadata: {
        planName: finalPlanName,
        billingCycle: billingCycle,
      }
    }], { session });

    await createTransaction({
      userId: user._id,
      type: 'subscription_payment',
      amount: finalAmount,
      currency: currency.toUpperCase(),
      status: 'completed',
      description: `Subscription payment for ${finalPlanName}`,
      paymentProvider: 'polar',
      metadata: {
        checkoutId: checkoutId,
        subscriptionId: subscription._id.toString(),
        invoiceId: invoice[0]._id.toString(),
        planName: finalPlanName,
      },
      session
    });

    console.log('Polar checkout completed processing successful:', {
      userId,
      subscriptionId: subscription._id,
      invoiceId: invoice[0]._id,
      planName: finalPlanName
    });
  });

  // Track payment completion server-side (outside transaction to avoid blocking)
  try {
    const { getPostHogClient } = await import('@/lib/posthog-server');
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: 'subscription_payment_completed',
      properties: {
        plan_name: finalPlanName,
        billing_cycle: billingCycle,
        amount: finalAmount,
        currency: currency.toUpperCase(),
        payment_provider: 'polar',
        checkout_id: checkoutId,
        $set: {
          plan: finalPlanName,
          billing_cycle: billingCycle,
        },
      },
    });
  } catch (phError) {
    console.error('PostHog capture error (subscription_payment_completed):', phError);
  }
}

async function handleCheckoutExpired(checkout: any) {
  console.log('Processing Polar checkout.expired event:', checkout.id);
  
  const checkoutId = checkout.id;
  
  const invoice = await Invoice.findOne({
    'metadata.polarCheckoutId': checkoutId,
    status: 'pending'
  });

  if (invoice) {
    invoice.status = 'cancelled';
    await invoice.save();
    console.log('Invoice marked as cancelled for expired checkout:', checkoutId);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Processing Polar subscription.updated event:', subscription.id);

  const customerEmail = subscription.customer?.email;
  if (!customerEmail) {
    console.error('subscription.updated: No customer email found');
    return;
  }

  const user = await User.findOne({ email: customerEmail });
  if (!user) {
    console.error(`subscription.updated: User not found for email ${customerEmail}`);
    return;
  }

  const status = subscription.status; // 'active' | 'canceled' | 'past_due' | 'unpaid'

  if (status === 'active') {
    // Subscription renewed or reactivated — ensure user is not on free
    const PricingPlan = await getAdminPricingPlan();
    const productId = subscription.product?.id;
    let pricingPlan = null;

    if (productId) {
      pricingPlan = await PricingPlan.findOne({
        $or: [
          { 'regionalPricing.polarProductId': productId },
          { polarProductId_monthly: productId },
          { polarProductId_yearly: productId },
          { polarProductId_quarterly: productId },
        ]
      });
    }

    if (pricingPlan) {
      const newPlanKey = pricingPlan.key;
      await User.findByIdAndUpdate(user._id, {
        $set: {
          currentPlanKey: newPlanKey,
          'subscription.planKey': newPlanKey,
          'subscription.status': 'active',
          'subscription.providerSubscriptionId': subscription.id,
          'subscription.currentPeriodStart': subscription.currentPeriodStart
            ? new Date(subscription.currentPeriodStart)
            : undefined,
          'subscription.currentPeriodEnd': subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : undefined,
        }
      });
      console.log(`subscription.updated: synced user ${user._id} to plan ${newPlanKey}`);
    } else {
      // Just update the subscription status to active
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'subscription.status': 'active',
          'subscription.providerSubscriptionId': subscription.id,
        }
      });
      console.log(`subscription.updated: updated status to active for user ${user._id}`);
    }
  } else if (status === 'canceled' || status === 'past_due' || status === 'unpaid') {
    // Mark subscription as cancelled/expired — revert to free
    await User.findByIdAndUpdate(user._id, {
      $set: {
        currentPlanKey: 'free',
        'subscription.planKey': 'free',
        'subscription.status': status === 'canceled' ? 'cancelled' : 'expired',
        'subscription.providerSubscriptionId': subscription.id,
      }
    });
    console.log(`subscription.updated: reverted user ${user._id} to free (Polar status: ${status})`);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  console.log('Processing Polar subscription.cancelled event:', subscription.id);

  const customerEmail = subscription.customer?.email;
  if (!customerEmail) {
    console.error('subscription.cancelled: No customer email found');
    return;
  }

  const user = await User.findOne({ email: customerEmail });
  if (!user) {
    console.error(`subscription.cancelled: User not found for email ${customerEmail}`);
    return;
  }

  // Keep the user on their plan until the period ends (access stays until currentPeriodEnd)
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;

  const updateFields: any = {
    'subscription.autoRenew': false,
    'subscription.downgradeStatus': 'pending',
    'subscription.pendingDowngradePlanKey': 'free',
  };

  if (periodEnd) {
    updateFields['subscription.currentPeriodEnd'] = periodEnd;
    updateFields['subscription.endDate'] = periodEnd;
  }

  await User.findByIdAndUpdate(user._id, { $set: updateFields });

  console.log(`subscription.cancelled: user ${user._id} cancellation scheduled. Access until ${periodEnd?.toISOString() ?? 'unknown'}`);

  try {
    const { getPostHogClient } = await import('@/lib/posthog-server');
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user._id.toString(),
      event: 'subscription_cancelled',
      properties: {
        subscription_id: subscription.id,
        payment_provider: 'polar',
        period_end: periodEnd?.toISOString(),
      },
    });
  } catch (phError) {
    console.error('PostHog capture error (subscription_cancelled):', phError);
  }
}

async function handleChargeRefunded(charge: any) {
  console.log('Processing Polar charge.refunded event:', charge.id);

  
  const checkoutId = charge.checkout?.id;
  
  if (!checkoutId) {
    console.error('No checkout ID found in refund event');
    return;
  }

  const invoice = await Invoice.findOne({
    'metadata.polarCheckoutId': checkoutId,
    status: 'paid'
  });

  if (invoice) {
    invoice.status = 'refunded';
    await invoice.save();

    const transaction = await Transaction.findOne({
      'metadata.checkoutId': checkoutId,
      status: 'completed'
    });

    if (transaction) {
      transaction.status = 'refunded';
      await transaction.save();
    }

    const user = await User.findById(invoice.userId);
    if (user) {
      user.currentPlanKey = 'free';
      if (user.subscription) {
        user.subscription.planKey = 'free';
        user.subscription.status = 'expired';
      }
      await user.save();
    }

    console.log('Refund processed successfully for checkout:', checkoutId);

    // Track refund server-side
    if (user) {
      try {
        const { getPostHogClient } = await import('@/lib/posthog-server');
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: user._id.toString(),
          event: 'subscription_payment_refunded',
          properties: {
            checkout_id: checkoutId,
            payment_provider: 'polar',
            $set: {
              plan: 'free',
            },
          },
        });
      } catch (phError) {
        console.error('PostHog capture error (subscription_payment_refunded):', phError);
      }
    }
  }
}
