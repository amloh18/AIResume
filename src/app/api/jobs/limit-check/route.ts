import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { checkJobLimit } from '@/lib/utils/subscription-helpers';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await User.findById(authResult.userId).select('currentPlanKey subscription trialState');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const hasActiveTrial = user.trialState?.token && user.trialState.expiresAt && new Date(user.trialState.expiresAt) > new Date();
    const currentPlanKey = hasActiveTrial ? 'starter_monthly' : (user.currentPlanKey || 'free');

    const limitCheck = await checkJobLimit(
      authResult.userId,
      currentPlanKey,
      hasActiveTrial ? {
        planKey: 'starter_monthly',
        status: 'active',
        accessExpiresAt: user.trialState.expiresAt,
        currentPeriodEnd: user.trialState.expiresAt
      } : user.subscription
    );
    
    return NextResponse.json({
      currentCount: limitCheck.currentCount,
      limit: limitCheck.limit,
      remaining: limitCheck.limit === -1 ? -1 : Math.max(0, limitCheck.limit - limitCheck.currentCount),
      isUnlimited: limitCheck.limit === -1,
      allowed: limitCheck.allowed
    });
  } catch (error) {
    console.error('Job limit check API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

