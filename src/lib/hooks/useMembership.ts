'use client';

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { PLAN_LIMITS, PlanLimits, getPlanLimits } from '@/lib/utils/subscription-helpers';

/**
 * Feature keys for membership checks
 */
export type MembershipFeature =
    | 'journeyCVs'
    | 'standaloneCVs'
    | 'premiumTemplates'
    | 'aiSurgeonFull'
    | 'coverLetterAI'
    | 'docxExport'
    | 'interviewCoach'
    | 'jobTracker'
    | 'jobParsing'           // Can parse job descriptions (Pro only)
    | 'prioritySupport'
    | 'advancedAnalytics'
    | 'careerVault'
    | 'unlimitedJobs'
    | 'linkedinToneChange'   // LinkedIn Enhancer: can change tone
    | 'linkedinCVSelection'; // LinkedIn Enhancer: can select different CVs

/**
 * Membership information
 */
export interface MembershipInfo {
    planKey: string;
    planName: string;
    isFreePlan: boolean;
    isProMember: boolean;
    isLifetimeMember: boolean;
    limits: PlanLimits;
    isSubscriptionActive: boolean;
    expiresAt?: Date | null;
}

export interface UseMembershipReturn {
    /** Full membership info */
    membership: MembershipInfo | null;
    /** Loading state */
    loading: boolean;
    /** Error message if any */
    error: string | null;
    /** Check if user can access a specific feature */
    canAccess: (feature: MembershipFeature) => boolean;
    /** Get reason why a feature is locked */
    getLockedReason: (feature: MembershipFeature) => string | null;
    /** Whether user is a paid member (not free) */
    isPaidMember: boolean;
    /** Refresh membership info */
    refreshMembership: () => Promise<void>;
}

/**
 * Plan key to display name mapping
 */
const PLAN_NAMES: Record<string, string> = {
    free: 'Free',
    starter_monthly: 'Starter Monthly',
    starter_yearly: 'Starter Yearly',
    focused_monthly: 'Focused Monthly',
    focused_yearly: 'Focused Yearly',
};

const defaultMembership: MembershipInfo = {
    planKey: 'free',
    planName: 'Free',
    isFreePlan: true,
    isProMember: false,
    isLifetimeMember: false,
    limits: PLAN_LIMITS.free,
    isSubscriptionActive: true,
    expiresAt: null,
};

async function fetchMembershipInfo(): Promise<MembershipInfo> {
    const response = await fetch('/api/user/usage-limits');

    if (!response.ok) {
        console.warn('Failed to fetch membership info, using default values');
        return defaultMembership;
    }

    const data = await response.json();

    if (!data.success) {
        return defaultMembership;
    }

    const planKey = data.subscription?.planKey || 'free';
    const limits = getPlanLimits(planKey);
    const isActive = data.subscription?.status === 'active' || planKey === 'free';

    return {
        planKey,
        planName: PLAN_NAMES[planKey] || planKey,
        isFreePlan: planKey === 'free' || planKey === 'starter_monthly',
        isProMember: [
            'focused_monthly', 'focused_yearly',
        ].includes(planKey) && isActive,
        isLifetimeMember: false,
        limits,
        // Free tier (free + starter_monthly) is always active — no subscription expiry
        isSubscriptionActive: (planKey === 'free' || planKey === 'starter_monthly') ? true : isActive,
        expiresAt: data.subscription?.accessExpiresAt || data.subscription?.currentPeriodEnd
            ? new Date(data.subscription.accessExpiresAt || data.subscription.currentPeriodEnd)
            : null,
    };
}

/**
 * Hook to check user's membership status and feature access
 * Replaces the legacy credit system with membership-based feature locking
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

    /**
     * Check if user can access a specific feature
     */
    const canAccess = useCallback((feature: MembershipFeature): boolean => {
        if (!membership) return false;

        const limits = membership.limits;

        switch (feature) {
            case 'journeyCVs':
                return limits.journeyCVs !== 0; // 0 means not allowed, -1 means unlimited
            case 'standaloneCVs':
                return limits.standaloneCVs;
            case 'premiumTemplates':
                return limits.premiumTemplates;
            case 'aiSurgeonFull':
                return limits.aiSurgeonMode === 'full';
            case 'coverLetterAI':
                return limits.coverLetterAI;
            case 'docxExport':
                return limits.docxExport;
            case 'interviewCoach':
                return limits.interviewCoach;
            case 'jobTracker':
                return limits.jobTracker;
            case 'jobParsing':
                return limits.jobParsing;  // Pro only - can parse job descriptions
            case 'prioritySupport':
                return limits.prioritySupport;
            case 'advancedAnalytics':
                return limits.advancedAnalytics;
            case 'careerVault':
                return limits.hasVault || false;
            case 'unlimitedJobs':
                return limits.maxJobs === -1;
            case 'linkedinToneChange':
                return limits.linkedinToneChange;  // Pro can change tone
            case 'linkedinCVSelection':
                return limits.linkedinCVSelection; // Pro can select CVs
            default:
                return false;
        }
    }, [membership]);

    /**
     * Get the reason why a feature is locked
     */
    const getLockedReason = useCallback((feature: MembershipFeature): string | null => {
        if (!membership) return 'Please sign in to access this feature';

        if (canAccess(feature)) return null;

        switch (feature) {
            case 'journeyCVs':
                return 'Journey CVs require a Pro membership. Upgrade to tailor your CV for specific jobs.';
            case 'standaloneCVs':
                return 'Creating standalone CVs requires a Pro membership.';
            case 'premiumTemplates':
                return 'Premium templates require a Pro membership.';
            case 'aiSurgeonFull':
                return 'Full AI rewrite requires a Pro membership. Free users get spelling corrections only.';
            case 'coverLetterAI':
                return 'Cover Letter Generator requires a Pro membership.';
            case 'docxExport':
                return 'DOCX export requires a Pro membership. Free users can download as PDF.';
            case 'interviewCoach':
                return 'Interview Coach requires a Pro membership.';
            case 'jobTracker':
                return 'Job Tracker requires a Pro membership.';
            case 'jobParsing':
                return 'Job parsing requires a Pro membership. Upgrade to parse and track jobs.';
            case 'prioritySupport':
                return 'Priority support is available with Pro Yearly or Lifetime membership.';
            case 'advancedAnalytics':
                return 'Advanced analytics require a Pro membership.';
            case 'careerVault':
                return 'Career Vault is exclusive to Pro members.';
            case 'unlimitedJobs':
                return 'Unlimited job tracking requires a Pro membership.';
            case 'linkedinToneChange':
                return 'Tone customization requires a Pro membership.';
            case 'linkedinCVSelection':
                return 'CV selection requires a Pro membership. Free users use the Master CV only.';
            default:
                return 'This feature requires a Pro membership.';
        }
    }, [membership, canAccess]);

    // Derived state
    const isPaidMember = useMemo(() => {
        return membership?.isProMember || false;
    }, [membership]);

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

/**
 * Helper to check if a subscription plan is a pro plan
 */
export function isProPlan(planKey: string): boolean {
    return [
        'focused_monthly', 'focused_yearly',
    ].includes(planKey);
}

/**
 * Helper to check if a subscription is currently active
 */
export function isSubscriptionActive(subscription: {
    status?: string;
    endDate?: Date | string;
}): boolean {
    if (subscription.status === 'inactive' || subscription.status === 'cancelled') {
        return false;
    }

    const now = new Date();

    // Check end date
    if (subscription.endDate) {
        const endDate = new Date(subscription.endDate);
        if (endDate < now) return false;
    }

    return true;
}
