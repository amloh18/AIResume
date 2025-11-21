import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import getConnection from '@/lib/database';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';
import Job from '@/models/Job';
// import CVJourney from '@/models/CVJourney'; // Model not found, commented out
import User from '@/models/User';
import usageLimitsService from '@/lib/services/usageLimitsService';
import { getAdminPricingPlan } from '@/models/admin-models';

export interface ResourceCounts {
  cvs: number;
  coverLetters: number;
  jobs: number;
  journeys: number;
}

export interface SubscriptionLimits {
  // Credit-based limits (primary)
  credits?: {
    cvCredits: number | 'Unlimited';
    exportCredits: number | 'Unlimited';
    atsCheckCredits: number | 'Unlimited';
    jobCredits: number | 'Unlimited';
    resetSchedule: string;
  };
  // Legacy limits (deprecated - kept for backward compatibility)
  maxCVs?: number | 'Unlimited';
  maxCoverLetters?: number | 'Unlimited';
  maxJobs?: number | 'Unlimited';
  maxJourneys?: number | 'Unlimited';
}

/**
 * Get subscription limits from plan's credits (primary method)
 */
export async function getSubscriptionLimitsFromPlan(planKey: string): Promise<SubscriptionLimits> {
  try {
    await getConnection();
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: planKey }).lean();
    
    if (!plan) {
      // Fallback to default free plan limits
      return {
        credits: {
          cvCredits: 1,
          exportCredits: 1,
          atsCheckCredits: 0,
          jobCredits: 1,
          resetSchedule: 'monthly'
        }
      };
    }

    const credits = (plan as any).credits;
    if (credits) {
      return {
        credits: {
          cvCredits: credits.cvCredits === -1 ? 'Unlimited' : credits.cvCredits,
          exportCredits: credits.exportCredits === -1 ? 'Unlimited' : credits.exportCredits,
          atsCheckCredits: credits.atsCheckCredits === -1 ? 'Unlimited' : credits.atsCheckCredits,
          jobCredits: credits.jobCredits === -1 ? 'Unlimited' : credits.jobCredits,
          resetSchedule: credits.resetSchedule
        },
        // Legacy fields for backward compatibility
        maxCVs: credits.cvCredits === -1 ? 'Unlimited' : credits.cvCredits,
        maxJobs: credits.jobCredits === -1 ? 'Unlimited' : credits.jobCredits,
        maxJourneys: credits.jobCredits === -1 ? 'Unlimited' : credits.jobCredits, // Using jobCredits for journeys
        maxCoverLetters: credits.cvCredits === -1 ? 'Unlimited' : credits.cvCredits // Using cvCredits for cover letters
      };
    }

    // Fallback if credits not found
    return {
      credits: {
        cvCredits: 1,
        exportCredits: 1,
        atsCheckCredits: 0,
        jobCredits: 1,
        resetSchedule: 'monthly'
      }
    };
  } catch (error) {
    console.error('Error getting subscription limits from plan:', error);
    // Fallback to default
    return {
      credits: {
        cvCredits: 1,
        exportCredits: 1,
        atsCheckCredits: 0,
        jobCredits: 1,
        resetSchedule: 'monthly'
      }
    };
  }
}

/**
 * Get subscription limits based on plan type (legacy - deprecated)
 * @deprecated Use getSubscriptionLimitsFromPlan instead
 */
export function getSubscriptionLimits(plan: string): SubscriptionLimits {
  // Legacy hardcoded values - should not be used, but kept for backward compatibility
  switch (plan) {
    case 'free':
      return {
        maxCVs: 1,
        maxCoverLetters: 0,
        maxJobs: 1,
        maxJourneys: 1
      };
    case 'basic':
      return {
        maxCVs: 10,
        maxCoverLetters: 10,
        maxJobs: 20,
        maxJourneys: 20
      };
    case 'pro':
      return {
        maxCVs: -1, // Unlimited
        maxCoverLetters: -1,
        maxJobs: -1,
        maxJourneys: -1
      };
    case 'enterprise':
      return {
        maxCVs: -1, // Unlimited
        maxCoverLetters: -1,
        maxJobs: -1,
        maxJourneys: -1
      };
    default:
      return {
        maxCVs: 1,
        maxCoverLetters: 0,
        maxJobs: 1,
        maxJourneys: 1
      };
  }
}

/**
 * Get user's resource counts
 */
export async function getUserResourceCounts(userId: string): Promise<ResourceCounts> {
  try {
    await getConnection();

    const [cvCount, coverLetterCount, jobCount, journeyCount] = await Promise.all([
      CV.countDocuments({ userId }),
      CoverLetter.countDocuments({ userId }),
      Job.countDocuments({ userId }),
      // CVJourney.countDocuments({ userId }) // Model not found
      0 // Placeholder for CVJourney count
    ]);

    return {
      cvs: cvCount,
      coverLetters: coverLetterCount,
      jobs: jobCount,
      journeys: journeyCount
    };
  } catch (error) {
    console.error('Error getting user resource counts:', error);
    return {
      cvs: 0,
      coverLetters: 0,
      jobs: 0,
      journeys: 0
    };
  }
}

/**
 * Check if user can create more resources
 */
export async function canCreateResource(
  userId: string,
  resourceType: 'cv' | 'coverLetter' | 'job' | 'journey'
): Promise<{ allowed: boolean; reason?: string; counts?: ResourceCounts; limits?: SubscriptionLimits; timeRemaining?: { hours?: number; days?: number }; requiresUpgrade?: boolean }> {
  try {
    await getConnection();

    // First check time-based access
    const timeCheck = await usageLimitsService.checkTimeBasedAccess(userId);
    if (!timeCheck.hasAccess) {
      return {
        allowed: false,
        reason: timeCheck.reason || 'Subscription access expired',
        requiresUpgrade: true,
        timeRemaining: timeCheck.hoursRemaining ? { hours: timeCheck.hoursRemaining } : timeCheck.daysRemaining ? { days: timeCheck.daysRemaining } : undefined
      };
    }

    // Get user's subscription plan
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const plan = user.currentPlanKey || 'free';
    const limits = await getSubscriptionLimitsFromPlan(plan);
    const counts = await getUserResourceCounts(userId);

    // Check specific resource limit using credits
    let currentCount = 0;
    let maxLimit: number | 'Unlimited' = 0;

    // Use credits from plan (primary method)
    if (limits.credits) {
      switch (resourceType) {
        case 'cv':
          currentCount = counts.cvs;
          maxLimit = limits.credits.cvCredits;
          break;
        case 'coverLetter':
          currentCount = counts.coverLetters;
          maxLimit = limits.credits.cvCredits; // Cover letters use CV credits
          break;
        case 'job':
          currentCount = counts.jobs;
          maxLimit = limits.credits.jobCredits;
          break;
        case 'journey':
          currentCount = counts.journeys;
          maxLimit = limits.credits.jobCredits; // Journeys use job credits
          break;
      }
    } else {
      // Fallback to legacy limits
      switch (resourceType) {
        case 'cv':
          currentCount = counts.cvs;
          maxLimit = limits.maxCVs || 1;
          break;
        case 'coverLetter':
          currentCount = counts.coverLetters;
          maxLimit = limits.maxCoverLetters || 0;
          break;
        case 'job':
          currentCount = counts.jobs;
          maxLimit = limits.maxJobs || 5;
          break;
        case 'journey':
          currentCount = counts.journeys;
          maxLimit = limits.maxJourneys || 5;
          break;
      }
    }

    // 'Unlimited' or -1 means unlimited
    if (maxLimit === 'Unlimited' || maxLimit === -1) {
      return { allowed: true, counts, limits };
    }

    if (currentCount >= maxLimit) {
      return {
        allowed: false,
        reason: `You've reached the limit of ${maxLimit} ${resourceType}s for your ${plan} plan. Please upgrade to create more.`,
        counts,
        limits,
        requiresUpgrade: true,
        timeRemaining: timeCheck.hoursRemaining ? { hours: timeCheck.hoursRemaining } : timeCheck.daysRemaining ? { days: timeCheck.daysRemaining } : undefined
      };
    }

    return {
      allowed: true,
      counts,
      limits,
      timeRemaining: timeCheck.hoursRemaining ? { hours: timeCheck.hoursRemaining } : timeCheck.daysRemaining ? { days: timeCheck.daysRemaining } : undefined
    };
  } catch (error) {
    console.error('Error checking resource creation permission:', error);
    return { allowed: false, reason: 'Error checking permissions' };
  }
}

/**
 * Middleware to track and enforce resource limits
 */
export async function resourceTrackerMiddleware(req: NextRequest) {
  // Only apply to specific API routes that create resources
  const path = req.nextUrl.pathname;
  
  // Define routes that create resources
  const resourceRoutes: Record<string, 'cv' | 'coverLetter' | 'job' | 'journey'> = {
    '/api/cvs': 'cv',
    '/api/cover-letters': 'coverLetter',
    '/api/jobs': 'job',
    '/api/journeys': 'journey',
    '/api/cv-journeys': 'journey'
  };

  // Check if this is a POST request to a resource creation route
  if (req.method === 'POST') {
    for (const [route, resourceType] of Object.entries(resourceRoutes)) {
      if (path.startsWith(route)) {
        // Get user from token
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.sub) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // Check if user can create this resource
        const permission = await canCreateResource(token.sub, resourceType);
        
        if (!permission.allowed) {
          return NextResponse.json(
            {
              error: 'Resource limit exceeded',
              message: permission.reason,
              counts: permission.counts,
              limits: permission.limits,
              requiresUpgrade: true
            },
            { status: 403 }
          );
        }

        // Add resource counts to request headers for the API handler to use
        const response = NextResponse.next();
        response.headers.set('X-Resource-Counts', JSON.stringify(permission.counts));
        response.headers.set('X-Resource-Limits', JSON.stringify(permission.limits));
        return response;
      }
    }
  }

  return NextResponse.next();
}


