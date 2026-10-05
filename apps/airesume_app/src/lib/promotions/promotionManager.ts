import { PROMOTION_TYPES, type PromotionContext } from './promotionTypes';
import type { PromotionConfig } from '@/contexts/FeaturePromotionContext';

interface PromotionManagerOptions {
  contexts: PromotionContext[];
  cvId?: string;
  jobId?: string;
  journeyId?: string;
  coverLetterId?: string;
  hasCoverLetter?: boolean;
  hasCV?: boolean;
  hasJobs?: boolean;
  isPaidUser?: boolean;
  isDismissed: (promotionId: string) => boolean;
  canShowPromotion: () => boolean;
  isPromotionOnCooldown: (promotionId: string, cooldownDays?: number) => boolean;
}

/**
 * Selects the most appropriate promotion based on context, priority, and availability
 */
export function selectPromotion(options: PromotionManagerOptions): PromotionConfig | null {
  const {
    contexts,
    cvId,
    jobId,
    journeyId,
    coverLetterId,
    hasCoverLetter = false,
    hasCV = false,
    hasJobs = false,
    isPaidUser = false,
    isDismissed,
    canShowPromotion,
    isPromotionOnCooldown,
  } = options;

  // Check cooldown
  if (!canShowPromotion()) {
    return null;
  }

  // Filter promotions by context
  const contextMatches = PROMOTION_TYPES.filter((promotion) => {
    return promotion.contexts.some((ctx) => (contexts as any[]).includes(ctx));
  });

  if (contextMatches.length === 0) {
    return null;
  }

  // Filter out dismissed or on-cooldown promotions
  const availablePromotions = contextMatches.filter((promotion) => {
    return !isDismissed(promotion.id) && !isPromotionOnCooldown(promotion.id, promotion.cooldownDays);
  });

  if (availablePromotions.length === 0) {
    return null;
  }

  // Apply context-specific logic
  const eligiblePromotions = availablePromotions.filter((promotion) => {
    switch (promotion.id) {
      case 'cover-letter-cv-editing':
        // Show if editing CV with job but no cover letter
        return cvId && (jobId || journeyId) && !hasCoverLetter;
      
      case 'cover-letter-cv-viewing':
        // Show if viewing CV without cover letter
        return cvId && !hasCoverLetter;
      
      case 'ats-analysis-job':
        // Show if viewing job without ATS analysis
        return jobId && cvId;
      
      case 'cv-creation-no-cv':
        // Show if has jobs but no CV
        return hasJobs && !hasCV;
      
      case 'upgrade-credit-low':
      case 'upgrade-credit-exhausted':
        // Only show for free users, not paid users
        return !isPaidUser;
      
      case 'upgrade-free-user':
        // Show for free users only outside the dashboard page
        if (contexts.includes('dashboard')) return false;
        return !isPaidUser;
      
      case 'job-tracking-no-jobs':
        // Show if has CV but no jobs
        return hasCV && !hasJobs;
      
      default:
        return true;
    }
  });

  if (eligiblePromotions.length === 0) {
    return null;
  }

  // Sort by priority (higher is better) and select the top one
  eligiblePromotions.sort((a, b) => b.priority - a.priority);
  const selectedPromotion = { ...eligiblePromotions[0] };

  // Dynamically set CTA route based on context
  selectedPromotion.ctaRoute = buildCTARoute(selectedPromotion, {
    cvId,
    jobId,
    journeyId,
    coverLetterId,
  });

  return selectedPromotion;
}

/**
 * Builds the CTA route dynamically based on promotion type and context
 */
function buildCTARoute(
  promotion: PromotionConfig,
  context: {
    cvId?: string;
    jobId?: string;
    journeyId?: string;
    coverLetterId?: string;
  }
): string {
  const { cvId, jobId, journeyId } = context;

  switch (promotion.id) {
    case 'cover-letter-cv-editing':
    case 'cover-letter-cv-viewing':
      if (journeyId) {
        return `/studio?journeyId=${journeyId}&documentType=cl&mode=cledit`;
      } else if (cvId) {
        return `/studio?cvId=${cvId}&documentType=cl&mode=cledit`;
      }
      return '/studio?documentType=cl&mode=cledit';
    
    case 'ats-analysis-job':
      if (cvId && jobId) {
        return `/editor?mode=edit&cvId=${cvId}&jobId=${jobId}`;
      } else if (cvId) {
        return `/editor?mode=edit&cvId=${cvId}`;
      }
      return '/editor';
    
    case 'cv-creation-no-cv':
      return '/editor?mode=create';
    
    case 'upgrade-credit-low':
    case 'upgrade-credit-exhausted':
    case 'upgrade-free-user':
      // Use special route that will be handled by FeaturePromotionCard to open payment modal
      return 'payment-modal:focused_monthly';
    
    case 'job-tracking-no-jobs':
      return '/dashboard/jobs?tab=applications&newJob=1';
    
    default:
      return promotion.ctaRoute || '/dashboard';
  }
}

/**
 * Get all available promotions for a given context (for debugging/testing)
 */
export function getAvailablePromotions(options: PromotionManagerOptions): PromotionConfig[] {
  const {
    contexts,
    isDismissed,
  } = options;

  const contextMatches = PROMOTION_TYPES.filter((promotion) => {
    return promotion.contexts.some((ctx) => (contexts as any[]).includes(ctx));
  });

  return contextMatches.filter((promotion) => !isDismissed(promotion.id));
}

