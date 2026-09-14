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
      // Look up the Stripe price ID from PricingPlan
      const PricingPlan = (await import('@/models/PricingPlan')).default;
      const plan = await PricingPlan.findOne({ key: params.planKey }).lean() as any;
      if (!plan) {
        return { success: false, error: `Plan ${params.planKey} not found` };
      }

      // Get the Stripe price ID for this billing cycle
      const priceField = `stripePriceId_${params.billingCycle}`;
      const stripePriceId = plan[priceField] || plan.stripePriceId_monthly;

      if (!stripePriceId) {
        return { success: false, error: `No Stripe price configured for ${params.planKey} (${params.billingCycle})` };
      }

      // Find or create Stripe customer
      let customerId: string;
      const existingCustomer = await stripe.customers.list({ email: params.userEmail, limit: 1 });
      if (existingCustomer.data.length > 0) {
        customerId = existingCustomer.data[0].id;
        // Update metadata if needed
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

      // Create checkout session
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: params.billingCycle === 'one-time' ? 'payment' : 'subscription',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          userId: params.userId,
          planKey: params.planKey,
          billingCycle: params.billingCycle,
          ...params.metadata,
        },
      };

      // Apply coupon if provided
      if (params.couponCode) {
        // Try to find a Stripe coupon first
        try {
          const coupons = await stripe.coupons.list({ limit: 100 });
          const foundCoupon = coupons.data.find(
            (c) => c.name?.toLowerCase() === params.couponCode!.toLowerCase() || c.id === params.couponCode
          );
          if (foundCoupon) {
            sessionParams.discounts = [{ coupon: foundCoupon.id }];
          }
        } catch {
          // Coupon not found on Stripe — continue without discount
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
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data);

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data);

        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data);

        case 'invoice.paid':
          return await this.handleInvoicePaid(event.data);

        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data);

        default:
          return { handled: false };
      }
    } catch (error: any) {
      console.error(`[Stripe] Webhook handling error for ${event.type}:`, error.message);
      return { handled: false, error: error.message };
    }
  }

  private async handleCheckoutCompleted(session: any): Promise<WebhookResult> {
    const { getConnection } = await import('@/lib/database');
    await getConnection();

    const userId = session.metadata?.userId;
    const planKey = session.metadata?.planKey;
    if (!userId || !planKey) return { handled: false, error: 'Missing metadata' };

    // Activate subscription
    const subscriptionService = (await import('@/lib/services/subscriptionService')).default;
    const result = await subscriptionService.activateProPlan(
      userId,
      planKey as any,
      session.metadata?.billingCycle || 'monthly',
      `stripe_${session.id}`,
      session.metadata?.region || 'US',
      session.currency?.toUpperCase() || 'USD',
      (session.amount_total || 0) / 100
    );

    if (result.success) {
      // Store Stripe customer ID on user
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(userId, {
        'subscription.provider': 'stripe',
        'subscription.paymentProviderId': session.subscription || session.id,
      });

      // Create invoice
      const Invoice = (await import('@/models/Invoice')).default;
      await Invoice.create({
        userId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'USD',
        status: 'paid',
        paymentMethod: 'stripe',
        description: `Subscription: ${planKey}`,
        metadata: {
          stripeSessionId: session.id,
          stripeCustomerId: session.customer,
          planKey,
        },
      });
    }

    return {
      handled: true,
      action: 'subscription_activated',
      subscriptionId: session.subscription,
      planKey,
    };
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<WebhookResult> {
    const User = (await import('@/models/User')).default;
    await User.findOneAndUpdate(
      { 'subscription.paymentProviderId': subscription.id },
      {
        'subscription.status': subscription.status === 'active' ? 'active' :
          subscription.status === 'canceled' ? 'cancelled' : subscription.status,
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
        'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
      }
    );

    return {
      handled: true,
      action: subscription.status === 'active' ? 'subscription_renewed' : 'subscription_cancelled',
      subscriptionId: subscription.id,
    };
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<WebhookResult> {
    const User = (await import('@/models/User')).default;
    await User.findOneAndUpdate(
      { 'subscription.paymentProviderId': subscription.id },
      {
        'subscription.status': 'cancelled',
        'subscription.cancelledAt': new Date(),
        currentPlanKey: 'free',
      }
    );

    return {
      handled: true,
      action: 'subscription_cancelled',
      subscriptionId: subscription.id,
    };
  }

  private async handleInvoicePaid(invoice: any): Promise<WebhookResult> {
    // Record successful payment
    return {
      handled: true,
      action: 'payment_succeeded',
      subscriptionId: invoice.subscription,
    };
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<WebhookResult> {
    const User = (await import('@/models/User')).default;
    if (invoice.subscription) {
      await User.findOneAndUpdate(
        { 'subscription.paymentProviderId': invoice.subscription },
        { 'subscription.status': 'past_due' }
      );
    }

    return {
      handled: true,
      action: 'payment_failed',
      subscriptionId: invoice.subscription,
    };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<CreatePortalResult> {
    const stripe = getStripeInstance();
    if (!stripe) return { success: false, error: 'Stripe not configured' };

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
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
        billingCycle: sub.metadata?.billingCycle || 'monthly',
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
}
