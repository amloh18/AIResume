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
import {
  resolveStripePrice,
  detectRegion,
  type PlanKey,
  type BillingInterval,
  type Region,
} from '@/lib/billing/stripe-price-map';

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
  apiVersion: string;
  webhookSecret?: string;
}

export class CashfreeProvider implements IPaymentProvider {
  readonly name = 'cashfree' as const;

  private configOverride?: Partial<CashfreeConfig>;

  constructor(configOverride?: Partial<CashfreeConfig>) {
    this.configOverride = configOverride;
  }

  /**
   * Resolve Cashfree credentials and environment:
   * DB settings take precedence if configured, then fallback to environment variables.
   */
  async getConfig(): Promise<CashfreeConfig | null> {
    if (this.configOverride?.appId && this.configOverride?.secretKey) {
      return {
        appId: this.configOverride.appId,
        secretKey: this.configOverride.secretKey,
        environment: this.configOverride.environment || 'sandbox',
        apiVersion: this.configOverride.apiVersion || '2023-08-01',
        webhookSecret: this.configOverride.webhookSecret,
      };
    }

    let dbConfig: any = null;
    try {
      const { getConnection } = await import('@/lib/database');
      await getConnection();
      const PaymentProviderSettings = (await import('@/models/PaymentProviderSettings')).default;
      const settings = await PaymentProviderSettings.findOne().lean() as any;
      if (settings?.cashfree?.appId && settings?.cashfree?.secretKey) {
        dbConfig = settings.cashfree;
      }
    } catch {
      // Ignore DB fetch errors, fall back to process.env
    }

    const appId = dbConfig?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = dbConfig?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = (dbConfig?.environment || process.env.CASHFREE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
    const apiVersion = dbConfig?.apiVersion || process.env.CASHFREE_API_VERSION || '2023-08-01';
    const webhookSecret = dbConfig?.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET || secretKey;

    if (!appId || !secretKey) {
      return null;
    }

    return {
      appId,
      secretKey,
      environment,
      apiVersion,
      webhookSecret,
    };
  }

  getBaseUrl(environment: 'sandbox' | 'production'): string {
    return environment === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  /**
   * Helper: Map plan key and resolve amount + currency
   */
  private resolvePrice(
    planKey: string,
    billingCycle: string,
    region: Region
  ): { amount: number; currency: string; canonicalPlan: string; canonicalInterval: string } {
    let cleanPlan = planKey.replace(/_(monthly|quarterly|yearly)$/, '') as PlanKey;
    if (cleanPlan !== 'starter' && cleanPlan !== 'focused') {
      cleanPlan = 'focused';
    }

    const interval = (billingCycle === 'yearly' ? 'yearly' : 'monthly') as BillingInterval;
    const priceEntry = resolveStripePrice(cleanPlan, interval, region);

    if (priceEntry) {
      // Cashfree expects decimal amount (e.g. 199.00 or 4.99), not smallest unit
      const decimalAmount = priceEntry.amount / 100;
      return {
        amount: decimalAmount,
        currency: priceEntry.currency.toUpperCase(),
        canonicalPlan: cleanPlan,
        canonicalInterval: interval,
      };
    }

    // Default fallback (e.g., INR 499 for focused monthly)
    return {
      amount: region === 'IN' ? 499 : 9.99,
      currency: region === 'IN' ? 'INR' : 'USD',
      canonicalPlan: cleanPlan,
      canonicalInterval: interval,
    };
  }

  /**
   * Create Checkout Session / Cashfree Payment Order
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, error: 'Cashfree is not configured. Missing App ID or Secret Key.' };
    }

    try {
      const region = (params.metadata?.region as Region) || detectRegion(params.metadata?.billingCountry);
      const { amount, currency, canonicalPlan, canonicalInterval } = this.resolvePrice(
        params.planKey,
        params.billingCycle,
        region
      );

      // Cashfree Order ID: max 45 chars, alphanumeric, _ and -
      const cleanUserId = params.userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'user';
      const orderId = `cf_${cleanUserId}_${Date.now()}`;

      // Clean customer details
      const customerId = params.userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 45) || 'cust_anonymous';
      const rawPhone = (params.metadata?.phone || '').replace(/[^0-9]/g, '');
      const customerPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : '9999999999';

      const baseUrl = process.env.NEXTAUTH_URL || 'https://resume.morigrid.com';
      const successUrl = params.successUrl || `${baseUrl}/dashboard?tab=billing&success=true`;

      // Cashfree return URL with placeholder substitution
      const returnUrl = successUrl.includes('{order_id}')
        ? successUrl
        : `${baseUrl}/dashboard?tab=billing&order_id={order_id}&status={order_status}&provider=cashfree`;
      const notifyUrl = `${baseUrl}/api/webhooks/cashfree`;

      const orderPayload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id: customerId,
          customer_email: params.userEmail,
          customer_phone: customerPhone,
          customer_name: (params.userName || 'AIResume User').slice(0, 50),
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: notifyUrl,
        },
        order_note: `AIResume subscription: ${canonicalPlan} (${canonicalInterval})`,
        order_tags: {
          userId: params.userId,
          planKey: `${canonicalPlan}_${canonicalInterval}`,
          billingCycle: canonicalInterval,
          region,
          currency,
        },
      };

      const pgUrl = `${this.getBaseUrl(config.environment)}/orders`;
      const response = await fetch(pgUrl, {
        method: 'POST',
        headers: {
          'x-client-id': config.appId,
          'x-client-secret': config.secretKey,
          'x-api-version': config.apiVersion,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = responseData.message || responseData.error || `HTTP ${response.status}: Failed to create Cashfree order`;
        console.error('[Cashfree] Order creation error:', responseData);
        return { success: false, error: errorMsg };
      }

      const paymentSessionId = responseData.payment_session_id;
      if (!paymentSessionId) {
        return { success: false, error: 'Cashfree did not return a payment_session_id' };
      }

      // Construct client-side checkout URL
      const checkoutUrl = `${baseUrl}/cashfree/checkout?payment_session_id=${encodeURIComponent(
        paymentSessionId
      )}&order_id=${encodeURIComponent(orderId)}&plan_key=${encodeURIComponent(
        `${canonicalPlan}_${canonicalInterval}`
      )}&billing_cycle=${encodeURIComponent(canonicalInterval)}`;

      return {
        success: true,
        sessionId: paymentSessionId,
        url: checkoutUrl,
      };
    } catch (error: any) {
      console.error('[Cashfree] Exception in createCheckoutSession:', error);
      return { success: false, error: error.message || 'Payment initiation failed' };
    }
  }

  /**
   * Verify Cashfree webhook signature using raw body and timestamp header.
   */
  async verifyWebhookEvent(
    rawBody: string,
    signature: string,
    headers?: Record<string, any>
  ): Promise<WebhookEvent | null> {
    const config = await this.getConfig();
    if (!config) {
      console.error('[Cashfree Webhook] Not configured');
      return null;
    }

    const secretKey = config.webhookSecret || config.secretKey;
    const timestamp = headers?.['x-webhook-timestamp'] || headers?.['X-Webhook-Timestamp'] || '';

    if (!signature) {
      console.error('[Cashfree Webhook] Missing signature header');
      return null;
    }

    try {
      // Signature computation: HMAC-SHA256 of (timestamp + rawBody)
      const dataToSign = timestamp ? `${timestamp}${rawBody}` : rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(dataToSign)
        .digest('base64');

      const isValid =
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

      if (!isValid) {
        // As a fallback for different webhook versions, try rawBody alone if timestamped didn't match
        if (timestamp) {
          const fallbackSig = crypto
            .createHmac('sha256', secretKey)
            .update(rawBody)
            .digest('base64');
          if (
            signature.length === fallbackSig.length &&
            crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(fallbackSig))
          ) {
            // Valid under fallback
          } else {
            console.error('[Cashfree Webhook] Signature verification failed');
            return null;
          }
        } else {
          console.error('[Cashfree Webhook] Signature verification failed');
          return null;
        }
      }

      const payload = JSON.parse(rawBody);
      const eventId =
        payload?.data?.order?.order_id ||
        payload?.data?.payment?.cf_payment_id ||
        payload?.event_time ||
        `cf_evt_${Date.now()}`;

      return {
        id: String(eventId),
        type: payload.type || 'PAYMENT_SUCCESS_WEBHOOK',
        data: payload,
        createdAt: payload.event_time ? new Date(payload.event_time) : new Date(),
        rawBody,
        signature,
      };
    } catch (err: any) {
      console.error('[Cashfree Webhook] Verification parsing error:', err.message);
      return null;
    }
  }

  /**
   * Handle verified Cashfree webhook event
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult> {
    const { type, data } = event;

    try {
      switch (type) {
        case 'PAYMENT_SUCCESS_WEBHOOK':
        case 'ORDER_PAID':
        case 'PAYMENT_PAID':
          return await this.handlePaymentSuccess(data);

        case 'PAYMENT_FAILED_WEBHOOK':
        case 'ORDER_FAILED':
          return await this.handlePaymentFailed(data);

        case 'PAYMENT_USER_DROPPED_WEBHOOK':
          return { handled: true, action: 'user_dropped' };

        case 'SUBSCRIPTION_STATUS_CHANGE':
        case 'SUBSCRIPTION_ACTIVATED':
          return await this.handleSubscriptionStatusChange(data);

        default:
          console.log(`[Cashfree Webhook] Unhandled event type: ${type}`);
          return { handled: false, action: `unhandled_${type}` };
      }
    } catch (error: any) {
      console.error(`[Cashfree Webhook] Error processing ${type}:`, error.message);
      return { handled: false, error: error.message };
    }
  }

  private async handlePaymentSuccess(payload: any): Promise<WebhookResult> {
    const { getConnection } = await import('@/lib/database');
    await getConnection();

    const orderData = payload?.data?.order || payload?.order || {};
    const paymentData = payload?.data?.payment || payload?.payment || {};
    const customerData = payload?.data?.customer_details || payload?.customer_details || {};
    const orderTags = orderData.order_tags || {};

    const userId = orderTags.userId || customerData.customer_id;
    const planKey = orderTags.planKey || 'focused_monthly';
    const billingCycle = orderTags.billingCycle || 'monthly';
    const orderId = orderData.order_id;
    const paymentId = paymentData.cf_payment_id || orderId;
    const amount = Number(paymentData.payment_amount || orderData.order_amount || 0);
    const currency = (paymentData.payment_currency || orderData.order_currency || 'INR').toUpperCase();
    const region = orderTags.region || (currency === 'INR' ? 'IN' : 'ROW');

    if (!userId) {
      console.error('[Cashfree Webhook] Missing userId in order_tags / customer_details');
      return { handled: false, error: 'Missing userId' };
    }

    // 1. Activate subscription
    const subscriptionService = (await import('@/lib/services/subscriptionService')).default;
    const result = await subscriptionService.activateProPlan(
      userId,
      planKey as any,
      billingCycle as any,
      `cashfree_${paymentId}`,
      region,
      currency,
      amount,
      orderId,
      customerData.customer_id,
      'cashfree' as any
    );

    if (result.success) {
      // 2. Update user subscription record with Cashfree as provider
      const User = (await import('@/models/User')).default;
      await User.findByIdAndUpdate(userId, {
        'subscription.provider': 'cashfree',
        'subscription.providerSubscriptionId': orderId,
        'subscription.providerCustomerId': customerData.customer_id || undefined,
        'subscription.status': 'active',
        'subscription.purchaseCurrency': currency,
        'subscription.purchasePrice': amount,
      });

      // 3. Create invoice record
      const Invoice = (await import('@/models/Invoice')).default;
      const invoiceNumber = `INV-CF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await Invoice.create({
        userId,
        invoiceNumber,
        subtotal: amount,
        taxAmount: 0,
        amount,
        currency,
        status: 'paid',
        planName: planKey,
        planId: userId, // Fallback plan reference
        billingCycle,
        paymentMethodType: 'cashfree',
        paidAt: new Date(),
        invoiceDate: new Date(),
        dueDate: new Date(),
        description: `Cashfree Payment - Subscription: ${planKey}`,
        metadata: {
          cashfreeOrderId: orderId,
          cashfreePaymentId: paymentId,
          region,
        },
      });

      console.log(`[Cashfree Webhook] Successfully activated subscription for user ${userId} on plan ${planKey}`);
      return {
        handled: true,
        action: 'subscription_activated',
        subscriptionId: orderId,
        planKey,
      };
    } else {
      console.error(`[Cashfree Webhook] Activation failed: ${result.error}`);
      return { handled: false, error: result.error };
    }
  }

  private async handlePaymentFailed(payload: any): Promise<WebhookResult> {
    const orderData = payload?.data?.order || payload?.order || {};
    const paymentData = payload?.data?.payment || payload?.payment || {};
    console.warn(`[Cashfree Webhook] Payment failed for order ${orderData.order_id}: ${paymentData.payment_message || 'Payment failed'}`);
    return {
      handled: true,
      action: 'payment_failed',
      subscriptionId: orderData.order_id,
      error: paymentData.payment_message || 'Payment failed',
    };
  }

  private async handleSubscriptionStatusChange(payload: any): Promise<WebhookResult> {
    const subData = payload?.data?.subscription || payload?.subscription || {};
    const status = subData.status?.toLowerCase();
    const subId = subData.subscription_id;

    if (subId) {
      const User = (await import('@/models/User')).default;
      if (status === 'cancelled' || status === 'completed') {
        await User.findOneAndUpdate(
          { 'subscription.providerSubscriptionId': subId },
          { 'subscription.status': 'cancelled' }
        );
      }
    }

    return { handled: true, action: `subscription_status_${status}`, subscriptionId: subId };
  }

  /**
   * Self-serve billing management portal for Cashfree
   */
  async createPortalSession(_customerId: string, returnUrl: string): Promise<CreatePortalResult> {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://resume.morigrid.com';
    return {
      success: true,
      url: returnUrl || `${baseUrl}/dashboard?tab=billing`,
    };
  }

  /**
   * Fetch order details from Cashfree
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    const config = await this.getConfig();
    if (!config) return null;

    try {
      const url = `${this.getBaseUrl(config.environment)}/orders/${encodeURIComponent(subscriptionId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-client-id': config.appId,
          'x-client-secret': config.secretKey,
          'x-api-version': config.apiVersion,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const statusMap: Record<string, SubscriptionInfo['status']> = {
        PAID: 'active',
        ACTIVE: 'incomplete',
        EXPIRED: 'expired',
        TERMINATED: 'cancelled',
      };

      const orderTags = data.order_tags || {};
      return {
        subscriptionId: data.order_id,
        status: statusMap[data.order_status] || 'incomplete',
        planKey: orderTags.planKey || 'focused_monthly',
        billingCycle: orderTags.billingCycle || 'monthly',
      };
    } catch {
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { getConnection } = await import('@/lib/database');
      await getConnection();
      const User = (await import('@/models/User')).default;
      await User.findOneAndUpdate(
        { 'subscription.providerSubscriptionId': subscriptionId },
        { 'subscription.status': 'cancelled' }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Health & Credential check:
   * Pings Cashfree PG API to confirm credentials are valid and active.
   */
  async isHealthy(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config?.appId || !config?.secretKey) {
      return false;
    }

    try {
      // Validate by querying orders with limit=1
      const url = `${this.getBaseUrl(config.environment)}/orders?limit=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-client-id': config.appId,
          'x-client-secret': config.secretKey,
          'x-api-version': config.apiVersion,
          'Accept': 'application/json',
        },
      });

      // 200 or 404 (no orders) means credentials are accepted.
      // 401 / 403 means bad credentials.
      return response.status === 200 || response.status === 404;
    } catch (err) {
      console.error('[Cashfree] Health check network error:', err);
      return false;
    }
  }

  /**
   * Comprehensive validation for admin settings
   */
  async validateCredentials(): Promise<{ valid: boolean; environment: string; error?: string }> {
    const config = await this.getConfig();
    if (!config) {
      return { valid: false, environment: 'unknown', error: 'Missing credentials' };
    }

    try {
      const url = `${this.getBaseUrl(config.environment)}/orders?limit=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-client-id': config.appId,
          'x-client-secret': config.secretKey,
          'x-api-version': config.apiVersion,
          'Accept': 'application/json',
        },
      });

      if (response.status === 200 || response.status === 404) {
        return { valid: true, environment: config.environment };
      }

      const body = await response.json().catch(() => ({}));
      return {
        valid: false,
        environment: config.environment,
        error: body.message || `API returned status ${response.status}`,
      };
    } catch (err: any) {
      return { valid: false, environment: config.environment, error: err.message };
    }
  }
}
