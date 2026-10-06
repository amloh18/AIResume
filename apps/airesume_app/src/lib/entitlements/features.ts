/**
 * features.ts — Feature entitlement definitions.
 *
 * Features are boolean permissions: "can this user do X?"
 * They are separate from limits ("how many times?") and credits.
 *
 * Feature keys use a stable namespace that maps to the product journey:
 *   build.* → BUILD phase
 *   match.* → MATCH phase
 *   tailor.* → TAILOR phase
 *   apply.* → APPLY phase
 *   track.* → TRACK phase
 *   learn.* → LEARN phase
 */

import { PlanKey } from './plans';

// ─── Feature Key Namespace ───────────────────────────────────────────────────

export type FeatureKey =
  // BUILD
  | 'build.cv'
  | 'build.templates.free'
  | 'build.templates.premium'
  | 'build.ai_surgeon.spelling'
  | 'build.ai_surgeon.full'
  | 'build.cover_letter_ai'
  | 'build.export.pdf'
  | 'build.export.docx'

  // MATCH
  | 'match.job_discovery'
  | 'match.job_parsing'
  | 'match.job_tracker'
  | 'match.journey_cv'

  // TAILOR
  | 'tailor.resume'
  | 'tailor.ats_check'
  | 'tailor.linkedin_tone'
  | 'tailor.linkedin_cv'

  // APPLY
  | 'apply.manual'
  | 'apply.auto'
  | 'apply.greenhouse'
  | 'apply.lever'
  | 'apply.ashby'
  | 'apply.workday'

  // TRACK
  | 'track.applications'
  | 'track.analytics'
  | 'track.interview_coach'

  // LEARN
  | 'learn.outcome_learning'
  | 'learn.advanced_analytics'

  // META
  | 'meta.priority_support';

// ─── Feature Categories (for UI grouping) ────────────────────────────────────

export const FEATURE_CATEGORIES: Record<string, { label: string; features: FeatureKey[] }> = {
  build: {
    label: 'Build',
    features: [
      'build.cv', 'build.templates.free', 'build.templates.premium',
      'build.ai_surgeon.spelling', 'build.ai_surgeon.full',
      'build.cover_letter_ai', 'build.export.pdf', 'build.export.docx',
    ],
  },
  match: {
    label: 'Match',
    features: [
      'match.job_discovery', 'match.job_parsing', 'match.job_tracker', 'match.journey_cv',
    ],
  },
  tailor: {
    label: 'Tailor',
    features: [
      'tailor.resume', 'tailor.ats_check', 'tailor.linkedin_tone', 'tailor.linkedin_cv',
    ],
  },
  apply: {
    label: 'Apply',
    features: [
      'apply.manual', 'apply.auto',
      'apply.greenhouse', 'apply.lever', 'apply.ashby', 'apply.workday',
    ],
  },
  track: {
    label: 'Track',
    features: [
      'track.applications', 'track.analytics', 'track.interview_coach',
    ],
  },
  learn: {
    label: 'Learn',
    features: [
      'learn.outcome_learning', 'learn.advanced_analytics',
    ],
  },
  meta: {
    label: 'Support',
    features: ['meta.priority_support'],
  },
};

// ─── Feature → Required Plan ─────────────────────────────────────────────────
// Maps each feature to the minimum plan that includes it.
// If a feature is not listed, it requires 'focused'.

const FEATURE_REQUIRED_PLAN: Record<FeatureKey, PlanKey> = {
  // BUILD — all plans
  'build.cv': 'free',
  'build.templates.free': 'free',
  'build.templates.premium': 'free',
  'build.ai_surgeon.spelling': 'free',
  'build.export.pdf': 'free',

  // BUILD — starter+
  'build.ai_surgeon.full': 'starter',
  'build.cover_letter_ai': 'starter',
  'build.export.docx': 'starter',

  // MATCH — all plans
  'match.job_discovery': 'free',
  'match.job_parsing': 'free',

  // MATCH — starter+
  'match.job_tracker': 'starter',
  'match.journey_cv': 'starter',

  // TAILOR — all plans
  'tailor.resume': 'free',
  'tailor.ats_check': 'free',

  // TAILOR — focused
  'tailor.linkedin_tone': 'focused',
  'tailor.linkedin_cv': 'focused',

  // APPLY — starter+
  'apply.manual': 'starter',
  'apply.auto': 'starter',
  'apply.greenhouse': 'starter',
  'apply.lever': 'starter',
  'apply.ashby': 'starter',
  'apply.workday': 'starter',

  // TRACK — all plans
  'track.applications': 'free',

  // TRACK — focused
  'track.analytics': 'focused',
  'track.interview_coach': 'focused',

  // LEARN — focused
  'learn.outcome_learning': 'focused',
  'learn.advanced_analytics': 'focused',

  // META — focused
  'meta.priority_support': 'focused',
};

// ─── Plan Hierarchy (for comparison) ─────────────────────────────────────────

const PLAN_HIERARCHY: Record<PlanKey, number> = {
  free: 0,
  starter: 1,
  focused: 2,
};

/**
 * Check if a plan meets or exceeds the required plan for a feature.
 */
export function planMeetsRequirement(plan: PlanKey, required: PlanKey): boolean {
  return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[required];
}

/**
 * Get the minimum plan required for a feature.
 */
export function getRequiredPlan(feature: FeatureKey): PlanKey {
  return FEATURE_REQUIRED_PLAN[feature] ?? 'focused';
}

/**
 * Check if a plan includes a specific feature.
 */
export function planIncludesFeature(plan: PlanKey, feature: FeatureKey): boolean {
  const required = FEATURE_REQUIRED_PLAN[feature] ?? 'focused';
  return planMeetsRequirement(plan, required);
}

/**
 * Get all features available for a plan.
 */
export function getPlanFeatures(plan: PlanKey): FeatureKey[] {
  return (Object.keys(FEATURE_REQUIRED_PLAN) as FeatureKey[]).filter(
    (f) => planIncludesFeature(plan, f)
  );
}

/**
 * Get features NOT available for a plan (locked features).
 */
export function getLockedFeatures(plan: PlanKey): FeatureKey[] {
  return (Object.keys(FEATURE_REQUIRED_PLAN) as FeatureKey[]).filter(
    (f) => !planIncludesFeature(plan, f)
  );
}

/**
 * Get the upgrade message for a locked feature.
 */
export function getFeatureUpgradeMessage(feature: FeatureKey, currentPlan: PlanKey): string {
  const required = getRequiredPlan(feature);
  if (planMeetsRequirement(currentPlan, required)) {
    return ''; // Feature is not locked
  }

  const featureLabel = feature.split('.').map(s =>
    s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  ).join(' > ');

  const planLabel = required.charAt(0).toUpperCase() + required.slice(1);

  return `${featureLabel} is included with ${planLabel}.`;
}
