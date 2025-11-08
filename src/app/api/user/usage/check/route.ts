import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import usageLimitsService from '@/lib/services/usageLimitsService';

/**
 * Check if user can perform a specific action
 * Returns time-based access status + usage limits
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    // Only job creation requires credit check
    const finalAction: 'job_create' = action || 'job_create';

    // Check time-based access first
    const timeCheck = await usageLimitsService.checkTimeBasedAccess(userId);

    // Check usage limits
    const usageCheck = await usageLimitsService.checkUsageLimit({
      userId,
      action: finalAction
    });

    return NextResponse.json({
      success: true,
      allowed: timeCheck.hasAccess && usageCheck.allowed,
      reason: !timeCheck.hasAccess ? timeCheck.reason : usageCheck.reason,
      timeAccess: {
        hasAccess: timeCheck.hasAccess,
        hoursRemaining: timeCheck.hoursRemaining,
        daysRemaining: timeCheck.daysRemaining,
        expiredAt: timeCheck.expiredAt,
        isInGracePeriod: timeCheck.isInGracePeriod,
        gracePeriodEndsAt: timeCheck.gracePeriodEndsAt,
        requiresRenewal: timeCheck.requiresRenewal
      },
      usage: {
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        resetTime: usageCheck.resetTime
      }
    });

  } catch (error) {
    console.error('Error checking usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

