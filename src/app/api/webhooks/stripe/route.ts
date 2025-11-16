import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/payment/stripe';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import Invoice from '@/models/Invoice';
import Transaction from '@/models/Transaction';
import InvoiceItem from '@/models/InvoiceItem';
import PaymentMethod from '@/models/PaymentMethod';
import WebhookLog from '@/models/WebhookLog';
import { createTransaction } from '@/lib/services/transactionService';
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

    // IDEMPOTENCY CHECK: Check if this event was already processed
    // Stripe provides unique event IDs that we can use for idempotency
    const eventId = event.id;
    
    const existingLog = await WebhookLog.findOne({
      provider: 'stripe',
      eventType: event.type,
      'payload.id': eventId,
      status: 'processed'
    });

    if (existingLog) {
      console.log(`Event already processed: ${event.type} (${eventId})`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Log webhook to WebhookLog before processing
    let webhookLog;
    try {
      webhookLog = await WebhookLog.create({
        provider: 'stripe',
        eventType: event.type,
        payload: event.data.object,
        status: 'pending'
      });
    } catch (logError) {
      console.error('Failed to log webhook:', logError);
      // Continue processing even if logging fails
    }

    console.log('Stripe webhook event:', event.type);

    let processingError: Error | null = null;

    try {
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

        case 'charge.dispute.created':
        case 'charge.dispute.updated':
          await handleChargebackDispute(event.data.object, event.type);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
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

    // Calculate subtotal and tax (if available from Stripe)
    const amountTotal = session.amount_total / 100;
    const amountSubtotal = session.amount_subtotal ? session.amount_subtotal / 100 : amountTotal;
    const amountTax = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0;

    // Get or create payment method
    let paymentMethodId;
    if (session.customer) {
      // Try to find existing payment method with gateway customer ID
      let paymentMethod = await PaymentMethod.findOne({
        userId: userId,
        gatewayCustomerId: session.customer
      });

      if (!paymentMethod && session.payment_intent) {
        // Try to get payment method from Stripe
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (paymentIntent.payment_method) {
            const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
            
            paymentMethod = await PaymentMethod.create({
              userId: userId,
              type: 'credit_card',
              provider: pm.type === 'card' ? (pm.card?.brand || 'stripe') : 'stripe',
              last4: pm.card?.last4 || '****',
              brand: pm.card?.brand || 'stripe',
              expiryMonth: pm.card?.exp_month,
              expiryYear: pm.card?.exp_year,
              isDefault: true,
              isActive: true,
              gatewayCustomerId: session.customer,
              gatewayPaymentMethodId: pm.id
            });
          }
        } catch (pmError) {
          console.error('Error creating payment method:', pmError);
        }
      }

      if (paymentMethod) {
        paymentMethodId = paymentMethod._id;
      }
    }

    // Create invoice record with subtotal and tax
    const finalInterval = interval || (planKey === 'pro_monthly' ? 'monthly' : 
                                       planKey === 'pro_quarterly' ? 'quarterly' : 
                                       planKey === 'pro_yearly' ? 'yearly' : 
                                       planKey === 'day_pass' ? 'one-time' : 'monthly');
    
    const invoice = await Invoice.create({
      userId: userId,
      subtotal: amountSubtotal,
      taxAmount: amountTax,
      amount: amountTotal,
      currency: session.currency,
      status: 'paid',
      planName: plan?.name || planKey,
      planId: planId || null,
      billingCycle: finalInterval,
      paymentMethodId: paymentMethodId,
      paymentMethodType: 'stripe',
      paymentMethodLast4: session.payment_intent ? '****' : 'N/A',
      paidAt: new Date(),
      invoiceDate: new Date(),
      dueDate: new Date(),
      description: `${plan?.name || planKey} - ${interval || 'monthly'} subscription`,
      metadata: {
        stripeSessionId: session.id,
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer
      }
    });

    // Create invoice items
    await InvoiceItem.create({
      invoiceId: invoice._id,
      description: `${plan?.name || planKey} - ${interval || 'monthly'} subscription`,
      quantity: 1,
      unitPrice: amountSubtotal,
      amount: amountSubtotal,
      type: 'subscription'
    });

    if (amountTax > 0) {
      await InvoiceItem.create({
        invoiceId: invoice._id,
        description: 'Tax',
        quantity: 1,
        unitPrice: amountTax,
        amount: amountTax,
        type: 'tax'
      });
    }

    // Create transaction record
    await createTransaction({
      invoiceId: invoice._id.toString(),
      paymentMethodId: paymentMethodId?.toString(),
      amount: amountTotal,
      status: 'success',
      gatewayReferenceId: session.payment_intent || session.subscription || session.id,
      gateway: 'stripe',
      metadata: {
        stripeSessionId: session.id,
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer
      }
    });

    // Log payment activity
    try {
      const { ActivityLogService } = await import('@/lib/services/activityLogService');
      await ActivityLogService.logPayment({
        userId: userId,
        userEmail: user.email,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        provider: 'stripe',
        transactionId: session.payment_intent || session.subscription || session.id,
        planKey: planKey,
        status: 'success'
      });
    } catch (logError) {
      console.error('Failed to log payment:', logError);
    }

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

    // Check if this is a renewal (not first payment)
    const user = await User.findById(userId);
    const isRenewal = user?.subscription?.status === 'active' && 
                      user?.subscription?.currentPeriodEnd && 
                      new Date(user.subscription.currentPeriodEnd) < new Date();

    // Update subscription period
    const sub = subscription as any;
    await User.findByIdAndUpdate(userId, {
      'subscription.currentPeriodStart': new Date(sub.current_period_start * 1000),
      'subscription.currentPeriodEnd': new Date(sub.current_period_end * 1000)
    });

    // Reset credits on renewal
    if (isRenewal && planKey === 'pro_monthly') {
      const subscriptionService = (await import('@/lib/services/subscriptionService')).default;
      await subscriptionService.handleSubscriptionRenewal(userId);
    }

    // Calculate subtotal and tax from Stripe invoice
    const amountTotal = invoice.amount_paid / 100;
    const amountSubtotal = invoice.subtotal ? invoice.subtotal / 100 : amountTotal;
    const amountTax = invoice.tax ? invoice.tax / 100 : 0;

    // Get payment method
    let paymentMethodId;
    if (invoice.customer) {
      const paymentMethod = await PaymentMethod.findOne({
        userId: userId,
        gatewayCustomerId: invoice.customer
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
      planName: subscription.metadata.planName || 'Pro Plan',
      planId: planId,
      billingCycle: subscription.metadata.interval || 'monthly',
      paymentMethodId: paymentMethodId,
      paymentMethodType: 'stripe',
      paymentMethodLast4: '****',
      paidAt: new Date(),
      invoiceDate: new Date(),
      dueDate: new Date(invoice.due_date * 1000),
      description: `Recurring payment - ${subscription.metadata.planName || 'Pro Plan'}`,
      metadata: {
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscription.id
      }
    });

    // Create invoice items
    await InvoiceItem.create({
      invoiceId: invoiceRecord._id,
      description: `Recurring payment - ${subscription.metadata.planName || 'Pro Plan'}`,
      quantity: 1,
      unitPrice: amountSubtotal,
      amount: amountSubtotal,
      type: 'subscription'
    });

    if (amountTax > 0) {
      await InvoiceItem.create({
        invoiceId: invoiceRecord._id,
        description: 'Tax',
        quantity: 1,
        unitPrice: amountTax,
        amount: amountTax,
        type: 'tax'
      });
    }

    // Create transaction record
    await createTransaction({
      invoiceId: invoiceRecord._id.toString(),
      paymentMethodId: paymentMethodId?.toString(),
      amount: amountTotal,
      status: 'success',
      gatewayReferenceId: invoice.payment_intent || invoice.id,
      gateway: 'stripe',
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

    // Get plan for invoice creation
    const PricingPlan = await getAdminPricingPlan();
    const plan = planId ? await PricingPlan.findById(planId) : null;

    // Calculate amounts (Stripe doesn't always provide subtotal/tax breakdown in payment intent)
    const amountTotal = paymentIntent.amount / 100;
    const amountSubtotal = amountTotal; // Default to total if no breakdown
    const amountTax = 0; // Tax not available in payment intent

    // Get or create payment method
    let paymentMethodId;
    if (paymentIntent.customer) {
      let paymentMethod = await PaymentMethod.findOne({
        userId: userId,
        gatewayCustomerId: paymentIntent.customer
      });

      if (!paymentMethod && paymentIntent.payment_method) {
        try {
          const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
          
          paymentMethod = await PaymentMethod.create({
            userId: userId,
            type: 'credit_card',
            provider: pm.type === 'card' ? (pm.card?.brand || 'stripe') : 'stripe',
            last4: pm.card?.last4 || '****',
            brand: pm.card?.brand || 'stripe',
            expiryMonth: pm.card?.exp_month,
            expiryYear: pm.card?.exp_year,
            isDefault: true,
            isActive: true,
            gatewayCustomerId: paymentIntent.customer,
            gatewayPaymentMethodId: pm.id
          });
        } catch (pmError) {
          console.error('Error creating payment method:', pmError);
        }
      }

      if (paymentMethod) {
        paymentMethodId = paymentMethod._id;
      }
    }

    // Create invoice record
    const invoice = await Invoice.create({
      userId: userId,
      subtotal: amountSubtotal,
      taxAmount: amountTax,
      amount: amountTotal,
      currency: paymentIntent.currency,
      status: 'paid',
      planName: plan?.name || planKey,
      planId: planId || null,
      billingCycle: 'one-time',
      paymentMethodId: paymentMethodId,
      paymentMethodType: 'stripe',
      paymentMethodLast4: '****',
      paidAt: new Date(),
      invoiceDate: new Date(),
      dueDate: new Date(),
      description: `Day Pass - ${plan?.name || planKey}`,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer
      }
    });

    // Create invoice items
    await InvoiceItem.create({
      invoiceId: invoice._id,
      description: `Day Pass - ${plan?.name || planKey}`,
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
      gatewayReferenceId: paymentIntent.id,
      gateway: 'stripe',
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
    const { userId, planKey } = paymentIntent.metadata;

    if (userId) {
      // Update user subscription status to failed
      await User.findByIdAndUpdate(userId, {
        'subscription.status': 'inactive'
      });

      // Create failed transaction record
      await createTransaction({
        amount: paymentIntent.amount / 100,
        status: 'failed',
        gatewayReferenceId: paymentIntent.id,
        gateway: 'stripe',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
          userId,
          planKey
        }
      });

      console.log(`❌ Payment failed for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

async function handleChargebackDispute(dispute: any, eventType: string) {
  try {
    const chargeId = dispute.charge;
    
    // Find transaction by gateway reference
    const transaction = await Transaction.findOne({
      gatewayReferenceId: chargeId,
      gateway: 'stripe'
    });

    if (transaction) {
      // Update transaction status
      const newStatus = eventType.includes('created') ? 'dispute' : 'chargeback';
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          disputeId: dispute.id,
          disputeReason: dispute.reason,
          disputeStatus: dispute.status
        }
      });

      // Update related invoice if exists
      if (transaction.invoiceId) {
        const invoice = await Invoice.findById(transaction.invoiceId);
        if (invoice) {
          // Invoice status might need to be updated based on dispute resolution
          // For now, we just log it
          console.log(`Dispute/chargeback for invoice ${invoice.invoiceNumber}`);
        }
      }

      console.log(`✅ ${newStatus} recorded for transaction ${transaction._id}`);
    } else {
      console.warn(`Transaction not found for charge ${chargeId}`);
    }
  } catch (error) {
    console.error('Error handling chargeback/dispute:', error);
  }
}
