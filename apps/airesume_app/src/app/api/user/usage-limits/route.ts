import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import usageLimitsService from '@/lib/services/usageLimitsService';
import creditService from '@/lib/services/creditService';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { ErrorCode, createErrorNextResponse } from '@/lib/utils/error-codes';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Use getAuthenticatedUser for consistent user ID resolution
    // This does a database lookup by email to get the canonical _id
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return createErrorNextResponse(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required. Please sign in to access usage limits.'
      );
    }

    const userId = authResult.userId;
    if (!userId) {
      return createErrorNextResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'User ID not found in session. Please sign in again.'
      );
    }

    // Support conditional requests (If-Modified-Since)
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince) {
      try {
        const modifiedSinceDate = new Date(ifModifiedSince);
        await connectToDatabase();
        const user = await User.findById(userId).select('updatedAt');

        if (user && user.updatedAt) {
          // If user hasn't been updated since the provided date, return 304 Not Modified
          if (user.updatedAt <= modifiedSinceDate) {
            return new NextResponse(null, { status: 304 });
          }
        }
      } catch (dateError) {
        // Invalid date, continue with normal request
        console.warn('Invalid If-Modified-Since header:', dateError);
      }
    }

    // Get user usage information
    const usage = await usageLimitsService.getUserUsage(userId);
    if (!usage) {
      return createErrorNextResponse(
        ErrorCode.DB_RECORD_NOT_FOUND,
        'User not found. Please ensure you are signed in with a valid account.'
      );
    }

    // Get time-based access information
    const timeAccess = await usageLimitsService.checkTimeBasedAccess(userId);

    // Get user subscription for additional info
    await connectToDatabase();
    const user = await User.findById(userId);
    const subscription = user?.subscription;

    // Count actual jobs from database for accurate metrics
    const { JobApplication } = await import('@/models');
    const actualJobCount = await JobApplication.countDocuments({
      userId: userId,
      status: 'created'  // Only count active created jobs
    });

    // Get credit information (include usage for all plans)
    let creditInfo = null;
    const planKey = user?.currentPlanKey || 'free';
    const creditStatus = await creditService.getCreditStatus(userId);
    if (creditStatus) {
      // Always call checkCreditAvailability for accurate limit info
      // For unlimited plans this returns { limit: -1, creditsRemaining: -1 }
      const creditCheck = await creditService.checkCreditAvailability(userId, 'job_create');
      const remaining = creditCheck.creditsRemaining;
      const limit = creditCheck.limit;

      // Use actual job count from DB instead of historical counter
      const totalCreatedJobs = actualJobCount;
      const used = limit === -1
        ? totalCreatedJobs
        : Math.max(0, limit - (remaining === -1 ? 0 : remaining));

      // Get AI credits availability
      const aiCreditCheck = await creditService.checkCreditAvailability(userId, 'ai_generation');
      const aiCreditsRemaining = aiCreditCheck.creditsRemaining;
      const aiCreditsLimit = aiCreditCheck.limit;

      creditInfo = {
        remaining,
        limit,
        used,
        totalCreated: totalCreatedJobs,
        aiCreditsRemaining,
        aiCreditsLimit,
        planKey,
        nextResetDate: creditStatus.nextResetDate,
        resetSchedule: creditStatus.resetSchedule
      };
    }

    const responseData = {
      success: true,
      usage,
      credits: creditInfo,
      timeAccess: {
        hasAccess: timeAccess.hasAccess,
        hoursRemaining: timeAccess.hoursRemaining,
        daysRemaining: timeAccess.daysRemaining,
        expiredAt: timeAccess.expiredAt,
        isInGracePeriod: timeAccess.isInGracePeriod,
        gracePeriodEndsAt: timeAccess.gracePeriodEndsAt
      },
      subscription: subscription ? {
        planKey: subscription.planKey,
        status: subscription.status,
        accessExpiresAt: subscription.accessExpiresAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        autoRenew: subscription.autoRenew
      } : null,
      lastUpdated: user?.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString()
    };

    const response = NextResponse.json(responseData);

    // Add Last-Modified header for conditional requests
    if (user?.updatedAt) {
      response.headers.set('Last-Modified', new Date(user.updatedAt).toUTCString());
    }

    // Always revalidate (no-cache keeps the If-Modified-Since / 304 flow alive,
    // but forces the browser to re-check instead of serving a stale cached body
    // after plan changes)
    response.headers.set('Cache-Control', 'private, no-cache, max-age=0, must-revalidate');

    return response;

  } catch (error: any) {
    console.error('Error fetching user usage limits:', error);

    // Check for database connection errors
    if (error?.name === 'MongoNetworkError' || error?.name === 'MongoServerSelectionError') {
      return createErrorNextResponse(
        ErrorCode.DB_CONNECTION_FAILED,
        'Database connection failed. Please try again later.',
        { error: error.message },
        true, // Retryable
        60 // Retry after 60 seconds
      );
    }

    return createErrorNextResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An internal server error occurred while fetching usage limits.',
      { error: error.message }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use getAuthenticatedUser for consistent user ID resolution
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return createErrorNextResponse(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required. Please sign in to check usage limits.'
      );
    }

    const userId = authResult.userId;
    if (!userId) {
      return createErrorNextResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'User ID not found in session. Please sign in again.'
      );
    }

    const body = await request.json();
    const { action, deviceFingerprint } = body;

    if (!action) {
      return createErrorNextResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Action is required to check usage limits.',
        { field: 'action' }
      );
    }

    // Check usage limit
    const usageCheck = await usageLimitsService.checkUsageLimit({
      userId,
      action,
      deviceFingerprint
    });

    return NextResponse.json({
      success: true,
      allowed: usageCheck.allowed,
      reason: usageCheck.reason,
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      resetTime: usageCheck.resetTime
    });

  } catch (error: any) {
    console.error('Error checking usage limit:', error);

    // Check for database connection errors
    if (error?.name === 'MongoNetworkError' || error?.name === 'MongoServerSelectionError') {
      return createErrorNextResponse(
        ErrorCode.DB_CONNECTION_FAILED,
        'Database connection failed. Please try again later.',
        { error: error.message },
        true, // Retryable
        60 // Retry after 60 seconds
      );
    }

    return createErrorNextResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An internal server error occurred while checking usage limits.',
      { error: error.message }
    );
  }
}