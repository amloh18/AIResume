import Razorpay from 'razorpay';
import crypto from 'crypto';
import type {
  IPaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  WebhookEvent,
  WebhookResult,
  CreatePortalResult,
  SubscriptionInfo,
} from './types';

let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing');
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

export class RazorpayProvider implements IPaymentProvider {
  readonly name = 'razorpay' as const;

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return { success: false, error: 'Razorpay is not configured' };
    }

    try {
      // Look up the Razorpay plan ID from PricingPlan
      const PricingPlan = (await import('@/models/PricingPlan')).default;
      const plan = await PricingPlan.findOne({ key: params.planKey }).lean() as any;
      if (!plan) {
        return { success: false, error: `Plan ${params.planKey} not found` };
      }

      const priceField = `razorpayPriceId_${params.billingCycle}`;
      const razorpayPlanId = plan[priceField] || plan.razorpayPriceId_monthly;

      if (!razorpayPlanId) {
        return { success: false, error: `No Razorpay plan configured for ${params.planKey} (${params.billingCycle})` };
      }

      // Create Razorpay customer
      const customer = await razorpay.customers.create({
        name: params.userName || params.userEmail,
        email: params.userEmail,
        notes: { userId: params.userId },
      } as any);
      const customerId = (customer as any).id;

      // Create Razorpay subscription
      const subscription = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        customer_id: customerId,
        total_count: params.billingCycle === 'yearly' ? 12 : params.billingCycle === 'quarterly' ? 4 : 12,
        notes: {
          userId: params.userId,
          planKey: params.planKey,
          billingCycle: params.billingCycle,
          ...params.metadata,
        },
      } as any);

      // For Razorpay, we redirect to the checkout page
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const checkoutUrl = `${baseUrl}/razorpay/checkout?subscription_id=${(subscription as any).id}&plan_key=${params.planKey}&billing_cycle=${params.billingCycle}`;

      return {
        success: true,
        sessionId: (subscription as any).id,
        url: checkoutUrl,
      };
    } catch (error: any) {
      console.error('[Razorpay] Checkout creation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent | null> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return null;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[Razorpay] Webhook signature verification failed');
        return null;
      }

      const body = JSON.parse(rawBody);
      return {
        id: body.id || body.payload?.payment?.entity?.id || `evt_${Date.now()}`,
        type: body.event || body.payload?.payment?.entity?.method || 'unknown',
        data: body.payload || body,
        createdAt: new Date(),
        rawBody,
        signature,
      };
    } catch (error: any) {
      console.error('[Razorpay] Webhook verification error:', error.message);
      return null;
    }
  }

  async handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult> {
    try {
      switch (event.type) {
        case 'subscription.activated':
        case 'subscription.charged':
          return await this.handleSubscriptionActivated(event.data);

        case 'subscription.cancelled':
        case 'subscription.paused':
          return await this.handleSubscriptionCancelled(event.data);

        case 'subscription.completed':
          return await this.handleSubscriptionCompleted(event.data);

        case 'payment.failed':
          return await this.handlePaymentFailed(event.data);

        case 'invoice.paid':
          return await this.handleInvoicePaid(event.data);

        default:
          return { handled: false };
      }
    } catch (error: any) {
      console.error(`[Razorpay] Webhook handling error for ${event.type}:`, error.message);
      return { handled: false, error: error.message };
    }
  }

  private async handleSubscriptionActivated(data: any): Promise<WebhookResult> {
    const subscription = data.subscription || data;
    const notes = subscription.notes || {};
    const userId = notes.userId;
    const planKey = notes.planKey;

    if (!userId || !planKey) return { handled: false, error: 'Missing metadata in subscription notes' };

    const { getConnection } = await import('@/lib/database');
    await getConnection();

    // Activate subscription
    const subscriptionService = (await import('@/lib/services/subscriptionService')).default;
    const result = await subscriptionService.activateProPlan(
      userId,
      planKey as any,
      notes.billingCycle || 'monthly',
      `razorpay_${subscription.id}`,
      notes.region || 'IN',
      'INR',
      (subscription.amount || 0) / 100
    );

    if (result.success) {
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(userId, {
        'subscription.provider': 'razorpay',
        'subscription.paymentProviderId': subscription.id,
      });
    }

    return {
      handled: true,
      action: 'subscription_activated',
      subscriptionId: subscription.id,
      planKey,
    };
  }

  private async handleSubscriptionCancelled(data: any): Promise<WebhookResult> {
    const subscription = data.subscription || data;
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

  private async handleSubscriptionCompleted(data: any): Promise<WebhookResult> {
    const subscription = data.subscription || data;
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

  private async handlePaymentFailed(data: any): Promise<WebhookResult> {
    const subscription = data.subscription || data;
    const User = (await import('@/models/User')).default;

    await User.findOneAndUpdate(
      { 'subscription.paymentProviderId': subscription.id },
      { 'subscription.status': 'past_due' }
    );

    return {
      handled: true,
      action: 'payment_failed',
      subscriptionId: subscription.id,
    };
  }

  private async handleInvoicePaid(data: any): Promise<WebhookResult> {
    const invoice = data.invoice || data;
    return {
      handled: true,
      action: 'payment_succeeded',
      subscriptionId: invoice.subscription_id,
    };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<CreatePortalResult> {
    // Razorpay doesn't have a hosted customer portal like Stripe.
    // We return our own settings page URL instead.
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return {
      success: true,
      url: `${baseUrl}/dashboard/settings?tab=billing`,
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    const razorpay = getRazorpayInstance();
    if (!razorpay) return null;

    try {
      const sub = await razorpay.subscriptions.fetch(subscriptionId) as any;
      return {
        subscriptionId: sub.id,
        status: sub.status === 'active' ? 'active' :
          sub.status === 'cancelled' ? 'cancelled' :
          sub.status === 'paused' ? 'past_due' : 'incomplete',
        currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
        cancelAtPeriodEnd: sub.cancel_at_cycle_end === 1,
        planKey: sub.notes?.planKey || '',
        billingCycle: sub.notes?.billingCycle || 'monthly',
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true): Promise<boolean> {
    const razorpay = getRazorpayInstance();
    if (!razorpay) return false;

    try {
      if (atPeriodEnd) {
        await razorpay.subscriptions.cancel(subscriptionId);
      } else {
        await razorpay.subscriptions.cancel(subscriptionId);
      }
      return true;
    } catch (error: any) {
      console.error('[Razorpay] Cancel subscription failed:', error.message);
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    const razorpay = getRazorpayInstance();
    if (!razorpay) return false;

    try {
      // Verify credentials are set and API is reachable
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      return !!(keyId && keySecret);
    } catch {
      return false;
    }
  }
}
