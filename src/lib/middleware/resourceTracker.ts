import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/lib/mongodb';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';
import Job from '@/models/Job';
import CVJourney from '@/models/CVJourney';
import User from '@/models/User';

export interface ResourceCounts {
  cvs: number;
  coverLetters: number;
  jobs: number;
  journeys: number;
}

export interface SubscriptionLimits {
  maxCVs: number;
  maxCoverLetters: number;
  maxJobs: number;
  maxJourneys: number;
}

/**
 * Get subscription limits based on plan type
 */
export function getSubscriptionLimits(plan: string): SubscriptionLimits {
  switch (plan) {
    case 'free':
      return {
        maxCVs: 3,
        maxCoverLetters: 3,
        maxJobs: 5,
        maxJourneys: 5
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
        maxCVs: 3,
        maxCoverLetters: 3,
        maxJobs: 5,
        maxJourneys: 5
      };
  }
}

/**
 * Get user's resource counts
 */
export async function getUserResourceCounts(userId: string): Promise<ResourceCounts> {
  try {
    await connectDB();

    const [cvCount, coverLetterCount, jobCount, journeyCount] = await Promise.all([
      CV.countDocuments({ userId }),
      CoverLetter.countDocuments({ userId }),
      Job.countDocuments({ userId }),
      CVJourney.countDocuments({ userId })
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
): Promise<{ allowed: boolean; reason?: string; counts?: ResourceCounts; limits?: SubscriptionLimits }> {
  try {
    await connectDB();

    // Get user's subscription plan
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const plan = user.subscription?.plan || 'free';
    const limits = getSubscriptionLimits(plan);
    const counts = await getUserResourceCounts(userId);

    // Check specific resource limit
    let currentCount = 0;
    let maxLimit = 0;

    switch (resourceType) {
      case 'cv':
        currentCount = counts.cvs;
        maxLimit = limits.maxCVs;
        break;
      case 'coverLetter':
        currentCount = counts.coverLetters;
        maxLimit = limits.maxCoverLetters;
        break;
      case 'job':
        currentCount = counts.jobs;
        maxLimit = limits.maxJobs;
        break;
      case 'journey':
        currentCount = counts.journeys;
        maxLimit = limits.maxJourneys;
        break;
    }

    // -1 means unlimited
    if (maxLimit === -1) {
      return { allowed: true, counts, limits };
    }

    if (currentCount >= maxLimit) {
      return {
        allowed: false,
        reason: `You've reached the limit of ${maxLimit} ${resourceType}s for your ${plan} plan. Please upgrade to create more.`,
        counts,
        limits
      };
    }

    return { allowed: true, counts, limits };
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


