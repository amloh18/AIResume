'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
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
    smart_quarterly: 'Smart Quarterly',
    smart_yearly: 'Smart Yearly',
    pro_monthly: 'Pro Monthly',
    pro_quarterly: 'Pro Quarterly',
    pro_yearly: 'Pro Yearly',
    pro_lifetime: 'Pro Lifetime',
    pro: 'Pro',
};

/**
 * Hook to check user's membership status and feature access
 * Replaces the legacy credit system with membership-based feature locking
 */
export function useMembership(): UseMembershipReturn {
    const { data: session, status: sessionStatus } = useSession();
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch membership info from API
     */
    const fetchMembership = useCallback(async () => {
        if (sessionStatus === 'loading') {
            return; // Wait for session to load
        }

        if (!session?.user?.id) {
            setMembership(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/user/usage-limits');

            if (!response.ok) {
                console.warn('Failed to fetch membership info, using default values');
                // Default to free plan
                setMembership({
                    planKey: 'free',
                    planName: 'Free',
                    isFreePlan: true,
                    isProMember: false,
                    isLifetimeMember: false,
                    limits: PLAN_LIMITS.free,
                    isSubscriptionActive: true,
                    expiresAt: null,
                });
                setLoading(false);
                return;
            }

            const data = await response.json();

            if (data.success) {
                const planKey = data.subscription?.planKey || 'free';
                const limits = getPlanLimits(planKey);
                const isActive = data.subscription?.status === 'active' || planKey === 'free';

                setMembership({
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
                    // Free tier (free + starter_monthly) is always active — no subscription expiry
                    isSubscriptionActive: (planKey === 'free' || planKey === 'starter_monthly') ? true : isActive,
                    expiresAt: data.subscription?.endDate
                            ? new Date(data.subscription.endDate)
                            : null,
                });
            } else {
                // Default to free plan
                setMembership({
                    planKey: 'free',
                    planName: 'Free',
                    isFreePlan: true,
                    isProMember: false,
                    isLifetimeMember: false,
                    limits: PLAN_LIMITS.free,
                    isSubscriptionActive: true,
                    expiresAt: null,
                });
            }
        } catch (err: any) {
            console.error('Error fetching membership:', err);
            setError(err.message || 'Failed to fetch membership info');

            // Default to free plan on error
            setMembership({
                planKey: 'free',
                planName: 'Free',
                isFreePlan: true,
                isProMember: false,
                isLifetimeMember: false,
                limits: PLAN_LIMITS.free,
                isSubscriptionActive: true,
                expiresAt: null,
            });
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, sessionStatus]);

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

    // Initial fetch
    useEffect(() => {
        fetchMembership();
    }, [fetchMembership]);

    return {
        membership,
        loading,
        error,
        canAccess,
        getLockedReason,
        isPaidMember,
        refreshMembership: fetchMembership,
    };
}

/**
 * Helper to check if a subscription plan is a pro plan
 */
export function isProPlan(planKey: string): boolean {
    return [
        'focused_monthly', 'focused_yearly',
        'smart_quarterly', 'smart_yearly',
        'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime', 'pro'
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
