import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { checkJourneyCVLimit } from '@/lib/utils/subscription-helpers';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await User.findById(authResult.userId).select('currentPlanKey subscription');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const limitCheck = await checkJourneyCVLimit(
      authResult.userId,
      user.currentPlanKey || 'free',
      user.subscription
    );
    
    return NextResponse.json({
      currentActiveCount: limitCheck.currentActiveCount,
      limit: limitCheck.limit,
      remaining: limitCheck.limit === -1 ? -1 : Math.max(0, limitCheck.limit - limitCheck.currentActiveCount),
      isUnlimited: limitCheck.limit === -1,
      allowed: limitCheck.allowed,
      canDeleteToMakeSpace: limitCheck.canDeleteToMakeSpace
    });
  } catch (error) {
    console.error('Journey CV limit check API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

