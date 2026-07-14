/**
 * plan-access.ts
 * Centralized server-side plan access checker.
 *
 * Usage in any API route:
 *   const access = await getPlanAccess(user);
 *   if (!access.can('coverLetterAI')) return planGateResponse('coverLetterAI');
 */

import { getPlanLimits, PlanLimits } from '@/lib/utils/subscription-helpers';
import { NextResponse } from 'next/server';

/** All feature keys that can be checked. Maps to fields in PlanLimits. */
export type FeatureKey =
  | 'coverLetterAI'
  | 'docxExport'
  | 'interviewCoach'
  | 'jobTracker'
  | 'jobParsing'
  | 'premiumTemplates'
  | 'aiSurgeonFull'
  | 'linkedinEnhancer'
  | 'linkedinToneChange'
  | 'linkedinCVSelection'
  | 'autoApplyBot'
  | 'advancedAnalytics'
  | 'prioritySupport'
  | 'careerVault'
  | 'standaloneCVs'
  | 'moriChat';          // unlimited Mori chat (false = 5-message cap)

/** Minimum plan required for each feature (for error messaging). */
const FEATURE_REQUIRED_PLAN: Record<FeatureKey, string> = {
  coverLetterAI: 'starter_yearly',
  docxExport: 'starter_yearly',
  interviewCoach: 'focused_monthly',
  jobTracker: 'focused_monthly',
  jobParsing: 'focused_monthly',
  premiumTemplates: 'starter_monthly',
  aiSurgeonFull: 'starter_yearly',
  linkedinEnhancer: 'focused_monthly',
  linkedinToneChange: 'focused_monthly',
  linkedinCVSelection: 'focused_monthly',
  autoApplyBot: 'smart_quarterly',
  advancedAnalytics: 'focused_monthly',
  prioritySupport: 'focused_monthly',
  careerVault: 'pro_monthly',
  standaloneCVs: 'starter_monthly',
  moriChat: 'focused_monthly',       // unlimited requires focused_monthly+
};

const FEATURE_HUMAN_NAME: Record<FeatureKey, string> = {
  coverLetterAI: 'Cover Letter AI',
  docxExport: 'DOCX Export',
  interviewCoach: 'Interview Coach',
  jobTracker: 'Job Tracker',
  jobParsing: 'Job Parsing',
  premiumTemplates: 'Premium Templates',
  aiSurgeonFull: 'Full AI Rewrite',
  linkedinEnhancer: 'LinkedIn Enhancer',
  linkedinToneChange: 'LinkedIn Tone Customization',
  linkedinCVSelection: 'LinkedIn CV Selection',
  autoApplyBot: 'Auto Apply Bot',
  advancedAnalytics: 'Advanced Analytics',
  prioritySupport: 'Priority Support',
  careerVault: 'Career Vault',
  standaloneCVs: 'Standalone CVs',
  moriChat: 'Unlimited Mori AI Chat',
};

export interface PlanAccessResult {
  planKey: string;
  limits: PlanLimits;
  isActive: boolean;
  /** Check if the user's current plan allows a feature. */
  can: (feature: FeatureKey) => boolean;
  /** Returns a 403 NextResponse with structured error payload if feature is denied. */
  gate: (feature: FeatureKey) => NextResponse | null;
}

/**
 * Derives the effective plan key from a user document.
 * Falls back to 'starter_monthly' (the free tier) — we do not use a standalone 'free' key.
 */
export function getEffectivePlanKey(user: any): string {
  if (!user) return 'starter_monthly';

  const sub = user.subscription;

  // No subscription or explicitly cancelled
  if (!sub || sub.status === 'inactive' || sub.status === 'cancelled') {
    return 'starter_monthly';
  }

  if (sub.status === 'expired') {
    return 'starter_monthly';
  }

  // Check time-based expiry for non-lifetime plans
  const planKey: string = user.currentPlanKey || 'starter_monthly';
  if (planKey !== 'pro_lifetime') {
    const expiresAt = sub.accessExpiresAt || sub.currentPeriodEnd || sub.endDate;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return 'starter_monthly';
    }
  }

  return planKey;
}

/**
 * Build a PlanAccessResult for an already-fetched user document.
 * Does NOT make any DB calls — pass in the user you already loaded.
 */
export function getPlanAccess(user: any): PlanAccessResult {
  const planKey = getEffectivePlanKey(user);
  const limits = getPlanLimits(planKey);
  const isActive =
    planKey === 'free' ||
    (user?.subscription?.status === 'active');

  function can(feature: FeatureKey): boolean {
    switch (feature) {
      case 'coverLetterAI':    return limits.coverLetterAI;
      case 'docxExport':       return limits.docxExport;
      case 'interviewCoach':   return limits.interviewCoach;
      case 'jobTracker':       return limits.jobTracker;
      case 'jobParsing':       return limits.jobParsing;
      case 'premiumTemplates': return limits.premiumTemplates;
      case 'aiSurgeonFull':    return limits.aiSurgeonMode === 'full';
      case 'linkedinEnhancer': return limits.linkedinEnhancer ?? false;
      case 'linkedinToneChange':  return limits.linkedinToneChange;
      case 'linkedinCVSelection': return limits.linkedinCVSelection;
      case 'autoApplyBot':     return limits.autoApplyBot;
      case 'advancedAnalytics': return limits.advancedAnalytics;
      case 'prioritySupport':  return limits.prioritySupport;
      case 'careerVault':      return limits.hasVault ?? false;
      case 'standaloneCVs':    return limits.standaloneCVs;
      case 'moriChat':         return limits.moriChatLimit === -1;  // true = unlimited
      default:                 return false;
    }
  }

  function gate(feature: FeatureKey): NextResponse | null {
    if (can(feature)) return null;
    return NextResponse.json(
      {
        error: 'Feature not available on your current plan',
        feature,
        featureName: FEATURE_HUMAN_NAME[feature],
        currentPlan: planKey,
        requiredPlan: FEATURE_REQUIRED_PLAN[feature],
        requiresUpgrade: true,
      },
      { status: 403 }
    );
  }

  return { planKey, limits, isActive, can, gate };
}
