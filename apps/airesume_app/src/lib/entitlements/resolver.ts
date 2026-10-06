/**
 * resolver.ts — The Entitlement Engine.
 *
 * This is the SINGLE BRAIN that answers:
 *   "Given this subscription state, what can this user actually do?"
 *
 * It produces EffectiveEntitlements — the resolved set of features,
 * limits, credits, and usage for a specific user at a specific moment.
 *
 * It does NOT call Stripe. It reads local SubscriptionState.
 * Stripe is the billing truth. This is the product truth.
 */

import { PlanKey, SubscriptionState, isActiveAccess } from './plans';
import { FeatureKey, planIncludesFeature, getRequiredPlan, getPlanFeatures } from './features';
import { LimitKey, getDefaultLimit, isUnlimited } from './limits';
import { CreditType, getDefaultCredits, isUnlimitedCredits } from './credits';
import { UsageBucket, getPeriodBounds } from './usage';

// ─── Effective Entitlements ──────────────────────────────────────────────────

export interface EffectiveEntitlements {
  /** Canonical plan key */
  plan: PlanKey;
  /** Subscription status */
  status: SubscriptionState['status'];
  /** Billing interval */
  billingInterval: SubscriptionState['billingInterval'];
  /** Whether the user has active access (including trial) */
  hasAccess: boolean;
  /** Whether the user is in trial */
  isTrialing: boolean;
  /** Whether this is a launch trial */
  isLaunchTrial: boolean;

  /** Feature map: feature key → whether it's included */
  features: Record<FeatureKey, boolean>;

  /** Limit buckets with live usage */
  limits: Record<LimitKey, UsageBucket>;

  /** Credit buckets with live balances */
  credits: Record<CreditType, UsageBucket>;
}

// ─── Entitlement Resolution ──────────────────────────────────────────────────

/**
 * Resolve the effective entitlements for a given subscription state.
 *
 * This is the core of the entitlement engine. It takes a subscription
 * state and produces the complete set of what the user can do.
 *
 * Usage data is NOT fetched here — it's passed in. This function is pure.
 * The caller fetches usage from MongoDB and passes it in.
 */
export function resolveEntitlements(
  subscription: SubscriptionState,
  usageData?: {
    limits?: Partial<Record<LimitKey, number>>;
    credits?: Partial<Record<CreditType, number>>;
  }
): EffectiveEntitlements {
  const plan = subscription.plan;
  const hasAccess = isActiveAccess(subscription);
  const isTrialing = subscription.status === 'trialing';
  const isLaunchTrial = subscription.isLaunchTrial ?? false;

  // Resolve features
  const features = {} as Record<FeatureKey, boolean>;
  const allFeatures = getPlanFeatures(plan);
  for (const f of allFeatures) {
    features[f] = true;
  }
  // Anything not in the plan's feature set is false
  const allFeatureKeys: FeatureKey[] = [
    'build.cv', 'build.templates.free', 'build.templates.premium',
    'build.ai_surgeon.spelling', 'build.ai_surgeon.full',
    'build.cover_letter_ai', 'build.export.pdf', 'build.export.docx',
    'match.job_discovery', 'match.job_parsing', 'match.job_tracker', 'match.journey_cv',
    'tailor.resume', 'tailor.ats_check', 'tailor.linkedin_tone', 'tailor.linkedin_cv',
    'apply.manual', 'apply.auto',
    'apply.greenhouse', 'apply.lever', 'apply.ashby', 'apply.workday',
    'track.applications', 'track.analytics', 'track.interview_coach',
    'learn.outcome_learning', 'learn.advanced_analytics',
    'meta.priority_support',
  ];
  for (const f of allFeatureKeys) {
    if (!(f in features)) {
      features[f] = false;
    }
  }

  // Resolve limits
  const limitKeys: LimitKey[] = [
    'active_jobs', 'journey_cvs', 'auto_apply_daily',
    'auto_apply_monthly', 'applications_monthly', 'ai_surgeon_runs_monthly',
  ];
  const limits = {} as Record<LimitKey, UsageBucket>;
  const now = new Date();
  for (const key of limitKeys) {
    const limitValue = getDefaultLimit(plan, key);
    const used = usageData?.limits?.[key] ?? 0;
    const { start, end } = getPeriodBounds(
      key.includes('daily') ? 'daily' : key.includes('monthly') ? 'monthly' : 'total',
      now
    );
    limits[key] = {
      limit: limitValue,
      used,
      remaining: isUnlimited(limitValue) ? null : Math.max(0, limitValue - used),
      period: key.includes('daily') ? 'daily' : key.includes('monthly') ? 'monthly' : 'total',
      resetAt: end,
    };
  }

  // Resolve credits
  const creditTypes: CreditType[] = ['job_credits', 'ai_credits'];
  const credits = {} as Record<CreditType, UsageBucket>;
  for (const type of creditTypes) {
    const creditValue = getDefaultCredits(plan, type);
    const used = usageData?.credits?.[type] ?? 0;
    const { start, end } = getPeriodBounds('monthly', now);
    credits[type] = {
      limit: creditValue,
      used,
      remaining: isUnlimitedCredits(creditValue) ? null : Math.max(0, creditValue - used),
      period: 'monthly',
      resetAt: end,
    };
  }

  return {
    plan,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    hasAccess,
    isTrialing,
    isLaunchTrial,
    features,
    limits,
    credits,
  };
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Check if a specific feature is available for a subscription.
 */
export function can(
  subscription: SubscriptionState,
  feature: FeatureKey
): boolean {
  return planIncludesFeature(subscription.plan, feature);
}

/**
 * Require a feature — throws if not available.
 * Used in API routes for server-side enforcement.
 */
export function requireFeature(
  subscription: SubscriptionState,
  feature: FeatureKey
): { allowed: boolean; reason?: string; requiredPlan?: PlanKey } {
  if (can(subscription, feature)) {
    return { allowed: true };
  }
  const requiredPlan = getRequiredPlan(feature);
  return {
    allowed: false,
    reason: 'PLAN_REQUIRED',
    requiredPlan,
  };
}

/**
 * Check if a user has remaining quota for a limit.
 */
export function hasRemaining(
  entitlements: EffectiveEntitlements,
  limitKey: LimitKey
): boolean {
  const bucket = entitlements.limits[limitKey];
  if (!bucket) return false;
  return bucket.remaining === null || bucket.remaining > 0;
}

/**
 * Get remaining quota for a limit.
 */
export function remaining(
  entitlements: EffectiveEntitlements,
  limitKey: LimitKey
): number | null {
  return entitlements.limits[limitKey]?.remaining ?? null;
}
