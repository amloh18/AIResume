/**
 * @deprecated This file is FROZEN and has zero consumers.
 * The canonical entitlement engine is at src/lib/entitlements/.
 * The frontend hook is useEntitlements() from src/lib/hooks/useEntitlements.
 * The customer-facing feature catalogue is at src/lib/entitlements/catalog.ts.
 *
 * This file is kept only for reference. Do NOT add new code here.
 */

/**
 * Unified Entitlement Service for AIResume
 *
 * SINGLE SOURCE OF TRUTH for all plan features, limits, and gating.
 * Replaces the fragmented entitlement checks across:
 *   - subscription-helpers.ts (PLAN_LIMITS)
 *   - entitlement-service.ts (application/auto_apply only)
 *   - creditService.ts (job/ai credits)
 *   - automation-schema.ts TIER_LIMITS
 */

import { PlanKey } from './stripe-price-map';

// ─── Feature Definitions ─────────────────────────────────────────────────────

export type Feature =
  // BUILD
  | 'standalone_cv'
  | 'premium_templates'
  | 'ai_surgeon_spelling'
  | 'ai_surgeon_full'
  | 'cover_letter_ai'
  | 'docx_export'
  | 'pdf_download'
  // MATCH
  | 'job_discovery'
  | 'job_parsing'
  | 'job_tracker'
  | 'journey_cvs'
  // TAILOR
  | 'resume_tailoring'
  | 'ats_check'
  | 'linkedin_tone_change'
  | 'linkedin_cv_selection'
  // APPLY
  | 'manual_apply'
  | 'auto_apply'
  // TRACK
  | 'application_tracking'
  | 'application_analytics'
  | 'interview_coach'
  | 'priority_support'
  // LEARN
  | 'outcome_learning'
  | 'advanced_analytics';

// ─── Feature Categories (for UI grouping) ────────────────────────────────────

export const FEATURE_CATEGORIES = {
  build: {
    label: 'Build',
    features: ['standalone_cv', 'premium_templates', 'ai_surgeon_spelling', 'ai_surgeon_full', 'cover_letter_ai', 'docx_export', 'pdf_download'] as Feature[],
  },
  match: {
    label: 'Match',
    features: ['job_discovery', 'job_parsing', 'job_tracker', 'journey_cvs'] as Feature[],
  },
  tailor: {
    label: 'Tailor',
    features: ['resume_tailoring', 'ats_check', 'linkedin_tone_change', 'linkedin_cv_selection'] as Feature[],
  },
  apply: {
    label: 'Apply',
    features: ['manual_apply', 'auto_apply'] as Feature[],
  },
  track: {
    label: 'Track',
    features: ['application_tracking', 'application_analytics', 'interview_coach', 'priority_support'] as Feature[],
  },
  learn: {
    label: 'Learn',
    features: ['outcome_learning', 'advanced_analytics'] as Feature[],
  },
} as const;

// ─── Plan Limits ─────────────────────────────────────────────────────────────

export interface PlanEntitlements {
  // Feature access (boolean)
  features: Record<Feature, boolean>;
  // Numeric limits (-1 = unlimited)
  limits: {
    journeyCVs: number;
    aiSurgeonRunsPerMonth: number;
    jobTrackerJobs: number;
    autoApplyPerDay: number;
    autoApplyPerMonth: number;
    applicationsPerMonth: number;
    jobCreditsPerMonth: number;
    aiCreditsPerMonth: number;
  };
  // AI surgeon mode restriction
  aiSurgeonMode: 'spelling_only' | 'full';
}

const ENT: Record<string, PlanEntitlements> = {
  // ─── Free ──────────────────────────────────────────────────────────────────
  free: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: false,
      cover_letter_ai: false,
      docx_export: false,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: false,
      linkedin_cv_selection: false,
      manual_apply: true,
      auto_apply: false,
      application_tracking: true,
      application_analytics: false,
      interview_coach: false,
      priority_support: false,
      outcome_learning: false,
      advanced_analytics: false,
    },
    limits: {
      journeyCVs: 3,
      aiSurgeonRunsPerMonth: 10,
      jobTrackerJobs: 3,
      autoApplyPerDay: 0,
      autoApplyPerMonth: 0,
      applicationsPerMonth: 0,
      jobCreditsPerMonth: 10,
      aiCreditsPerMonth: 10,
    },
    aiSurgeonMode: 'spelling_only',
  },

  // ─── Starter Monthly ───────────────────────────────────────────────────────
  // NOTE: starter_monthly is a PAID plan. It is NOT the free tier.
  // During the launch trial (through Dec 31 2026), it is free via trial_end.
  starter_monthly: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: true,
      cover_letter_ai: true,
      docx_export: true,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: false,
      linkedin_cv_selection: false,
      manual_apply: true,
      auto_apply: true,
      application_tracking: true,
      application_analytics: false,
      interview_coach: false,
      priority_support: false,
      outcome_learning: false,
      advanced_analytics: false,
    },
    limits: {
      journeyCVs: 10,
      aiSurgeonRunsPerMonth: -1,
      jobTrackerJobs: 10,
      autoApplyPerDay: 10,
      autoApplyPerMonth: 10,
      applicationsPerMonth: 10,
      jobCreditsPerMonth: -1,
      aiCreditsPerMonth: -1,
    },
    aiSurgeonMode: 'full',
  },

  // ─── Starter Yearly ────────────────────────────────────────────────────────
  starter_yearly: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: true,
      cover_letter_ai: true,
      docx_export: true,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: false,
      linkedin_cv_selection: false,
      manual_apply: true,
      auto_apply: true,
      application_tracking: true,
      application_analytics: false,
      interview_coach: false,
      priority_support: false,
      outcome_learning: false,
      advanced_analytics: false,
    },
    limits: {
      journeyCVs: 10,
      aiSurgeonRunsPerMonth: -1,
      jobTrackerJobs: 10,
      autoApplyPerDay: 10,
      autoApplyPerMonth: 10,
      applicationsPerMonth: 10,
      jobCreditsPerMonth: -1,
      aiCreditsPerMonth: -1,
    },
    aiSurgeonMode: 'full',
  },

  // ─── Focused Monthly ───────────────────────────────────────────────────────
  focused_monthly: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: true,
      cover_letter_ai: true,
      docx_export: true,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: true,
      linkedin_cv_selection: true,
      manual_apply: true,
      auto_apply: true,
      application_tracking: true,
      application_analytics: true,
      interview_coach: true,
      priority_support: true,
      outcome_learning: true,
      advanced_analytics: true,
    },
    limits: {
      journeyCVs: -1,
      aiSurgeonRunsPerMonth: -1,
      jobTrackerJobs: -1,
      autoApplyPerDay: 50,
      autoApplyPerMonth: -1,
      applicationsPerMonth: -1,
      jobCreditsPerMonth: -1,
      aiCreditsPerMonth: -1,
    },
    aiSurgeonMode: 'full',
  },

  // ─── Focused Yearly ────────────────────────────────────────────────────────
  focused_yearly: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: true,
      cover_letter_ai: true,
      docx_export: true,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: true,
      linkedin_cv_selection: true,
      manual_apply: true,
      auto_apply: true,
      application_tracking: true,
      application_analytics: true,
      interview_coach: true,
      priority_support: true,
      outcome_learning: true,
      advanced_analytics: true,
    },
    limits: {
      journeyCVs: -1,
      aiSurgeonRunsPerMonth: -1,
      jobTrackerJobs: -1,
      autoApplyPerDay: 50,
      autoApplyPerMonth: -1,
      applicationsPerMonth: -1,
      jobCreditsPerMonth: -1,
      aiCreditsPerMonth: -1,
    },
    aiSurgeonMode: 'full',
  },

  // ─── Focused Quarterly ─────────────────────────────────────────────────────
  focused_quarterly: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: true,
      cover_letter_ai: true,
      docx_export: true,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: true,
      linkedin_cv_selection: true,
      manual_apply: true,
      auto_apply: true,
      application_tracking: true,
      application_analytics: true,
      interview_coach: true,
      priority_support: true,
      outcome_learning: true,
      advanced_analytics: true,
    },
    limits: {
      journeyCVs: -1,
      aiSurgeonRunsPerMonth: -1,
      jobTrackerJobs: -1,
      autoApplyPerDay: 50,
      autoApplyPerMonth: -1,
      applicationsPerMonth: -1,
      jobCreditsPerMonth: -1,
      aiCreditsPerMonth: -1,
    },
    aiSurgeonMode: 'full',
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    features: {
      standalone_cv: true,
      premium_templates: true,
      ai_surgeon_spelling: true,
      ai_surgeon_full: true,
      cover_letter_ai: true,
      docx_export: true,
      pdf_download: true,
      job_discovery: true,
      job_parsing: true,
      job_tracker: true,
      journey_cvs: true,
      resume_tailoring: true,
      ats_check: true,
      linkedin_tone_change: true,
      linkedin_cv_selection: true,
      manual_apply: true,
      auto_apply: true,
      application_tracking: true,
      application_analytics: true,
      interview_coach: true,
      priority_support: true,
      outcome_learning: true,
      advanced_analytics: true,
    },
    limits: {
      journeyCVs: -1,
      aiSurgeonRunsPerMonth: -1,
      jobTrackerJobs: -1,
      autoApplyPerDay: 500,
      autoApplyPerMonth: -1,
      applicationsPerMonth: -1,
      jobCreditsPerMonth: -1,
      aiCreditsPerMonth: -1,
    },
    aiSurgeonMode: 'full',
  },
};

// ─── Entitlement Resolution ──────────────────────────────────────────────────

/**
 * Resolve the canonical plan key from the user's stored plan key.
 * Maps legacy/variant keys to canonical plan keys.
 * starter_monthly is NOT free — it is a paid plan.
 */
export function resolvePlanKey(storedPlanKey: string): string {
  const key = storedPlanKey.toLowerCase();
  if (key.includes('admin')) return 'admin';
  if (key.includes('focused')) {
    if (key.includes('quarterly')) return 'focused_quarterly';
    if (key.includes('yearly')) return 'focused_yearly';
    return 'focused_monthly';
  }
  if (key.includes('starter')) {
    if (key.includes('yearly')) return 'starter_yearly';
    return 'starter_monthly';
  }
  if (key === 'free') return 'free';
  return 'free';
}

/**
 * Check if a plan key is the free tier.
 * starter_monthly is NOT free — it is a paid plan (may have launch trial).
 */
export function isFreePlan(planKey: string): boolean {
  return resolvePlanKey(planKey) === 'free';
}

/**
 * Check if a plan is a paid (non-free, non-admin) plan.
 */
export function isPaidPlan(planKey: string): boolean {
  const resolved = resolvePlanKey(planKey);
  return resolved !== 'free' && resolved !== 'admin';
}

/**
 * Check if a plan has unlimited auto-apply (Focused or Admin).
 */
export function hasUnlimitedAutoApply(planKey: string): boolean {
  const resolved = resolvePlanKey(planKey);
  return resolved === 'focused_monthly' || resolved === 'focused_yearly' || resolved === 'focused_quarterly' || resolved === 'admin';
}

/**
 * Get the entitlements for a plan key.
 */
export function getPlanEntitlements(planKey: string): PlanEntitlements {
  const resolved = resolvePlanKey(planKey);
  return ENT[resolved] || ENT.free;
}

/**
 * Check if a specific feature is available for a plan.
 */
export function hasFeature(planKey: string, feature: Feature): boolean {
  const entitlements = getPlanEntitlements(planKey);
  return entitlements.features[feature] ?? false;
}

/**
 * Get the numeric limit for a resource on a plan.
 * Returns -1 for unlimited.
 */
export function getLimit(planKey: string, limitKey: keyof PlanEntitlements['limits']): number {
  const entitlements = getPlanEntitlements(planKey);
  return entitlements.limits[limitKey] ?? 0;
}

/**
 * Check if a user can perform an action given their plan and current usage.
 */
export function canPerformAction(
  planKey: string,
  limitKey: keyof PlanEntitlements['limits'],
  currentUsage: number
): { allowed: boolean; remaining: number | null; limit: number } {
  const limit = getLimit(planKey, limitKey);
  if (limit === -1) {
    return { allowed: true, remaining: null, limit: -1 };
  }
  const remaining = Math.max(0, limit - currentUsage);
  return { allowed: remaining > 0, remaining, limit };
}

/**
 * Get all features grouped by category for a plan (for pricing page).
 */
export function getPlanFeaturesByCategory(planKey: string) {
  const entitlements = getPlanEntitlements(planKey);
  const result: Record<string, { feature: Feature; included: boolean }[]> = {};

  for (const [category, { features }] of Object.entries(FEATURE_CATEGORIES)) {
    result[category] = features.map((f) => ({
      feature: f,
      included: entitlements.features[f] ?? false,
    }));
  }

  return result;
}

/**
 * Map our internal plan keys to the User.subscription.planKey format.
 * This bridges the billing system to the User model.
 */
export function toUserPlanKey(plan: string, interval: string): string {
  if (plan === 'free') return 'free';
  return `${plan}_${interval}`;
}

/**
 * Parse a User.subscription.planKey back to plan + interval.
 */
export function parseUserPlanKey(userPlanKey: string): { plan: string; interval: string } {
  const resolved = resolvePlanKey(userPlanKey);
  if (resolved === 'free' || resolved === 'admin') {
    return { plan: resolved, interval: 'monthly' };
  }
  const parts = resolved.split('_');
  const interval = parts.pop() || 'monthly';
  const plan = parts.join('_');
  return { plan, interval };
}
