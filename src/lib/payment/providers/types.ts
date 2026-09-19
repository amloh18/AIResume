/**
 * Unified Payment Provider Interface
 *
 * Both Stripe and Razorpay implement this interface.
 * The checkout flow, webhook handling, and subscription management
 * are all abstracted behind this contract.
 */

export type PaymentProvider = 'stripe' | 'razorpay';

export interface CheckoutSessionParams {
  planKey: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  userId: string;
  userEmail: string;
  userName?: string;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface SubscriptionInfo {
  subscriptionId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete' | 'trialing' | 'expired';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  planKey: string;
  billingCycle: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  createdAt: Date;
  rawBody?: string;
  signature?: string;
}

export interface WebhookResult {
  handled: boolean;
  action?: string;
  subscriptionId?: string;
  planKey?: string;
  error?: string;
}

export interface CreatePortalResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Abstract payment provider that both Stripe and Razorpay implement.
 */
export interface IPaymentProvider {
  readonly name: PaymentProvider;

  /** Create a checkout session and return the URL to redirect the user */
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /** Verify and parse a webhook event from the raw request */
  verifyWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent | null>;

  /** Process a verified webhook event and return the outcome */
  handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult>;

  /** Create a customer portal session for managing subscriptions */
  createPortalSession(customerId: string, returnUrl: string): Promise<CreatePortalResult>;

  /** Get subscription details by ID */
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>;

  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<boolean>;

  /** Check if the provider is configured and healthy */
  isHealthy(): Promise<boolean>;
}
