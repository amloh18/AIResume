import Stripe from 'stripe';
import type {
  IPaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  WebhookEvent,
  WebhookResult,
  CreatePortalResult,
  SubscriptionInfo,
} from './types';
import {
  resolveStripePrice,
  detectRegion,
  qualifiesForLaunchTrial,
  getLaunchTrialEndTimestamp,
  STRIPE_PRODUCT_ID,
  STRIPE_PORTAL_CONFIG_ID,
  PORTAL_RETURN_URL,
  type PlanKey,
  type BillingInterval,
  type Region,
} from '@/lib/billing/stripe-price-map';

let stripeInstance: Stripe | null = null;

function getStripeInstance(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('[Stripe] STRIPE_SECRET_KEY is missing');
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  return stripeInstance;
}

export class StripeProvider implements IPaymentProvider {
  readonly name = 'stripe' as const;

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const stripe = getStripeInstance();
    if (!stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      // Map our plan keys to the canonical plan/interval format
      const plan = this.mapPlanKey(params.planKey);
      if (!plan) {
        return { success: false, error: `Unknown plan: ${params.planKey}` };
      }

      // Detect region from metadata or default to ROW
      const region = (params.metadata?.region as Region) || detectRegion(params.metadata?.billingCountry);

      // Resolve the canonical Stripe Price server-side
      const priceEntry = resolveStripePrice(plan.plan, plan.interval, region);
      if (!priceEntry) {
        return { success: false, error: `No price found for ${plan.plan} ${plan.interval} ${region}` };
      }

      // Find or create Stripe customer
      let customerId: string;
      const existingCustomer = await stripe.customers.list({ email: params.userEmail, limit: 1 });
      if (existingCustomer.data.length > 0) {
        customerId = existingCustomer.data[0].id;
        await stripe.customers.update(customerId, {
          metadata: { userId: params.userId },
        });
      } else {
        const customer = await stripe.customers.create({
          email: params.userEmail,
          name: params.userName,
          metadata: { userId: params.userId },
        });
        customerId = customer.id;
      }

      // Build checkout session params
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceEntry.priceId, quantity: 1 }],
        success_url: params.successUrl || `${process.env.NEXTAUTH_URL || 'https://resume.morigrid.com'}/dashboard?tab=billing&success=true`,
        cancel_url: params.cancelUrl || `${process.env.NEXTAUTH_URL || 'https://resume.morigrid.com'}/dashboard?tab=billing&cancelled=true`,
        metadata: {
          userId: params.userId,
          planKey: plan.plan,
          billingInterval: plan.interval,
          region,
          applicationVersion: 'airesume-v1',
        },
      };

      // Apply launch trial for qualifying Starter monthly subscriptions
      if (qualifiesForLaunchTrial(plan.plan, plan.interval)) {
        sessionParams.subscription_data = {
          trial_end: getLaunchTrialEndTimestamp(),
          metadata: {
            userId: params.userId,
            planKey: plan.plan,
            billingInterval: plan.interval,
            region,
            launchTrial: 'true',
          },
        };
      }

      // Apply coupon if provided
      if (params.couponCode) {
        try {
          const coupons = await stripe.coupons.list({ limit: 100 });
          const foundCoupon = coupons.data.find(
            (c) => c.name?.toLowerCase() === params.couponCode!.toLowerCase() || c.id === params.couponCode
          );
          if (foundCoupon) {
            sessionParams.discounts = [{ coupon: foundCoupon.id }];
          }
        } catch {
          // Coupon not found — continue without discount
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        success: true,
        sessionId: session.id,
        url: session.url || undefined,
      };
    } catch (error: any) {
      console.error('[Stripe] Checkout creation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent | null> {
    const stripe = getStripeInstance();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) return null;

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        createdAt: new Date(event.created * 1000),
        rawBody,
        signature,
      };
    } catch (error: any) {
      console.error('[Stripe] Webhook verification failed:', error.message);
      return null;
    }
  }

  async handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult> {
    const stripe = getStripeInstance();
    if (!stripe) return { handled: false, error: 'Stripe not configured' };

    try {
      switch (event.type) {
        // ─── Checkout ───────────────────────────────────────────────────────
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data);
        case 'checkout.session.async_payment_succeeded':
          return await this.handleCheckoutAsyncPaymentSucceeded(event.data);
        case 'checkout.session.async_payment_failed':
          return await this.handleCheckoutAsyncPaymentFailed(event.data);
        case 'checkout.session.expired':
          return { handled: true, action: 'checkout_expired' };

        // ─── Subscriptions ──────────────────────────────────────────────────
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data);
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data);
        case 'customer.subscription.trial_will_end':
          return await this.handleTrialWillEnd(event.data);

        // ─── Invoices ───────────────────────────────────────────────────────
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaid(event.data);
        case 'invoice.payment_failed':
        case 'invoice.payment_action_required':
          return await this.handleInvoicePaymentFailed(event.data);
        case 'invoice.upcoming':
          return { handled: true, action: 'invoice_upcoming' };

        // ─── Payment Intents ────────────────────────────────────────────────
        case 'payment_intent.succeeded':
          return { handled: true, action: 'payment_intent_succeeded' };
        case 'payment_intent.processing':
          return { handled: true, action: 'payment_intent_processing' };
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data);
        case 'payment_intent.requires_action':
          return { handled: true, action: 'payment_intent_requires_action' };

        // ─── Refunds ────────────────────────────────────────────────────────
        case 'charge.refunded':
        case 'refund.updated':
          return await this.handleRefund(event.data);

        default:
          return { handled: false };
      }
    } catch (error: any) {
      console.error(`[Stripe] Webhook handling error for ${event.type}:`, error.message);
      return { handled: false, error: error.message };
    }
  }

  // ─── Checkout Handlers ────────────────────────────────────────────────────

  private async handleCheckoutCompleted(session: any): Promise<WebhookResult> {
    const { getConnection } = await import('@/lib/database');
    await getConnection();

    const userId = session.metadata?.userId;
    const planKey = session.metadata?.planKey;
    const billingInterval = session.metadata?.billingInterval || 'monthly';
    const region = session.metadata?.region || 'ROW';

    if (!userId || !planKey) {
      return { handled: false, error: 'Missing metadata (userId, planKey)' };
    }

    // Determine if this is a launch trial
    const isLaunchTrial = session.metadata?.launchTrial === 'true' || !!session.subscription_data?.trial_end;

    // Activate subscription
    const subscriptionService = (await import('@/lib/services/subscriptionService')).default;

    // Derive price from session (do NOT trust client)
    const amountTotal = (session.amount_total || 0) / 100;

    const result = await subscriptionService.activateProPlan(
      userId,
      planKey as any,
      billingInterval,
      `stripe_${session.id}`,
      region,
      session.currency?.toUpperCase() || 'USD',
      amountTotal,
      session.subscription || undefined,
      session.customer || undefined,
      'stripe'
    );

    if (result.success) {
      // Store Stripe customer ID on user
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(userId, {
        'subscription.provider': 'stripe',
        'subscription.providerSubscriptionId': session.subscription || undefined,
        'subscription.providerCustomerId': session.customer || undefined,
      });

      // If launch trial, set trial dates
      if (isLaunchTrial && session.subscription_data?.trial_end) {
        const trialEnd = new Date(session.subscription_data.trial_end * 1000);
        await User.findByIdAndUpdate(userId, {
          'subscription.trialStart': new Date(),
          'subscription.trialEnd': trialEnd,
        });
      }

      // Create invoice record
      const Invoice = (await import('@/models/Invoice')).default;
      await Invoice.create({
        userId,
        amount: amountTotal,
        currency: session.currency?.toUpperCase() || 'USD',
        status: isLaunchTrial ? 'pending' : 'paid',
        paymentMethod: 'stripe',
        description: `Subscription: ${planKey}${isLaunchTrial ? ' (Launch Trial)' : ''}`,
        metadata: {
          stripeSessionId: session.id,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          planKey,
          region,
          launchTrial: String(isLaunchTrial),
        },
      });
    }

    return {
      handled: true,
      action: isLaunchTrial ? 'subscription_activated_trial' : 'subscription_activated',
      subscriptionId: session.subscription,
      planKey,
    };
  }

  private async handleCheckoutAsyncPaymentSucceeded(session: any): Promise<WebhookResult> {
    // Async payment succeeded (e.g., bank transfer completed)
    const userId = session.metadata?.userId;
    if (userId) {
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(userId, {
        'subscription.status': 'active',
      });
    }
    return { handled: true, action: 'async_payment_succeeded' };
  }

  private async handleCheckoutAsyncPaymentFailed(session: any): Promise<WebhookResult> {
    const userId = session.metadata?.userId;
    if (userId) {
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(userId, {
        'subscription.status': 'incomplete',
      });
    }
    return { handled: true, action: 'async_payment_failed' };
  }

  // ─── Subscription Handlers ────────────────────────────────────────────────

  private async handleSubscriptionUpdated(subscription: any): Promise<WebhookResult> {
    const User = (await import('@/models/User')).default;

    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'active',
      past_due: 'past_due',
      unpaid: 'unpaid',
      canceled: 'cancelled',
      incomplete: 'incomplete',
      incomplete_expired: 'expired',
    };

    const mappedStatus = statusMap[subscription.status] || subscription.status;

    const updateData: Record<string, any> = {
      'subscription.status': mappedStatus,
      'subscription.currentPeriodStart': subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : undefined,
      'subscription.currentPeriodEnd': subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
      'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
    };

    // Handle trial data
    if (subscription.status === 'trialing') {
      updateData['subscription.trialStart'] = subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : undefined;
      updateData['subscription.trialEnd'] = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined;
    }

    // Handle cancellation
    if (subscription.canceled_at) {
      updateData['subscription.cancelledAt'] = new Date(subscription.canceled_at * 1000);
    }

    // Resolve plan from subscription metadata or items
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (priceId) {
      const { resolvePriceToPlan } = await import('@/lib/billing/stripe-price-map');
      const resolved = resolvePriceToPlan(priceId);
      if (resolved) {
        updateData.currentPlanKey = `${resolved.plan}_${resolved.interval}`;
        updateData['subscription.planKey'] = `${resolved.plan}_${resolved.interval}`;
      }
    }

    // Clean undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await User.findOneAndUpdate(
      { 'subscription.providerSubscriptionId': subscription.id },
      { $set: updateData }
    );

    return {
      handled: true,
      action: subscription.status === 'active' ? 'subscription_renewed' : `subscription_${subscription.status}`,
      subscriptionId: subscription.id,
    };
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<WebhookResult> {
    const User = (await import('@/models/User')).default;
    await User.findOneAndUpdate(
      { 'subscription.providerSubscriptionId': subscription.id },
      {
        $set: {
          'subscription.status': 'cancelled',
          'subscription.cancelledAt': new Date(),
          'subscription.cancelAtPeriodEnd': false,
          currentPlanKey: 'free',
          'subscription.planKey': 'free',
        },
      }
    );

    return {
      handled: true,
      action: 'subscription_cancelled',
      subscriptionId: subscription.id,
    };
  }

  private async handleTrialWillEnd(subscription: any): Promise<WebhookResult> {
    // Stripe sends this 3 days before trial ends
    // We could send a notification email here
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({
      'subscription.providerSubscriptionId': subscription.id,
    });

    if (user) {
      console.log(`[Stripe] Trial ending soon for user ${user._id}, subscription ${subscription.id}`);
    }

    return {
      handled: true,
      action: 'trial_will_end',
      subscriptionId: subscription.id,
    };
  }

  // ─── Invoice Handlers ─────────────────────────────────────────────────────

  private async handleInvoicePaid(invoice: any): Promise<WebhookResult> {
    if (invoice.subscription) {
      const User = (await import('@/models/User')).default;
      const stripeInstance = getStripeInstance();

      // Fetch the latest subscription state from Stripe to get updated billing period
      let periodUpdate: Record<string, any> = { 'subscription.status': 'active' };
      if (stripeInstance) {
        try {
          const subscription = await stripeInstance.subscriptions.retrieve(invoice.subscription);
          const subData = subscription as any;
          if (subData.current_period_start && subData.current_period_end) {
            periodUpdate['subscription.currentPeriodStart'] = new Date(subData.current_period_start * 1000);
            periodUpdate['subscription.currentPeriodEnd'] = new Date(subData.current_period_end * 1000);
          }
        } catch (err: any) {
          console.error('[Stripe] Failed to fetch subscription for period update:', err?.message);
        }
      }

      await User.findOneAndUpdate(
        { 'subscription.providerSubscriptionId': invoice.subscription },
        { $set: periodUpdate }
      );

      // Reset credits for the new billing period
      const user = await User.findOne({ 'subscription.providerSubscriptionId': invoice.subscription });
      if (user) {
        try {
          const creditResetService = (await import('@/lib/services/creditResetService')).default;
          await creditResetService.resetUserCredits(String(user._id));
        } catch (err: any) {
          console.error('[Stripe] Failed to reset credits on renewal:', err?.message);
        }
      }
    }

    return {
      handled: true,
      action: 'payment_succeeded',
      subscriptionId: invoice.subscription,
    };
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<WebhookResult> {
    if (invoice.subscription) {
      const User = (await import('@/models/User')).default;
      await User.findOneAndUpdate(
        { 'subscription.providerSubscriptionId': invoice.subscription },
        {
          $set: {
            'subscription.status': 'past_due',
          },
        }
      );
    }

    return {
      handled: true,
      action: 'payment_failed',
      subscriptionId: invoice.subscription,
    };
  }

  // ─── Payment Intent Handlers ──────────────────────────────────────────────

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<WebhookResult> {
    // Payment intent failed — may affect subscription
    console.log(`[Stripe] Payment intent failed: ${paymentIntent.id}`);
    return {
      handled: true,
      action: 'payment_intent_failed',
    };
  }

  // ─── Refund Handlers ──────────────────────────────────────────────────────

  private async handleRefund(data: any): Promise<WebhookResult> {
    console.log(`[Stripe] Refund processed: ${data.id}`);
    return {
      handled: true,
      action: 'refund_processed',
    };
  }

  // ─── Portal ───────────────────────────────────────────────────────────────

  async createPortalSession(customerId: string, returnUrl: string): Promise<CreatePortalResult> {
    const stripe = getStripeInstance();
    if (!stripe) return { success: false, error: 'Stripe not configured' };

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || PORTAL_RETURN_URL,
        configuration: STRIPE_PORTAL_CONFIG_ID,
      });

      return { success: true, url: session.url };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    const stripe = getStripeInstance();
    if (!stripe) return null;

    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = (sub as any).current_period_end || sub.items?.data?.[0]?.current_period_end || 0;
      return {
        subscriptionId: sub.id,
        status: sub.status as any,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
        cancelAtPeriodEnd: (sub as any).cancel_at_period_end || false,
        planKey: sub.metadata?.planKey || '',
        billingCycle: sub.metadata?.billingInterval || 'monthly',
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true): Promise<boolean> {
    const stripe = getStripeInstance();
    if (!stripe) return false;

    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: atPeriodEnd,
      });
      return true;
    } catch (error: any) {
      console.error('[Stripe] Cancel subscription failed:', error.message);
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    const stripe = getStripeInstance();
    if (!stripe) return false;

    try {
      await stripe.products.list({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapPlanKey(planKey: string): { plan: PlanKey; interval: BillingInterval } | null {
    const key = planKey.toLowerCase();
    if (key.includes('focused')) {
      if (key.includes('quarterly')) return { plan: 'focused', interval: 'monthly' }; // quarterly mapped to monthly price
      if (key.includes('yearly')) return { plan: 'focused', interval: 'yearly' };
      return { plan: 'focused', interval: 'monthly' };
    }
    if (key.includes('starter')) {
      if (key.includes('yearly')) return { plan: 'starter', interval: 'yearly' };
      return { plan: 'starter', interval: 'monthly' };
    }
    if (key === 'free') return null;
    return null;
  }
}
