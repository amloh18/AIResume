'use client';

/**
 * @deprecated Use `useEntitlements` from `@/lib/hooks/useEntitlements` instead.
 * This hook is kept for backward compatibility only.
 * All new code should use `useEntitlements()`.
 */

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import type { PlanKey, FeatureKey, EffectiveEntitlements, LimitKey, CreditType } from '@/lib/entitlements';

// Re-export entitlement types for consumers
export type { PlanKey, FeatureKey, EffectiveEntitlements, LimitKey, CreditType };

export interface MembershipInfo {
  planKey: PlanKey;
  planName: string;
  isFreePlan: boolean;
  isPaidMember: boolean;
  isTrialing: boolean;
  isLaunchTrial: boolean;
  entitlements: EffectiveEntitlements | null;
  isSubscriptionActive: boolean;
  expiresAt?: Date | null;
}

export interface UseMembershipReturn {
  membership: MembershipInfo | null;
  loading: boolean;
  error: string | null;
  canAccess: (feature: FeatureKey) => boolean;
  getLockedReason: (feature: FeatureKey) => string | null;
  isPaidMember: boolean;
  refreshMembership: () => Promise<void>;
}

const PLAN_NAMES: Record<PlanKey, string> = {
  free: 'Free',
  starter: 'Starter',
  focused: 'Focused',
};

const defaultMembership: MembershipInfo = {
  planKey: 'free',
  planName: 'Free',
  isFreePlan: true,
  isPaidMember: false,
  isTrialing: false,
  isLaunchTrial: false,
  entitlements: null,
  isSubscriptionActive: true,
  expiresAt: null,
};

async function fetchMembershipInfo(): Promise<MembershipInfo> {
  const response = await fetch('/api/me/entitlements');

  if (!response.ok) {
    console.warn('Failed to fetch entitlements, using defaults');
    return defaultMembership;
  }

  const data = await response.json();

  if (!data.success) {
    return defaultMembership;
  }

  const planKey: PlanKey = data.plan || 'free';
  const isActive = data.hasAccess;
  const isTrialing = data.isTrialing;
  const isLaunchTrial = data.isLaunchTrial;

  return {
    planKey,
    planName: PLAN_NAMES[planKey] || planKey,
    isFreePlan: planKey === 'free',
    isPaidMember: planKey !== 'free' && isActive,
    isTrialing,
    isLaunchTrial,
    entitlements: data as EffectiveEntitlements,
    isSubscriptionActive: isActive,
    expiresAt: data.limits?.active_jobs?.resetAt
      ? new Date(data.limits.active_jobs.resetAt)
      : null,
  };
}

/**
 * Hook to check user's membership status and feature access.
 * Consumes the single /api/me/entitlements endpoint.
 */
export function useMembership(): UseMembershipReturn {
  const { data: session, status: sessionStatus } = useSession();
  const hasSession = !!session?.user?.id;
  const {
    data: membership = null,
    isPending,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['membership', session?.user?.id],
    queryFn: fetchMembershipInfo,
    enabled: sessionStatus === 'authenticated' && hasSession,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const canAccess = useCallback((feature: FeatureKey): boolean => {
    if (!membership?.entitlements) return false;
    return membership.entitlements.features[feature] ?? false;
  }, [membership]);

  const getLockedReason = useCallback((feature: FeatureKey): string | null => {
    if (!membership?.entitlements) return 'Please sign in to access this feature';
    if (canAccess(feature)) return null;

    const planLabel = membership.planKey.charAt(0).toUpperCase() + membership.planKey.slice(1);
    const featureLabel = feature.split('.').map(s =>
      s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    ).join(' > ');

    // Determine required plan from the feature's namespace
    const requiredPlan = getRequiredPlanFromFeature(feature);
    if (requiredPlan && requiredPlan !== membership.planKey) {
      const reqLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
      return `${featureLabel} is included with ${reqLabel}.`;
    }

    return `${featureLabel} requires a higher plan.`;
  }, [membership, canAccess]);

  const isPaidMember = membership?.isPaidMember ?? false;

  return {
    membership,
    loading: sessionStatus === 'loading' || (hasSession && isPending),
    error: queryError instanceof Error ? queryError.message : null,
    canAccess,
    getLockedReason,
    isPaidMember,
    refreshMembership: async () => {
      await refetch();
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRequiredPlanFromFeature(feature: FeatureKey): PlanKey | null {
  // Features that require starter
  const starterFeatures = [
    'build.ai_surgeon.full', 'build.cover_letter_ai', 'build.export.docx',
    'match.job_tracker', 'match.journey_cv',
    'apply.manual', 'apply.auto',
    'apply.greenhouse', 'apply.lever', 'apply.ashby', 'apply.workday',
  ];
  // Features that require focused
  const focusedFeatures = [
    'tailor.linkedin_tone', 'tailor.linkedin_cv',
    'track.analytics', 'track.interview_coach',
    'learn.outcome_learning', 'learn.advanced_analytics',
    'meta.priority_support',
  ];

  if (focusedFeatures.includes(feature)) return 'focused';
  if (starterFeatures.includes(feature)) return 'starter';
  return 'free';
}

/**
 * Helper to check if a subscription plan is a paid plan.
 */
export function isProPlan(planKey: string): boolean {
  return planKey === 'starter' || planKey === 'focused';
}

/**
 * Helper to check if a subscription is currently active.
 */
export function isSubscriptionActive(subscription: {
  status?: string;
  endDate?: Date | string;
}): boolean {
  if (subscription.status === 'inactive' || subscription.status === 'cancelled') {
    return false;
  }
  const now = new Date();
  if (subscription.endDate) {
    const endDate = new Date(subscription.endDate);
    if (endDate < now) return false;
  }
  return true;
}
