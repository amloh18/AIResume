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

  if (!pricingPlan) {
    console.error(`Pricing plan not found: ID=${metadata.planId}, Key=${metadata.planKey}, Name=${metadata.planName}`);
    throw new Error(`Pricing plan not found for checkout metadata`);
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
      if (coupon.discountType === 'percentage') {
        discountAmount = (amount / 100) * (coupon.discountValue / (100 - coupon.discountValue));
      } else if (coupon.discountType === 'fixed') {
        discountAmount = coupon.discountValue;
      }
    }
  }

  const finalAmount = amount / 100;

  await withTransaction(async (session) => {
    const subscription = await subscriptionService.createSubscription(
      user._id,
      pricingPlan._id,
      billingCycle as 'monthly' | 'quarterly' | 'yearly' | 'one-time',
      finalAmount,
      currency.toUpperCase(),
      'polar',
      checkoutId,
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
