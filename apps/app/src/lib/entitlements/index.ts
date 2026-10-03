/**
 * AIResume Entitlement Engine
 *
 * The single brain that answers:
 *   "Given this subscription state, what can this user actually do?"
 *
 * Architecture:
 *
 *   Stripe (billing truth)
 *       │
 *       │ subscription / price / status
 *       ▼
 *   Subscription Sync (webhooks → SubscriptionState)
 *       │
 *       ▼
 *   Entitlement Engine (this module)
 *       │
 *       ├── Features  (can they do X?)
 *       ├── Limits    (how many times?)
 *       ├── Credits   (consumable tokens)
 *       └── Usage     (how much consumed?)
 *            │
 *            ├── Client UI  (via /api/me/entitlements)
 *            ├── API routes (via guards)
 *            ├── Workers    (via revalidation)
 *            └── Automation (via queue checks)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type { PlanKey, BillingInterval, SubscriptionStatus } from './plans';
export type { FeatureKey } from './features';
export type { LimitKey, LimitPeriod } from './limits';
export type { CreditType, CreditPeriod } from './credits';
export type { EffectiveEntitlements } from './resolver';
export type { EntitlementGuardResult, EntitlementDeniedReason } from './guards';

// ─── Plans ───────────────────────────────────────────────────────────────────

export {
  FREE_SUBSCRIPTION,
  mapStripeStatus,
  isActiveAccess,
  isTrialing,
  isCanceledButActive,
} from './plans';

export type { SubscriptionState } from './plans';

// ─── Features ────────────────────────────────────────────────────────────────

export {
  FEATURE_CATEGORIES,
  getRequiredPlan,
  planIncludesFeature,
  getPlanFeatures,
  getLockedFeatures,
  getFeatureUpgradeMessage,
} from './features';

// ─── Limits ──────────────────────────────────────────────────────────────────

export {
  LIMITS,
  getDefaultLimit,
  getLimitPeriod,
  isUnlimited,
  calculateRemaining,
  getLimitDefinition,
} from './limits';

// ─── Credits ─────────────────────────────────────────────────────────────────

export {
  CREDITS,
  getDefaultCredits,
  isUnlimitedCredits,
  getCreditDefinition,
} from './credits';

// ─── Usage ───────────────────────────────────────────────────────────────────

export {
  getPeriodBounds,
  getUsageKey,
} from './usage';

// ─── Resolver ────────────────────────────────────────────────────────────────

export {
  resolveEntitlements,
  can,
  requireFeature,
  hasRemaining,
  remaining,
} from './resolver';

// ─── Guards ──────────────────────────────────────────────────────────────────

export {
  requireFeatureGuard,
  requireActiveSubscription,
  requireLimitGuard,
  requireAutoApplyGuard,
  explainDenial,
} from './guards';

// ─── Catalog ────────────────────────────────────────────────────────────────

export {
  FEATURE_CATALOG,
  getFeatureName,
  getFeatureDescription,
  getCatalogFeature,
  getFeaturesByCategory,
  getPlanLabel,
  getUpgradeMessage,
  getFeatureBadge,
  getFeaturesWithUsageMeters,
  getCatalogByCategory,
} from './catalog';

export type { CatalogFeature } from './catalog';

// ─── Stripe Price Map ────────────────────────────────────────────────────────

export {
  resolveStripePrice,
  resolvePriceToPlan,
  detectRegion,
  qualifiesForLaunchTrial,
  isStarterMonthlyLaunchTrialActive,
  getLaunchTrialEndTimestamp,
  getLaunchTrialEndDate,
  getLaunchTrialMessage,
  STRIPE_PRODUCT_ID,
  STRIPE_PORTAL_CONFIG_ID,
  PORTAL_RETURN_URL,
  APPLICATION_VERSION,
} from '../billing/stripe-price-map';

export type { Region } from '../billing/stripe-price-map';
