/**
 * Usage Limits Middleware
 * 
 * Checks and enforces free tier limits for the Resume Enhancer Career Ecosystem:
 * - Journey CV count (max 3 for free users)
 * - Surgeon analysis runs per month (max 10 for free)
 * - Premium template access
 * - PDF downloads per month
 */

import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';

export type LimitAction = 'create_journey' | 'run_surgeon' | 'download_pdf' | 'use_premium_template';

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  message?: string;
  upgradeRequired?: boolean;
}

/**
 * Free tier limits
 */
const FREE_TIER_LIMITS = {
  journeyCVs: 3,           // Max Journey CVs
  surgeonRuns: 10,         // AI Surgeon runs per month
  downloads: 5,            // PDF downloads per month
  premiumTemplates: false  // No premium template access
};

/**
 * Pro tier limits
 */
const PRO_TIER_LIMITS = {
  journeyCVs: -1,           // Unlimited
  surgeonRuns: -1,          // Unlimited
  downloads: -1,            // Unlimited
  premiumTemplates: true    // Full access
};

/**
 * Check if a month has passed since the reset date
 */
function shouldResetMonthlyLimits(resetDate?: Date): boolean {
  if (!resetDate) return true;
  
  const now = new Date();
  const reset = new Date(resetDate);
  
  // Check if we're in a different month
  return now.getMonth() !== reset.getMonth() || 
         now.getFullYear() !== reset.getFullYear();
}

/**
 * Get limits for a user based on their plan
 */
function getLimitsForPlan(planKey: string): typeof FREE_TIER_LIMITS {
  const proPlanKeys = ['pro_monthly', 'pro_quarterly', 'pro_lifetime', 'day_pass'];
  
  if (proPlanKeys.includes(planKey)) {
    return PRO_TIER_LIMITS;
  }
  
  return FREE_TIER_LIMITS;
}

/**
 * Check user limits for a specific action
 */
export async function checkUserLimits(
  userId: string,
  action: LimitAction
): Promise<LimitCheckResult> {
  try {
    await getConnection();
    
    // Get user with limits
    const user = await User.findById(userId).select(
      'currentPlanKey subscription.planKey resumeEnhancerLimits'
    );
    
    if (!user) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        message: 'User not found',
        upgradeRequired: false
      };
    }

    const planKey = user.currentPlanKey || user.subscription?.planKey || 'free';
    const limits = getLimitsForPlan(planKey);
    
    // Initialize limits if not present
    if (!user.resumeEnhancerLimits) {
      user.resumeEnhancerLimits = {
        journeyCVsCreated: 0,
        surgeonRunsThisMonth: 0,
        surgeonRunsResetAt: new Date(),
        downloadsThisMonth: 0,
        downloadsResetAt: new Date()
      };
    }

    // Reset monthly counters if needed
    if (shouldResetMonthlyLimits(user.resumeEnhancerLimits.surgeonRunsResetAt)) {
      user.resumeEnhancerLimits.surgeonRunsThisMonth = 0;
      user.resumeEnhancerLimits.surgeonRunsResetAt = new Date();
    }
    
    if (shouldResetMonthlyLimits(user.resumeEnhancerLimits.downloadsResetAt)) {
      user.resumeEnhancerLimits.downloadsThisMonth = 0;
      user.resumeEnhancerLimits.downloadsResetAt = new Date();
    }

    let result: LimitCheckResult;

    switch (action) {
      case 'create_journey':
        result = checkJourneyCVLimit(user, limits, userId);
        break;
        
      case 'run_surgeon':
        result = checkSurgeonRunLimit(user, limits);
        break;
        
      case 'download_pdf':
        result = checkDownloadLimit(user, limits);
        break;
        
      case 'use_premium_template':
        result = checkPremiumTemplateAccess(limits);
        break;
        
      default:
        result = { allowed: true, remaining: -1, limit: -1 };
    }

    // Save any limit updates
    await user.save();

    return result;

  } catch (error) {
    console.error('Usage limits check error:', error);
    // Fail open - allow action if check fails
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      message: 'Limit check failed, action allowed'
    };
  }
}

/**
 * Check Journey CV creation limit
 */
async function checkJourneyCVLimit(
  user: any,
  limits: typeof FREE_TIER_LIMITS,
  userId: string
): Promise<LimitCheckResult> {
  if (limits.journeyCVs === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // Count actual Journey CVs in database
  const journeyCVCount = await CV.countDocuments({
    userId,
    cvType: 'journey'
  });

  const remaining = Math.max(0, limits.journeyCVs - journeyCVCount);
  
  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.journeyCVs,
    message: remaining === 0 ? 'You have reached your Journey CV limit. Upgrade to create more.' : undefined,
    upgradeRequired: remaining === 0
  };
}

/**
 * Check AI Surgeon run limit
 */
function checkSurgeonRunLimit(
  user: any,
  limits: typeof FREE_TIER_LIMITS
): LimitCheckResult {
  if (limits.surgeonRuns === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const used = user.resumeEnhancerLimits?.surgeonRunsThisMonth || 0;
  const remaining = Math.max(0, limits.surgeonRuns - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.surgeonRuns,
    message: remaining === 0 ? 'You have used all your AI analysis runs this month. Upgrade for unlimited.' : undefined,
    upgradeRequired: remaining === 0
  };
}

/**
 * Check download limit
 */
function checkDownloadLimit(
  user: any,
  limits: typeof FREE_TIER_LIMITS
): LimitCheckResult {
  if (limits.downloads === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const used = user.resumeEnhancerLimits?.downloadsThisMonth || 0;
  const remaining = Math.max(0, limits.downloads - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.downloads,
    message: remaining === 0 ? 'You have used all your downloads this month. Upgrade for unlimited.' : undefined,
    upgradeRequired: remaining === 0
  };
}

/**
 * Check premium template access
 */
function checkPremiumTemplateAccess(
  limits: typeof FREE_TIER_LIMITS
): LimitCheckResult {
  return {
    allowed: limits.premiumTemplates,
    remaining: limits.premiumTemplates ? -1 : 0,
    limit: limits.premiumTemplates ? -1 : 0,
    message: !limits.premiumTemplates ? 'Premium templates require a Pro subscription.' : undefined,
    upgradeRequired: !limits.premiumTemplates
  };
}

/**
 * Increment usage counter after successful action
 */
export async function incrementUsage(
  userId: string,
  action: 'surgeon_run' | 'download' | 'journey_cv'
): Promise<void> {
  try {
    await getConnection();
    
    const updateField = action === 'surgeon_run' 
      ? 'resumeEnhancerLimits.surgeonRunsThisMonth'
      : action === 'download'
        ? 'resumeEnhancerLimits.downloadsThisMonth'
        : 'resumeEnhancerLimits.journeyCVsCreated';

    await User.findByIdAndUpdate(userId, {
      $inc: { [updateField]: 1 }
    });

  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
}

/**
 * Get current usage stats for a user
 */
export async function getUserUsageStats(userId: string): Promise<{
  journeyCVs: { used: number; limit: number };
  surgeonRuns: { used: number; limit: number; resetsAt?: Date };
  downloads: { used: number; limit: number; resetsAt?: Date };
  hasPremiumAccess: boolean;
}> {
  try {
    await getConnection();
    
    const user = await User.findById(userId).select(
      'currentPlanKey subscription.planKey resumeEnhancerLimits'
    );
    
    if (!user) {
      throw new Error('User not found');
    }

    const planKey = user.currentPlanKey || user.subscription?.planKey || 'free';
    const limits = getLimitsForPlan(planKey);

    const journeyCVCount = await CV.countDocuments({
      userId,
      cvType: 'journey'
    });

    return {
      journeyCVs: {
        used: journeyCVCount,
        limit: limits.journeyCVs
      },
      surgeonRuns: {
        used: user.resumeEnhancerLimits?.surgeonRunsThisMonth || 0,
        limit: limits.surgeonRuns,
        resetsAt: user.resumeEnhancerLimits?.surgeonRunsResetAt
      },
      downloads: {
        used: user.resumeEnhancerLimits?.downloadsThisMonth || 0,
        limit: limits.downloads,
        resetsAt: user.resumeEnhancerLimits?.downloadsResetAt
      },
      hasPremiumAccess: limits.premiumTemplates
    };

  } catch (error) {
    console.error('Failed to get usage stats:', error);
    throw error;
  }
}

