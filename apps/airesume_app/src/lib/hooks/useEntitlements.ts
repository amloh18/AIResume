'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlanKey, FeatureKey, EffectiveEntitlements, LimitKey, CreditType } from '@/lib/entitlements';
import type { CatalogFeature } from '@/lib/entitlements/catalog';
import {
  FEATURE_CATALOG,
  getFeatureName,
  getFeatureDescription,
  getPlanLabel,
  getUpgradeMessage,
} from '@/lib/entitlements/catalog';
import { getRequiredPlan } from '@/lib/entitlements/features';

// Re-export types for consumers
export type { PlanKey, FeatureKey, EffectiveEntitlements, LimitKey, CreditType, CatalogFeature };

// ─── Types ───────────────────────────────────────────────────────────────────

export type EntitlementState =
  | 'loading'
  | 'available'
  | 'approaching_limit'
  | 'limit_reached'
  | 'plan_locked'
  | 'subscription_issue';

export interface EntitlementInfo {
  /** Internal state */
  state: EntitlementState;
  /** Whether the feature is accessible right now */
  allowed: boolean;
  /** Customer-facing name */
  name: string;
  /** Customer-facing description */
  description: string;
  /** Required plan label (for upgrade prompts) */
  requiredPlanLabel: string;
  /** Upgrade message if locked */
  upgradeMessage: string;
  /** Usage bucket if feature has a meter */
  usage?: {
    limit: number;
    used: number;
    remaining: number | null;
    period: string;
    resetAt?: Date;
  };
  /** Percentage used (0-100), null if unlimited */
  usagePercent: number | null;
}

export interface UseEntitlementsReturn {
  /** Full entitlements from server */
  entitlements: EffectiveEntitlements | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Current plan key */
  plan: PlanKey;
  /** Customer-facing plan name */
  planLabel: string;
  /** Whether user has active access (including trial) */
  hasAccess: boolean;
  /** Whether user is in trial */
  isTrialing: boolean;
  /** Whether this is a launch trial */
  isLaunchTrial: boolean;

  /** Check if a feature is available */
  can: (feature: FeatureKey) => boolean;
  /** Get full entitlement info for a feature (state, usage, upgrade message) */
  getFeature: (feature: FeatureKey) => EntitlementInfo;
  /** Get limit bucket for a limit key */
  getLimit: (limitKey: LimitKey) => { limit: number; used: number; remaining: number | null; period: string; resetAt?: Date } | null;
  /** Get remaining quota for a limit key */
  getRemaining: (limitKey: LimitKey) => number | null;
  /**
   * The auto-apply usage as the USER should see it: the binding cap for their
   * plan and the matching reset time.
   *
   * The raw buckets split auto-apply into daily and monthly keys, but only one
   * of them is the operative limit per plan (free → lifetime/monthly 10,
   * starter → monthly 10, focused → daily 50). Surfaces that show a single
   * "used / limit · resets in …" meter must use this, or a Focused user sees
   * "13/Infinity" and a Starter user sees the monthly bucket where the daily
   * one binds.
   */
  getAutoApplyUsage: () => { used: number; limit: number; remaining: number | null; resetAt?: Date; isUnlimited: boolean };
  /** Get the upgrade plan needed for a feature */
  getUpgradePlan: (feature: FeatureKey) => PlanKey;
  /** Get customer-facing feature name */
  getFeatureName: (feature: FeatureKey) => string;
  /** Get customer-facing feature description */
  getFeatureDescription: (feature: FeatureKey) => string;
  /** Get catalog entry for a feature */
  getCatalogFeature: (feature: FeatureKey) => CatalogFeature | undefined;
  /** Refresh entitlements */
  refresh: () => Promise<void>;
}

// ─── Default State ───────────────────────────────────────────────────────────

const defaultEntitlements: EffectiveEntitlements = {
  plan: 'free',
  status: 'active',
  billingInterval: 'monthly',
  hasAccess: true,
  isTrialing: false,
  isLaunchTrial: false,
    features: {} as Record<FeatureKey, boolean>,
    limits: {} as Record<string, never>,
    credits: {} as Record<string, never>,
};

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchEntitlements(): Promise<EffectiveEntitlements> {
  const response = await fetch('/api/me/entitlements');
  if (!response.ok) {
    return defaultEntitlements;
  }
  const data = await response.json();
  if (!data.success) {
    return defaultEntitlements;
  }
  return {
    plan: data.plan || 'free',
    status: data.status || 'active',
    billingInterval: data.billingInterval || 'monthly',
    hasAccess: data.hasAccess ?? true,
    isTrialing: data.isTrialing ?? false,
    isLaunchTrial: data.isLaunchTrial ?? false,
    features: data.features || {},
    limits: data.limits || {},
    credits: data.credits || {},
  } as EffectiveEntitlements;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * The single hook for all entitlement checks in the frontend.
 *
 * Usage:
 * ```tsx
 * const { can, getFeature, getRemaining } = useEntitlements();
 *
 * // Simple check
 * if (can('track.interview_coach')) { ... }
 *
 * // Full info with usage
 * const info = getFeature('apply.auto');
 * if (info.state === 'limit_reached') { ... }
 * if (info.state === 'plan_locked') { ... }
 *
 * // Remaining quota
 * const remaining = getRemaining('auto_apply_daily');
 * ```
 */
export function useEntitlements(): UseEntitlementsReturn {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const hasSession = !!session?.user?.id;

  const {
    data: entitlements = defaultEntitlements,
    isPending,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['entitlements', session?.user?.id],
    queryFn: fetchEntitlements,
    enabled: sessionStatus === 'authenticated' && hasSession,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const plan = entitlements.plan ?? 'free';
  const hasAccess = entitlements.hasAccess;
  const isTrialing = entitlements.isTrialing;
  const isLaunchTrial = entitlements.isLaunchTrial;

  const can = useCallback((feature: FeatureKey): boolean => {
    return entitlements.features?.[feature] ?? false;
  }, [entitlements.features]);

  const getFeature = useCallback((feature: FeatureKey): EntitlementInfo => {
    const catalogEntry = FEATURE_CATALOG[feature];
    const isAvailable = entitlements.features?.[feature] ?? false;
    const requiredPlan = catalogEntry?.requiredPlan ?? getRequiredPlan(feature);
    const requiredPlanLabel = getPlanLabel(requiredPlan);

    // Determine state
    let state: EntitlementState;
    if (isPending || sessionStatus === 'loading') {
      state = 'loading';
    } else if (!hasAccess) {
      state = 'subscription_issue';
    } else if (isAvailable) {
      // Check usage limits if feature has a meter
      if (catalogEntry?.hasUsageMeter && catalogEntry.limitKey) {
        const bucket = entitlements.limits?.[catalogEntry.limitKey];
        if (bucket) {
          if (bucket.remaining === 0) {
            state = 'limit_reached';
          } else if (bucket.remaining !== null && bucket.limit > 0 && bucket.remaining <= Math.ceil(bucket.limit * 0.2)) {
            state = 'approaching_limit';
          } else {
            state = 'available';
          }
        } else {
          state = 'available';
        }
      } else {
        state = 'available';
      }
    } else {
      state = 'plan_locked';
    }

    // Usage info
    let usage: EntitlementInfo['usage'] = undefined;
    let usagePercent: number | null = null;

    if (catalogEntry?.hasUsageMeter && catalogEntry.limitKey) {
      const bucket = entitlements.limits?.[catalogEntry.limitKey];
      if (bucket) {
        usage = {
          limit: bucket.limit,
          used: bucket.used,
          remaining: bucket.remaining,
          period: bucket.period,
          resetAt: bucket.resetAt ? new Date(bucket.resetAt) : undefined,
        };
        usagePercent = bucket.limit === -1 ? null : bucket.limit > 0 ? Math.min(100, Math.round((bucket.used / bucket.limit) * 100)) : 0;
      }
    }

    return {
      state,
      allowed: state === 'available' || state === 'approaching_limit',
      name: catalogEntry?.name ?? feature,
      description: catalogEntry?.description ?? '',
      requiredPlanLabel,
      upgradeMessage: !isAvailable ? getUpgradeMessage(feature, plan) : '',
      usage,
      usagePercent,
    };
  }, [entitlements, plan, hasAccess, isPending, sessionStatus]);

  const getLimit = useCallback((limitKey: LimitKey) => {
    const bucket = entitlements.limits?.[limitKey];
    if (!bucket) return null;
    return {
      limit: bucket.limit,
      used: bucket.used,
      remaining: bucket.remaining,
      period: bucket.period,
      resetAt: bucket.resetAt ? new Date(bucket.resetAt) : undefined,
    };
  }, [entitlements.limits]);

  const getRemaining = useCallback((limitKey: LimitKey): number | null => {
    return entitlements.limits?.[limitKey]?.remaining ?? null;
  }, [entitlements.limits]);

  const getAutoApplyUsage = useCallback((): {
    used: number;
    limit: number;
    remaining: number | null;
    resetAt?: Date;
    isUnlimited: boolean;
  } => {
    /*
      Pick the bucket that actually binds for the current plan. Keep the
      precedence identical to AutoApplyQuotaService.resolveBindingCap — that is
      what the enforcement layer blocks on, and these two must never disagree.
    */
    const daily = entitlements.limits?.auto_apply_daily;
    const monthly = entitlements.limits?.auto_apply_monthly;

    if (plan === 'focused' && daily) {
      // Focused: the daily cap is the operative limit; monthly is uncapped.
      return {
        used: daily.used,
        limit: daily.limit,
        remaining: daily.remaining,
        resetAt: daily.resetAt ? new Date(daily.resetAt) : undefined,
        isUnlimited: daily.remaining === null,
      };
    }

    if (monthly) {
      // Starter/Free: the monthly (or lifetime) cap binds.
      return {
        used: monthly.used,
        limit: monthly.limit,
        remaining: monthly.remaining,
        resetAt: monthly.resetAt ? new Date(monthly.resetAt) : undefined,
        isUnlimited: monthly.remaining === null,
      };
    }

    // Entitlements not loaded yet — assume a full allowance at plan defaults
    // rather than rendering a fake exhausted state.
    const fallbackLimit = plan === 'focused' ? 50 : 10;
    return { used: 0, limit: fallbackLimit, remaining: fallbackLimit, isUnlimited: false };
  }, [entitlements.limits, plan]);

  const getUpgradePlan = useCallback((feature: FeatureKey): PlanKey => {
    return FEATURE_CATALOG[feature]?.requiredPlan ?? getRequiredPlan(feature);
  }, []);

  return {
    entitlements,
    loading: sessionStatus === 'loading' || (hasSession && isPending),
    error: queryError instanceof Error ? queryError.message : null,
    plan,
    planLabel: getPlanLabel(plan),
    hasAccess,
    isTrialing,
    isLaunchTrial,
    can,
    getFeature,
    getLimit,
    getRemaining,
    getAutoApplyUsage,
    getUpgradePlan,
    getFeatureName: (f: FeatureKey) => getFeatureName(f),
    getFeatureDescription: (f: FeatureKey) => getFeatureDescription(f),
    getCatalogFeature: (f: FeatureKey) => FEATURE_CATALOG[f],
    refresh: async () => {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['entitlements'] });
    },
  };
}
