/**
 * plans.ts — Canonical plan definitions for AIResume.
 *
 * This is the SINGLE SOURCE OF TRUTH for what plans exist.
 * Stripe prices map INTO these plan keys. Plan keys never map into Stripe.
 *
 * PlanKey is the internal representation. It is intentionally simple:
 *   free    → no subscription
 *   starter → Starter plan (any interval, any currency)
 *   focused → Focused plan (any interval, any currency)
 */

export type PlanKey = 'free' | 'starter' | 'focused';

export type BillingInterval = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

/**
 * Canonical subscription state — the single representation of
 * "what does this customer currently subscribe to?"
 *
 * This lives in AIResume, synced from Stripe webhooks.
 * It is NEVER read directly from Stripe at request time.
 */
export interface SubscriptionState {
  plan: PlanKey;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;

  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;

  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;

  cancelAtPeriodEnd?: boolean;
  trialStart?: Date;
  trialEnd?: Date;

  /** Launch trial metadata */
  isLaunchTrial?: boolean;
  launchTrialEnd?: Date;
}

/**
 * The default subscription state for non-authenticated or free users.
 */
export const FREE_SUBSCRIPTION: SubscriptionState = {
  plan: 'free',
  status: 'active',
  billingInterval: 'monthly',
};

/**
 * Map Stripe subscription status to our canonical status.
 */
export function mapStripeStatus(
  stripeStatus: string
): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
  };
  return map[stripeStatus] || 'incomplete';
}

/**
 * Check if a subscription state grants active access.
 * trialing counts as active (user has access during trial).
 * past_due gets a grace period (Stripe handles retries).
 * canceled/incomplete do NOT grant access.
 */
export function isActiveAccess(sub: SubscriptionState): boolean {
  return sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
}

/**
 * Check if a subscription is in trial state.
 */
export function isTrialing(sub: SubscriptionState): boolean {
  return sub.status === 'trialing';
}

/**
 * Check if a subscription is canceled but still has period access.
 */
export function isCanceledButActive(sub: SubscriptionState): boolean {
  return sub.status === 'canceled' && sub.cancelAtPeriodEnd === true && isActiveAccess(sub);
}
