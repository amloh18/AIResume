/**
 * guards.ts — Server-side entitlement guards.
 *
 * These functions are used in API routes and workers to enforce
 * entitlements. They return structured responses that the UI can
 * display as upgrade prompts.
 *
 * The frontend can use useEntitlement() to hide UI, but that is UX.
 * The API MUST independently enforce via these guards.
 */

import { PlanKey, SubscriptionState } from './plans';
import { FeatureKey, getRequiredPlan, getFeatureUpgradeMessage } from './features';
import { LimitKey } from './limits';
import { EffectiveEntitlements, can, hasRemaining } from './resolver';

// ─── Guard Response Types ────────────────────────────────────────────────────

export interface EntitlementGuardResult {
  allowed: boolean;
  feature?: FeatureKey;
  reason?: EntitlementDeniedReason;
  currentPlan?: PlanKey;
  requiredPlan?: PlanKey;
  message?: string;
}

export type EntitlementDeniedReason =
  | 'PLAN_REQUIRED'
  | 'LIMIT_EXCEEDED'
  | 'SUBSCRIPTION_INACTIVE'
  | 'NO_SUBSCRIPTION'
  | 'FEATURE_NOT_AVAILABLE';

// ─── Feature Guards ──────────────────────────────────────────────────────────

/**
 * Require a feature. Returns structured denial if not available.
 *
 * Usage in API routes:
 * ```ts
 * const guard = requireFeatureGuard(subscription, 'apply.auto');
 * if (!guard.allowed) return NextResponse.json(guard, { status: 403 });
 * ```
 */
export function requireFeatureGuard(
  subscription: SubscriptionState,
  feature: FeatureKey
): EntitlementGuardResult {
  // Check subscription is active
  if (!subscription.plan || subscription.plan === 'free') {
    if (getRequiredPlan(feature) !== 'free') {
      return {
        allowed: false,
        feature,
        reason: 'NO_SUBSCRIPTION',
        currentPlan: 'free',
        requiredPlan: getRequiredPlan(feature),
        message: getFeatureUpgradeMessage(feature, 'free'),
      };
    }
  }

  // Check feature access
  if (can(subscription, feature)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    feature,
    reason: 'PLAN_REQUIRED',
    currentPlan: subscription.plan,
    requiredPlan: getRequiredPlan(feature),
    message: getFeatureUpgradeMessage(feature, subscription.plan),
  };
}

/**
 * Require active subscription (any paid plan).
 */
export function requireActiveSubscription(
  subscription: SubscriptionState
): EntitlementGuardResult {
  if (subscription.plan === 'free') {
    return {
      allowed: false,
      reason: 'NO_SUBSCRIPTION',
      currentPlan: 'free',
      message: 'This feature requires an active subscription.',
    };
  }

  return { allowed: true };
}

// ─── Limit Guards ────────────────────────────────────────────────────────────

/**
 * Require remaining quota for a limit.
 *
 * Usage in API routes:
 * ```ts
 * const guard = requireLimitGuard(entitlements, 'auto_apply_daily');
 * if (!guard.allowed) return NextResponse.json(guard, { status: 429 });
 * ```
 */
export function requireLimitGuard(
  entitlements: EffectiveEntitlements,
  limitKey: LimitKey
): EntitlementGuardResult {
  if (hasRemaining(entitlements, limitKey)) {
    return { allowed: true };
  }

  const bucket = entitlements.limits[limitKey];
  return {
    allowed: false,
    reason: 'LIMIT_EXCEEDED',
    currentPlan: entitlements.plan,
    message: `You've reached your ${limitKey.replace(/_/g, ' ')} limit. ${
      entitlements.plan !== 'focused'
        ? 'Upgrade to Focused for higher limits.'
        : 'Limit reached for this period.'
    }`,
  };
}

// ─── Auto Apply Guard (Three-Dimensional) ────────────────────────────────────

/**
 * Auto Apply has three dimensions: feature + daily + monthly.
 * This guard checks all three.
 */
export function requireAutoApplyGuard(
  subscription: SubscriptionState,
  entitlements: EffectiveEntitlements
): EntitlementGuardResult {
  // 1. Feature access
  const featureGuard = requireFeatureGuard(subscription, 'apply.auto');
  if (!featureGuard.allowed) return featureGuard;

  // 2. Daily limit
  const dailyGuard = requireLimitGuard(entitlements, 'auto_apply_daily');
  if (!dailyGuard.allowed) return dailyGuard;

  // 3. Monthly limit
  const monthlyGuard = requireLimitGuard(entitlements, 'auto_apply_monthly');
  if (!monthlyGuard.allowed) return monthlyGuard;

  return { allowed: true };
}

// ─── Explanation Builder ─────────────────────────────────────────────────────

/**
 * Build a structured entitlement explanation for the frontend.
 * This replaces vague "upgrade required" messages.
 */
export function explainDenial(
  result: EntitlementGuardResult
): {
  allowed: boolean;
  feature?: string;
  reason?: string;
  currentPlan?: string;
  requiredPlan?: string;
  message: string;
} {
  return {
    allowed: false,
    feature: result.feature,
    reason: result.reason,
    currentPlan: result.currentPlan,
    requiredPlan: result.requiredPlan,
    message: result.message || 'Access denied.',
  };
}
