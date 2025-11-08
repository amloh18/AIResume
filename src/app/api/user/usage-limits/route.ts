import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import usageLimitsService from '@/lib/services/usageLimitsService';
import creditService from '@/lib/services/creditService';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user usage information
    const usage = await usageLimitsService.getUserUsage(userId);
    if (!usage) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get time-based access information
    const timeAccess = await usageLimitsService.checkTimeBasedAccess(userId);

    // Get user subscription for additional info
    await connectToDatabase();
    const user = await User.findById(userId);
    const subscription = user?.subscription;

    // Get credit information for free plan users
    let creditInfo = null;
    if (user?.currentPlanKey === 'free') {
      const creditStatus = await creditService.getCreditStatus(userId);
      if (creditStatus) {
        const creditCheck = await creditService.checkCreditAvailability(userId, 'cv_create');
        creditInfo = {
          remaining: creditCheck.creditsRemaining,
          limit: creditCheck.limit
        };
      }
    }

    return NextResponse.json({
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
      } : null
    });

  } catch (error) {
    console.error('Error fetching user usage limits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { action, deviceFingerprint } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
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

  } catch (error) {
    console.error('Error checking usage limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}