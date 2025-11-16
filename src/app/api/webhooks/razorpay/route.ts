import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { razorpay } from '@/lib/payment/razorpay';
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

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Extract idempotency key from Razorpay webhook event
 * Uses payment ID, order ID, or subscription ID as the key
 */
function getRazorpayIdempotencyKey(event: any): string | null {
  if (event.payload?.payment?.entity?.id) {
    return event.payload.payment.entity.id;
  }
  if (event.payload?.order?.entity?.id) {
    return event.payload.order.entity.id;
  }
  if (event.payload?.subscription?.entity?.id) {
    return event.payload.subscription.entity.id;
  }
  return null;
}

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

    // IDEMPOTENCY CHECK: Check if this event was already processed
    // For Razorpay, we use payment/order/subscription ID as idempotency key
    const idempotencyKey = getRazorpayIdempotencyKey(event);
    
    if (idempotencyKey) {
      // Check by payment ID in invoice metadata (most reliable for payment.captured events)
      if (event.event === 'payment.captured' && event.payload?.payment?.entity?.id) {
        const paymentId = event.payload.payment.entity.id;
        const existingInvoice = await Invoice.findOne({
          'metadata.razorpayPaymentId': paymentId,
          status: 'paid'
        });

        if (existingInvoice) {
          console.log(`Payment ${paymentId} already processed (found in invoice)`);
          return NextResponse.json({ received: true, duplicate: true });
        }
      }

      // Check WebhookLog for processed events with same payment/order/subscription ID
      // Note: payload is stored as Mixed type, so we need to check the structure
      const existingLogs = await WebhookLog.find({
        provider: 'razorpay',
        eventType: event.event,
        status: 'processed'
      });
      
      // Check if any log has matching payment/order/subscription ID in payload
      const existingLog = existingLogs.find((log: any) => {
        const payload = log.payload;
        if (payload?.payment?.entity?.id === idempotencyKey) return true;
        if (payload?.order?.entity?.id === idempotencyKey) return true;
        if (payload?.subscription?.entity?.id === idempotencyKey) return true;
        return false;
      });

      if (existingLog) {
        console.log(`Event already processed: ${event.event} for ${idempotencyKey}`);
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    // Log webhook to WebhookLog before processing
    let webhookLog;
    try {
      webhookLog = await WebhookLog.create({
        provider: 'razorpay',
        eventType: event.event,
        payload: event.payload,
        status: 'pending'
      });
    } catch (logError) {
      console.error('Failed to log webhook:', logError);
      // Continue processing even if logging fails
    }

    console.log('Razorpay webhook event:', event.event);

    let processingError: Error | null = null;

    try {
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

      // Update webhook log status to processed
      if (webhookLog) {
        await WebhookLog.findByIdAndUpdate(webhookLog._id, {
          status: 'processed',
          processedAt: new Date()
        });
      }

      return NextResponse.json({ received: true });
    } catch (error: any) {
      processingError = error;
      
      // Update webhook log status to failed/error
      if (webhookLog) {
        await WebhookLog.findByIdAndUpdate(webhookLog._id, {
          status: 'error',
          errorMessage: error.message,
          processedAt: new Date()
        });
      }
      
      throw error;
    }
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

      // Get or create payment method
      let paymentMethodId;
      if (payment.customer_id) {
        let paymentMethod = await PaymentMethod.findOne({
          userId: userId,
          gatewayCustomerId: payment.customer_id
        });

        if (!paymentMethod) {
          // Create payment method from Razorpay payment details
          paymentMethod = await PaymentMethod.create({
            userId: userId,
            type: 'credit_card',
            provider: payment.method === 'card' ? (payment.card?.network || 'razorpay') : 'razorpay',
            last4: payment.card?.last4 || '****',
            brand: payment.card?.network || 'razorpay',
            isDefault: true,
            isActive: true,
            gatewayCustomerId: payment.customer_id,
            gatewayPaymentMethodId: payment.id
          });
        }

        if (paymentMethod) {
          paymentMethodId = paymentMethod._id;
        }
      }

      // Calculate amounts (Razorpay doesn't always provide subtotal/tax breakdown)
      const amountTotal = amount;
      const amountSubtotal = amountTotal; // Default to total if no breakdown
      const amountTax = 0; // Tax not available in Razorpay payment

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      const invoice = await Invoice.create({
        userId: userId,
        subtotal: amountSubtotal,
        taxAmount: amountTax,
        amount: amountTotal,
        currency: currency,
        status: 'paid',
        planName: plan?.name || 'Day Pass',
        planId: planId || null,
        billingCycle: 'one-time',
        paymentMethodId: paymentMethodId,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: payment.card?.last4 || '****',
        paidAt: new Date(),
        invoiceDate: new Date(),
        dueDate: new Date(),
        description: `Day Pass - ${plan?.name || 'Day Pass'}`,
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id,
          couponCode: couponCode || null
        }
      });

      // Create invoice items
      await InvoiceItem.create({
        invoiceId: invoice._id,
        description: `Day Pass - ${plan?.name || 'Day Pass'}`,
        quantity: 1,
        unitPrice: amountSubtotal,
        amount: amountSubtotal,
        type: 'subscription'
      });

      // Create transaction record
      await createTransaction({
        invoiceId: invoice._id.toString(),
        paymentMethodId: paymentMethodId?.toString(),
        amount: amountTotal,
        status: 'success',
        gatewayReferenceId: payment.id,
        gateway: 'razorpay',
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id
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

      // Get or create payment method
      let paymentMethodId;
      if (payment.customer_id) {
        let paymentMethod = await PaymentMethod.findOne({
          userId: userId,
          gatewayCustomerId: payment.customer_id
        });

        if (!paymentMethod) {
          paymentMethod = await PaymentMethod.create({
            userId: userId,
            type: 'credit_card',
            provider: payment.method === 'card' ? (payment.card?.network || 'razorpay') : 'razorpay',
            last4: payment.card?.last4 || '****',
            brand: payment.card?.network || 'razorpay',
            isDefault: true,
            isActive: true,
            gatewayCustomerId: payment.customer_id,
            gatewayPaymentMethodId: payment.id
          });
        }

        if (paymentMethod) {
          paymentMethodId = paymentMethod._id;
        }
      }

      // Calculate amounts
      const amountTotal = amount;
      const amountSubtotal = amountTotal;
      const amountTax = 0;

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      const invoice = await Invoice.create({
        userId: userId,
        subtotal: amountSubtotal,
        taxAmount: amountTax,
        amount: amountTotal,
        currency: currency,
        status: 'paid',
        planName: plan?.name || planKey,
        planId: planId || null,
        billingCycle: interval,
        paymentMethodId: paymentMethodId,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: payment.card?.last4 || '****',
        paidAt: new Date(),
        invoiceDate: new Date(),
        dueDate: new Date(),
        description: `${plan?.name || planKey} - ${interval} subscription`,
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id,
          couponCode: couponCode || null
        }
      });

      // Create invoice items
      await InvoiceItem.create({
        invoiceId: invoice._id,
        description: `${plan?.name || planKey} - ${interval} subscription`,
        quantity: 1,
        unitPrice: amountSubtotal,
        amount: amountSubtotal,
        type: 'subscription'
      });

      // Create transaction record
      await createTransaction({
        invoiceId: invoice._id.toString(),
        paymentMethodId: paymentMethodId?.toString(),
        amount: amountTotal,
        status: 'success',
        gatewayReferenceId: payment.id,
        gateway: 'razorpay',
        metadata: {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          razorpayCustomerId: payment.customer_id
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
    if (!razorpay) {
      console.error('Razorpay not configured');
      return;
    }
    
    const invoices = await razorpay.invoices.all({
      subscription_id: subscription.id,
      count: 1
    });
    
    const currency = invoices.items?.[0]?.currency || 'INR';
    const invoiceAmount = invoices.items?.[0]?.amount;
    const amount = invoiceAmount && typeof invoiceAmount === 'number' ? invoiceAmount / 100 : 0;

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
      console.error('Razorpay not configured');
      return;
    }
    const invoices = await razorpay.invoices.all({
      subscription_id: subscription.id,
      count: 1
    });
    
    if (!invoices || !invoices.items || invoices.items.length === 0) {
      console.error('No invoices found for subscription:', subscription.id);
      return;
    }

    if (invoices.items.length > 0) {
      const invoice = invoices.items[0];
      
      // Calculate amounts
      const amountTotal = Number(invoice.amount || 0) / 100;
      const amountSubtotal = amountTotal;
      const amountTax = 0;

      // Get payment method
      let paymentMethodId;
      if (subscription.customer_id) {
        const paymentMethod = await PaymentMethod.findOne({
          userId: userId,
          gatewayCustomerId: subscription.customer_id
        });
        if (paymentMethod) {
          paymentMethodId = paymentMethod._id;
        }
      }

      // Create invoice record for recurring payment
      const invoiceRecord = await Invoice.create({
        userId: userId,
        subtotal: amountSubtotal,
        taxAmount: amountTax,
        amount: amountTotal,
        currency: invoice.currency,
        status: 'paid',
        planName: subscription.notes.planName || 'Pro Plan',
        planId: planId,
        billingCycle: subscription.notes.interval || 'monthly',
        paymentMethodId: paymentMethodId,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        invoiceDate: new Date(),
        dueDate: new Date(),
        description: `Recurring payment - ${subscription.notes.planName || 'Pro Plan'}`,
        metadata: {
          razorpayInvoiceId: invoice.id,
          razorpaySubscriptionId: subscription.id
        }
      });

      // Create invoice items
      await InvoiceItem.create({
        invoiceId: invoiceRecord._id,
        description: `Recurring payment - ${subscription.notes.planName || 'Pro Plan'}`,
        quantity: 1,
        unitPrice: amountSubtotal,
        amount: amountSubtotal,
        type: 'subscription'
      });

      // Create transaction record
      await createTransaction({
        invoiceId: invoiceRecord._id.toString(),
        paymentMethodId: paymentMethodId?.toString(),
        amount: amountTotal,
        status: 'success',
        gatewayReferenceId: invoice.id,
        gateway: 'razorpay',
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

      // Get or create payment method
      let paymentMethodId;
      if (order.customer_id) {
        let paymentMethod = await PaymentMethod.findOne({
          userId: userId,
          gatewayCustomerId: order.customer_id
        });

        if (!paymentMethod) {
          paymentMethod = await PaymentMethod.create({
            userId: userId,
            type: 'credit_card',
            provider: 'razorpay',
            last4: '****',
            brand: 'razorpay',
            isDefault: true,
            isActive: true,
            gatewayCustomerId: order.customer_id
          });
        }

        if (paymentMethod) {
          paymentMethodId = paymentMethod._id;
        }
      }

      // Calculate amounts
      const amountTotal = amount;
      const amountSubtotal = amountTotal;
      const amountTax = 0;

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      const invoice = await Invoice.create({
        userId: userId,
        subtotal: amountSubtotal,
        taxAmount: amountTax,
        amount: amountTotal,
        currency: currency,
        status: 'paid',
        planName: plan?.name || 'Day Pass',
        planId: planId || null,
        billingCycle: 'one-time',
        paymentMethodId: paymentMethodId,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        invoiceDate: new Date(),
        dueDate: new Date(),
        description: `Day Pass - ${plan?.name || 'Day Pass'}`,
        metadata: {
          razorpayOrderId: order.id,
          razorpayCustomerId: order.customer_id,
          couponCode: couponCode || null
        }
      });

      // Create invoice items
      await InvoiceItem.create({
        invoiceId: invoice._id,
        description: `Day Pass - ${plan?.name || 'Day Pass'}`,
        quantity: 1,
        unitPrice: amountSubtotal,
        amount: amountSubtotal,
        type: 'subscription'
      });

      // Create transaction record
      await createTransaction({
        invoiceId: invoice._id.toString(),
        paymentMethodId: paymentMethodId?.toString(),
        amount: amountTotal,
        status: 'success',
        gatewayReferenceId: order.id,
        gateway: 'razorpay',
        metadata: {
          razorpayOrderId: order.id,
          razorpayCustomerId: order.customer_id
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

      // Get or create payment method
      let paymentMethodId;
      if (order.customer_id) {
        let paymentMethod = await PaymentMethod.findOne({
          userId: userId,
          gatewayCustomerId: order.customer_id
        });

        if (!paymentMethod) {
          paymentMethod = await PaymentMethod.create({
            userId: userId,
            type: 'credit_card',
            provider: 'razorpay',
            last4: '****',
            brand: 'razorpay',
            isDefault: true,
            isActive: true,
            gatewayCustomerId: order.customer_id
          });
        }

        if (paymentMethod) {
          paymentMethodId = paymentMethod._id;
        }
      }

      // Calculate amounts
      const amountTotal = amount;
      const amountSubtotal = amountTotal;
      const amountTax = 0;

      // Create invoice record
      const PricingPlan = await getAdminPricingPlan();
      const plan = planId ? await PricingPlan.findById(planId) : null;
      
      const invoice = await Invoice.create({
        userId: userId,
        subtotal: amountSubtotal,
        taxAmount: amountTax,
        amount: amountTotal,
        currency: currency,
        status: 'paid',
        planName: plan?.name || planKey,
        planId: planId || null,
        billingCycle: interval,
        paymentMethodId: paymentMethodId,
        paymentMethodType: 'razorpay',
        paymentMethodLast4: '****',
        paidAt: new Date(),
        invoiceDate: new Date(),
        dueDate: new Date(),
        description: `${plan?.name || planKey} - ${interval} subscription`,
        metadata: {
          razorpayOrderId: order.id,
          razorpayCustomerId: order.customer_id,
          couponCode: couponCode || null
        }
      });

      // Create invoice items
      await InvoiceItem.create({
        invoiceId: invoice._id,
        description: `${plan?.name || planKey} - ${interval} subscription`,
        quantity: 1,
        unitPrice: amountSubtotal,
        amount: amountSubtotal,
        type: 'subscription'
      });

      // Create transaction record
      await createTransaction({
        invoiceId: invoice._id.toString(),
        paymentMethodId: paymentMethodId?.toString(),
        amount: amountTotal,
        status: 'success',
        gatewayReferenceId: order.id,
        gateway: 'razorpay',
        metadata: {
          razorpayOrderId: order.id,
          razorpayCustomerId: order.customer_id
        }
      });

      console.log(`✅ Pro plan activated for user ${user.email}: ${planKey}`);
    }
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}
