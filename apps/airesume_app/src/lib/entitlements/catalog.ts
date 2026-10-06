/**
 * catalog.ts — Customer-facing feature catalogue.
 *
 * This maps internal FeatureKeys to what the USER sees:
 *   - Customer-facing name
 * - Short description (for tooltips, badges)
 *   - Category grouping
 *   - Limit key (for usage meters)
 *   - Required plan label (for upgrade prompts)
 *
 * RULES:
 *   - NEVER show internal keys like "build.ai_surgeon.full" to users
 *   - NEVER use "Pro" — use "Focused" for paid plan
 *   - NEVER use "CV" — use "Resume" for customer-facing text
 *   - All templates are free (no "premium templates" distinction)
 */

import { FeatureKey } from './features';
import { LimitKey } from './limits';
import { PlanKey } from './plans';

// ─── Catalog Entry ───────────────────────────────────────────────────────────

export interface CatalogFeature {
  /** Internal feature key */
  key: FeatureKey;
  /** Customer-facing display name */
  name: string;
  /** Short description for tooltips, badges, empty states */
  description: string;
  /** Category for grouping in UI */
  category: 'build' | 'match' | 'tailor' | 'apply' | 'track' | 'learn' | 'support';
  /** Whether this feature should show a usage meter */
  hasUsageMeter: boolean;
  /** Which limit key drives the usage meter (if any) */
  limitKey?: LimitKey;
  /** Plan required label — what to show in upgrade prompts */
  requiredPlan: PlanKey;
  /** Badge text for marketing / sidebar */
  badge?: string;
  /** Icon hint for components that render feature icons */
  icon?: string;
}

// ─── Feature Catalogue ───────────────────────────────────────────────────────

export const FEATURE_CATALOG: Record<FeatureKey, CatalogFeature> = {
  // ─── BUILD ───────────────────────────────────────────────────────────────
  'build.cv': {
    key: 'build.cv',
    name: 'Resume Builder',
    description: 'Create professional resumes with AI assistance',
    category: 'build',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'FileText',
  },
  'build.templates.free': {
    key: 'build.templates.free',
    name: 'Templates',
    description: 'Choose from multiple professional resume layouts',
    category: 'build',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'Layout',
  },
  'build.templates.premium': {
    key: 'build.templates.premium',
    name: 'Templates',
    description: 'All templates — every layout is included',
    category: 'build',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'Layout',
  },
  'build.ai_surgeon.spelling': {
    key: 'build.ai_surgeon.spelling',
    name: 'Spelling Check',
    description: 'AI-powered spelling and grammar correction',
    category: 'build',
    hasUsageMeter: true,
    limitKey: 'ai_surgeon_runs_monthly',
    requiredPlan: 'free',
    icon: 'SpellCheck',
  },
  'build.ai_surgeon.full': {
    key: 'build.ai_surgeon.full',
    name: 'Improve with AI',
    description: 'Full AI resume improvement — phrasing, impact, and optimization',
    category: 'build',
    hasUsageMeter: true,
    limitKey: 'ai_surgeon_runs_monthly',
    requiredPlan: 'starter',
    badge: 'AI',
    icon: 'Sparkles',
  },
  'build.cover_letter_ai': {
    key: 'build.cover_letter_ai',
    name: 'Cover Letter AI',
    description: 'Generate tailored cover letters with AI',
    category: 'build',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'Mail',
  },
  'build.export.pdf': {
    key: 'build.export.pdf',
    name: 'PDF Export',
    description: 'Download your resume as a PDF',
    category: 'build',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'Download',
  },
  'build.export.docx': {
    key: 'build.export.docx',
    name: 'DOCX Export',
    description: 'Download your resume as an editable Word document',
    category: 'build',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'Download',
  },

  // ─── MATCH ───────────────────────────────────────────────────────────────
  'match.job_discovery': {
    key: 'match.job_discovery',
    name: 'Job Discovery',
    description: 'AI-powered job search across multiple sources',
    category: 'match',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'Search',
  },
  'match.job_parsing': {
    key: 'match.job_parsing',
    name: 'Job Import',
    description: 'Import jobs from URLs, LinkedIn, or job boards',
    category: 'match',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'Import',
  },
  'match.job_tracker': {
    key: 'match.job_tracker',
    name: 'Job Tracker',
    description: 'Track your job applications from discovery to offer',
    category: 'match',
    hasUsageMeter: true,
    limitKey: 'active_jobs',
    requiredPlan: 'starter',
    icon: 'Kanban',
  },
  'match.journey_cv': {
    key: 'match.journey_cv',
    name: 'Tailored Resumes',
    description: 'Create job-specific resumes linked to applications',
    category: 'match',
    hasUsageMeter: true,
    limitKey: 'journey_cvs',
    requiredPlan: 'starter',
    badge: 'AI',
    icon: 'Target',
  },

  // ─── TAILOR ──────────────────────────────────────────────────────────────
  'tailor.resume': {
    key: 'tailor.resume',
    name: 'Resume Tailoring',
    description: 'AI tailors your resume to match job requirements',
    category: 'tailor',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'Wand',
  },
  'tailor.ats_check': {
    key: 'tailor.ats_check',
    name: 'ATS Score',
    description: 'Check how your resume performs against ATS filters',
    category: 'tailor',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'BarChart',
  },
  'tailor.linkedin_tone': {
    key: 'tailor.linkedin_tone',
    name: 'LinkedIn Enhancer',
    description: 'Rewrite your resume in LinkedIn-friendly tone and structure',
    category: 'tailor',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    badge: 'NEW',
    icon: 'Linkedin',
  },
  'tailor.linkedin_cv': {
    key: 'tailor.linkedin_cv',
    name: 'LinkedIn Resume Select',
    description: 'Choose which resume to enhance for LinkedIn',
    category: 'tailor',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    icon: 'Linkedin',
  },

  // ─── APPLY ───────────────────────────────────────────────────────────────
  'apply.manual': {
    key: 'apply.manual',
    name: 'Manual Application',
    description: 'Apply to jobs manually with one-click assistance',
    category: 'apply',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'MousePointer',
  },
  'apply.auto': {
    key: 'apply.auto',
    name: 'Auto-Apply',
    description: 'AI automatically submits applications on your behalf',
    category: 'apply',
    hasUsageMeter: true,
    limitKey: 'auto_apply_daily',
    requiredPlan: 'starter',
    badge: 'AUTO',
    icon: 'Zap',
  },
  'apply.greenhouse': {
    key: 'apply.greenhouse',
    name: 'Greenhouse Applications',
    description: 'Auto-apply to Greenhouse-powered job boards',
    category: 'apply',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'Building',
  },
  'apply.lever': {
    key: 'apply.lever',
    name: 'Lever Applications',
    description: 'Auto-apply to Lever-powered job boards',
    category: 'apply',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'Building',
  },
  'apply.ashby': {
    key: 'apply.ashby',
    name: 'Ashby Applications',
    description: 'Auto-apply to Ashby-powered job boards',
    category: 'apply',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'Building',
  },
  'apply.workday': {
    key: 'apply.workday',
    name: 'Workday Applications',
    description: 'Auto-apply to Workday-powered job boards',
    category: 'apply',
    hasUsageMeter: false,
    requiredPlan: 'starter',
    icon: 'Building',
  },

  // ─── TRACK ───────────────────────────────────────────────────────────────
  'track.applications': {
    key: 'track.applications',
    name: 'Application Tracking',
    description: 'Monitor your application pipeline and status',
    category: 'track',
    hasUsageMeter: false,
    requiredPlan: 'free',
    icon: 'List',
  },
  'track.analytics': {
    key: 'track.analytics',
    name: 'Job Search Insights',
    description: 'Analytics on your application performance and outcomes',
    category: 'track',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    badge: 'NEW',
    icon: 'PieChart',
  },
  'track.interview_coach': {
    key: 'track.interview_coach',
    name: 'Interview Prep',
    description: 'AI-powered interview practice with role-specific questions',
    category: 'track',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    badge: 'NEW',
    icon: 'Mic',
  },

  // ─── LEARN ───────────────────────────────────────────────────────────────
  'learn.outcome_learning': {
    key: 'learn.outcome_learning',
    name: 'Job Search Insights',
    description: 'Learn which applications perform better over time',
    category: 'learn',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    icon: 'TrendingUp',
  },
  'learn.advanced_analytics': {
    key: 'learn.advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Deep analytics on resume performance and application outcomes',
    category: 'learn',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    icon: 'BarChart',
  },

  // ─── SUPPORT ─────────────────────────────────────────────────────────────
  'meta.priority_support': {
    key: 'meta.priority_support',
    name: 'Priority Support',
    description: 'Fast-tracked customer support for your account',
    category: 'support',
    hasUsageMeter: false,
    requiredPlan: 'focused',
    icon: 'Headphones',
  },
};

// ─── Catalog Helpers ─────────────────────────────────────────────────────────

/**
 * Get the customer-facing name for a feature key.
 * Returns a fallback name if the key is not in the catalog.
 */
export function getFeatureName(key: FeatureKey): string {
  return FEATURE_CATALOG[key]?.name ?? key.split('.').pop() ?? key;
}

/**
 * Get the customer-facing description for a feature key.
 */
export function getFeatureDescription(key: FeatureKey): string {
  return FEATURE_CATALOG[key]?.description ?? '';
}

/**
 * Get the catalog entry for a feature key.
 */
export function getCatalogFeature(key: FeatureKey): CatalogFeature | undefined {
  return FEATURE_CATALOG[key];
}

/**
 * Get all features for a category.
 */
export function getFeaturesByCategory(category: CatalogFeature['category']): CatalogFeature[] {
  return Object.values(FEATURE_CATALOG).filter(f => f.category === category);
}

/**
 * Get the plan label for upgrade prompts.
 * Uses customer-facing names only.
 */
export function getPlanLabel(plan: PlanKey): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'starter':
      return 'Starter';
    case 'focused':
      return 'Focused';
    default:
      return plan;
  }
}

/**
 * Get the upgrade message for a locked feature.
 * Uses customer-facing names only.
 */
export function getUpgradeMessage(key: FeatureKey, currentPlan: PlanKey): string {
  const feature = FEATURE_CATALOG[key];
  if (!feature) return 'Upgrade to access this feature.';

  if (currentPlan === 'free') {
    return `Unlock ${feature.name} with Starter.`;
  }
  if (currentPlan === 'starter' && feature.requiredPlan === 'focused') {
    return `Unlock ${feature.name} with Focused.`;
  }
  return `Upgrade to access ${feature.name}.`;
}

/**
 * Get the sidebar badge text for a feature.
 */
export function getFeatureBadge(key: FeatureKey): string | undefined {
  return FEATURE_CATALOG[key]?.badge;
}

/**
 * Get all features that have usage meters.
 */
export function getFeaturesWithUsageMeters(): CatalogFeature[] {
  return Object.values(FEATURE_CATALOG).filter(f => f.hasUsageMeter);
}

/**
 * Get features grouped by category for display.
 */
export function getCatalogByCategory(): Record<string, CatalogFeature[]> {
  const result: Record<string, CatalogFeature[]> = {};
  for (const feature of Object.values(FEATURE_CATALOG)) {
    if (!result[feature.category]) {
      result[feature.category] = [];
    }
    result[feature.category].push(feature);
  }
  return result;
}
