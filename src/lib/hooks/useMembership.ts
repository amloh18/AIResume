'use client';

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
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
    | 'jobParsing'
    | 'prioritySupport'
    | 'advancedAnalytics'
    | 'careerVault'
    | 'unlimitedJobs'
    | 'linkedinToneChange'
    | 'linkedinCVSelection';

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
    membership: MembershipInfo | null;
    loading: boolean;
    error: string | null;
    canAccess: (feature: MembershipFeature) => boolean;
    getLockedReason: (feature: MembershipFeature) => string | null;
    isPaidMember: boolean;
    refreshMembership: () => Promise<void>;
}

const PLAN_NAMES: Record<string, string> = {
    free: 'Free',
    starter_monthly: 'Starter Monthly',
    starter_yearly: 'Starter Yearly',
    focused_monthly: 'Focused Monthly',
    focused_yearly: 'Focused Yearly',
    smart_quarterly: 'Smart Quarterly',
    smart_yearly: 'Smart Yearly',
    pro_monthly: 'Pro Monthly',
    pro_quarterly: 'Pro Quarterly',
    pro_yearly: 'Pro Yearly',
    pro_lifetime: 'Pro Lifetime',
    pro: 'Pro',
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

const publicRoutes = [
    '/',
    '/sign-in',
    '/sign-up',
    '/b2b/login',
    '/admin/login',
    '/custom-signin',
    '/auth/verify-email',
    '/auth/error',
    '/auth/reset-password',
    '/onboarding',
    '/onboarding-universal',
    '/privacy-policy',
    '/terms',
    '/cookie-policy',
    '/force-logout',
];

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
            'smart_quarterly', 'smart_yearly',
            'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime', 'pro'
        ].includes(planKey) && isActive,
        isLifetimeMember: planKey === 'pro_lifetime' && isActive,
        limits,
        isSubscriptionActive: (planKey === 'free' || planKey === 'starter_monthly') ? true : isActive,
        expiresAt: data.subscription?.endDate
            ? new Date(data.subscription.endDate)
            : null,
    };
}

export function useMembership(): UseMembershipReturn {
    const { data: session, status: sessionStatus } = useSession();
    const pathname = usePathname();
    const hasSession = !!session?.user?.id;

    const isPublicRoute = pathname
        ? publicRoutes.some((route) => pathname === route || pathname.startsWith(route))
        : false;

    const {
        data: membership = null,
        isPending,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: ['user', 'usage-limits', session?.user?.id],
        queryFn: fetchMembershipInfo,
        enabled: sessionStatus === 'authenticated' && hasSession && !isPublicRoute,
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const canAccess = useCallback((feature: MembershipFeature): boolean => {
        if (!membership) return false;
        const limits = membership.limits;

        switch (feature) {
            case 'journeyCVs':
                return limits.journeyCVs !== 0;
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
                return limits.jobParsing;
            case 'prioritySupport':
                return limits.prioritySupport;
            case 'advancedAnalytics':
                return limits.advancedAnalytics;
            case 'careerVault':
                return limits.hasVault || false;
            case 'unlimitedJobs':
                return limits.maxJobs === -1;
            case 'linkedinToneChange':
                return limits.linkedinToneChange;
            case 'linkedinCVSelection':
                return limits.linkedinCVSelection;
            default:
                return false;
        }
    }, [membership]);

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

    const isPaidMember = useMemo(() => {
        return membership?.isProMember || false;
    }, [membership]);

    return {
        membership,
        loading: sessionStatus === 'loading' || (hasSession && isPending && !isPublicRoute),
        error: queryError instanceof Error ? queryError.message : null,
        canAccess,
        getLockedReason,
        isPaidMember,
        refreshMembership: async () => {
            await refetch();
        },
    };
}

export function isProPlan(planKey: string): boolean {
    return [
        'focused_monthly', 'focused_yearly',
        'smart_quarterly', 'smart_yearly',
        'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime', 'pro'
    ].includes(planKey);
}

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
