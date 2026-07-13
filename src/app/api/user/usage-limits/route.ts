import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import usageLimitsService from "@/lib/services/usageLimitsService";
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { ErrorCode, createErrorNextResponse } from '@/lib/utils/error-codes';

const USER_PROJECTION = {
  currentPlanKey: 1,
  subscription: 1,
  usage: 1,
  credits: 1,
  updatedAt: 1,
};

const UNLIMITED_PLAN_KEYS = new Set([
  'focused_monthly',
  'focused_yearly',
  'smart_quarterly',
  'smart_yearly',
  'pro_monthly',
  'pro_quarterly',
  'pro_yearly',
  'pro_lifetime',
  'pro',
  'starter_yearly',
]);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorNextResponse(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required. Please sign in to access usage limits.'
      );
    }

    await connectToDatabase();

    const userId = session.user.id;
    const user = await User.findById(userId).select(USER_PROJECTION);
    if (!user) {
      return createErrorNextResponse(
        ErrorCode.DB_RECORD_NOT_FOUND,
        'User not found. Please ensure you are signed in with a valid account.'
      );
    }

    const hasActiveTrial = user.trialState?.token && user.trialState.expiresAt && new Date(user.trialState.expiresAt) > new Date();
    const planKey = hasActiveTrial ? 'starter_monthly' : (user.currentPlanKey || 'free');

    // Support conditional requests (If-Modified-Since)
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince) {
      try {
        const modifiedSinceDate = new Date(ifModifiedSince);
        if (user.updatedAt && user.updatedAt <= modifiedSinceDate) {
          return new NextResponse(null, { status: 304 });
        }
      } catch {
        // ignore invalid date
      }
    }

    // Derive usage stats directly from the cached user document.
    const planLimits = {
      maxCVs: planKey === 'free' ? 1 : -1,
      maxExports: planKey === 'free' ? 5 : -1,
      storageLimit: planKey === 'free' ? 50 : -1,
    };

    const usage = {
      cvJourneyCount: user.usage?.cvJourneyCount ?? 0,
      cvCreatedCount: user.usage?.cvCreatedCount ?? 0,
      exportCount: user.usage?.exportCount ?? 0,
      atsCheckCount: user.usage?.atsCheckCount ?? 0,
      planLimits,
    };

    // Time-based access: inline the same logic as checkTimeBasedAccess but
    // without another DB fetch because we already have the user document.
    const subscription = user.subscription;
    let timeAccess: any = { hasAccess: true };

    if (planKey === 'free') {
      timeAccess = { hasAccess: true, subscription, reason: 'Free tier access' };
    } else if (!subscription || subscription.status === 'cancelled' || subscription.status === 'inactive') {
      timeAccess = { hasAccess: true, subscription, reason: 'No active subscription, using free tier access' };
    } else if (planKey === 'pro_lifetime') {
      timeAccess = { hasAccess: true, subscription, reason: 'Lifetime access' };
    } else if ((planKey === 'pro_quarterly' || planKey === 'pro_lifetime') && subscription.accessExpiresAt) {
      const expiresAt = new Date(subscription.accessExpiresAt);
      const daysRemaining = Math.max(0, (expiresAt.getTime() - Date.now()) / 86400000);

      if (new Date().getTime() > new Date(expiresAt).getTime()) {
        const gracePeriodEndsAt = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        timeAccess = new Date().getTime() <= new Date(gracePeriodEndsAt).getTime()
          ? { hasAccess: true, isInGracePeriod: true, gracePeriodEndsAt, daysRemaining: 0, subscription, reason: 'Subscription expired, in grace period' }
          : { hasAccess: false, reason: 'Subscription has expired', expiredAt: expiresAt, daysRemaining: 0, requiresRenewal: true };
      } else {
        timeAccess = { hasAccess: true, daysRemaining: Math.round(daysRemaining * 10) / 10, subscription, expiredAt: expiresAt };
      }
    } else if (planKey === 'pro_monthly' && subscription.currentPeriodEnd) {
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const daysRemaining = Math.max(0, (periodEnd.getTime() - Date.now()) / 86400000);

      if (new Date().getTime() > new Date(periodEnd).getTime()) {
        const gracePeriodEndsAt = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
        if (subscription.autoRenew && subscription.status === 'active' && new Date().getTime() <= new Date(gracePeriodEndsAt).getTime()) {
          timeAccess = { hasAccess: true, isInGracePeriod: true, gracePeriodEndsAt, daysRemaining: 0, subscription, reason: 'Subscription renewal pending, in grace period' };
        } else {
          timeAccess = { hasAccess: false, reason: 'Subscription period has ended', expiredAt: periodEnd, daysRemaining: 0, requiresRenewel: true };
        }
      } else {
        timeAccess = { hasAccess: true, daysRemaining: Math.round(daysRemaining * 10) / 10, subscription, expiredAt: periodEnd };
      }
    } else {
      timeAccess = { hasAccess: false, reason: 'Unable to determine subscription status', requiresRenewal: true };
    }

    // Credit info: inline the same logic as creditService but avoid extra DB fetches.
    const isUnlimited = UNLIMITED_PLAN_KEYS.has(planKey);
    let creditInfo: any = null;

    if (!isUnlimited) {
      const { JobApplication } = await import('@/models');
      const totalCreatedJobs = await JobApplication.countDocuments({
        userId,
        status: 'created',
      });

      const jobCredits = user.credits?.jobCredits ?? 0;
      const aiCredits = user.credits?.aiCredits ?? 0;

      creditInfo = {
        remaining: jobCredits,
        limit: 1,
        used: totalCreatedJobs,
        totalCreated: totalCreatedJobs,
        aiCreditsRemaining: aiCredits,
        aiCreditsLimit: 3,
        planKey,
      };
    } else {
      creditInfo = {
        remaining: -1,
        limit: -1,
        used: user.usage?.cvCreatedCount ?? 0,
        totalCreated: user.usage?.cvCreatedCount ?? 0,
        aiCreditsRemaining: -1,
        aiCreditsLimit: -1,
        planKey,
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
        gracePeriodEndsAt: timeAccess.gracePeriodEndsAt,
      },
      subscription: hasActiveTrial
        ? {
            planKey: 'starter_monthly',
            status: 'active',
            accessExpiresAt: user.trialState.expiresAt,
            currentPeriodEnd: user.trialState.expiresAt,
            autoRenew: false,
          }
        : (subscription
        ? {
            planKey: (subscription as any).planKey,
            status: subscription.status,
            accessExpiresAt: subscription.accessExpiresAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
            autoRenew: subscription.autoRenew,
          }
        : null),
      lastUpdated: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
    };

    const response = NextResponse.json(responseData);

    if (user.updatedAt) {
      response.headers.set('Last-Modified', new Date(user.updatedAt).toUTCString());
    }

    return response;
  } catch (error: any) {
    console.error('Error fetching user usage limits:', error);

    if (error?.name === 'MongoNetworkError' || error?.name === 'MongoServerSelectionError') {
      return createErrorNextResponse(
        ErrorCode.DB_CONNECTION_FAILED,
        'Database connection failed. Please try again later.',
        { error: error.message },
        true,
        60
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorNextResponse(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required. Please sign in to check usage limits.'
      );
    }

    const userId = session.user.id;
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

    const usageCheck = await usageLimitsService.checkUsageLimit({
      userId,
      action,
      deviceFingerprint,
    });

    return NextResponse.json({
      success: true,
      allowed: usageCheck.allowed,
      reason: usageCheck.reason,
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      resetTime: usageCheck.resetTime,
    });
  } catch (error: any) {
    console.error('Error checking usage limit:', error);

    if (error?.name === 'MongoNetworkError' || error?.name === 'MongoServerSelectionError') {
      return createErrorNextResponse(
        ErrorCode.DB_CONNECTION_FAILED,
        'Database connection failed. Please try again later.',
        { error: error.message },
        true,
        60
      );
    }

    return createErrorNextResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An internal server error occurred while checking usage limits.',
      { error: error.message }
    );
  }
}
