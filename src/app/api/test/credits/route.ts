import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import creditService from '@/lib/services/creditService';
import creditResetService from '@/lib/services/creditResetService';
import usageLimitsService from '@/lib/services/usageLimitsService';

/**
 * Test endpoint for credit system
 * GET /api/test/credits
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    const results: any = {};

    // Test 1: Get current credit status
    const creditStatus = await creditService.getCreditStatus(userId);
    results.creditStatus = creditStatus;

    // Test 2: Check credit availability
    const availability = await creditService.checkCreditAvailability(userId, 'job_create');
    results.creditAvailability = {
      available: availability.available,
      creditsRemaining: availability.creditsRemaining,
      limit: availability.limit
    };

    // Test 3: Check usage limit (full check)
    const usageCheck = await usageLimitsService.checkUsageLimit({
      userId,
      action: 'job_create'
    });
    results.usageLimitCheck = {
      allowed: usageCheck.allowed,
      reason: usageCheck.reason,
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      resetTime: usageCheck.resetTime
    };

    // Test 4: Get plan credits
    const currentPlan = user.currentPlanKey || 'free';
    const planCredits = await creditService.getPlanCredits(currentPlan);
    results.planCredits = {
      plan: currentPlan,
      ...planCredits
    };

    // Test 5: Check reset eligibility
    const shouldReset = await creditResetService.shouldResetCredits(userId);
    const resetDate = await creditResetService.getResetDate(userId);
    results.resetEligibility = {
      shouldReset,
      nextResetDate: resetDate
    };

    // Test 6: User info
    results.userInfo = {
      email: user.email,
      currentPlanKey: user.currentPlanKey,
      subscriptionStatus: user.subscription?.status,
      credits: user.credits ? {
        jobCredits: user.credits.jobCredits,
        lastResetDate: user.credits.lastResetDate,
        resetSchedule: user.credits.resetSchedule,
        totalCreated: user.credits.totalCreated
      } : null
    };

    return NextResponse.json({
      success: true,
      message: 'Credit system test completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Credit system test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint to spend a credit (for testing)
 * POST /api/test/credits/spend
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    const body = await request.json();
    const { action } = body;

    const actionType: 'job_create' = (action || 'job_create') as 'job_create';

    // Check before
    const before = await creditService.checkCreditAvailability(userId, actionType);

    // Spend credit
    const spendResult = await creditService.spendCredit(userId, actionType);

    // Check after
    const after = await creditService.checkCreditAvailability(userId, actionType);

    return NextResponse.json({
      success: spendResult,
      action: actionType,
      before: {
        available: before.available,
        creditsRemaining: before.creditsRemaining,
        limit: before.limit
      },
      after: {
        available: after.available,
        creditsRemaining: after.creditsRemaining,
        limit: after.limit
      },
      creditSpent: before.creditsRemaining - after.creditsRemaining
    });

  } catch (error: any) {
    console.error('Credit spend test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

