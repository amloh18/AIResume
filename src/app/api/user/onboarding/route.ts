import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { userRepository } from '@/lib/repositories/user-repository';
import { getConnection } from '@/lib/database/connection-manager';
import CV from '@/models/CV';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId;

    const user = await userRepository.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Additional status checks from the old onboarding-status
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isNewUser = user.createdAt ? user.createdAt > fiveMinutesAgo : false;
    
    const masterCV = await CV.findOne({ userId: user._id, 'metadata.isMaster': true });
    const hasMasterCV = !!masterCV;
    const hasSeenWelcome = (user.settings as any)?.hasSeenWelcome || false;

    return NextResponse.json({
      success: true,
      data: {
        onboarding: user.onboarding || {},
        userLifecycleState: user.userLifecycleState,
        isAnonymous: !!user.isAnonymous,
        isNewUser,
        hasMasterCV,
        hasSeenWelcome,
        subscription: user.subscription
      }
    });
  } catch (error: any) {
    console.error('Onboarding fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getConnection();
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId;
    const body = await request.json();

    const updateFields: any = {};
    
    // Support nested onboarding body or flat body
    const onboardingData = body.onboarding || body;

    if (onboardingData.current_stage) updateFields['onboarding.current_stage'] = onboardingData.current_stage;
    if (onboardingData.completed_stages) updateFields['onboarding.completed_stages'] = onboardingData.completed_stages;
    if (onboardingData.primary_goal) updateFields['onboarding.primary_goal'] = onboardingData.primary_goal;
    if (onboardingData.confidence_score !== undefined) updateFields['onboarding.confidence_score'] = onboardingData.confidence_score;
    if (onboardingData.recommended_plan) updateFields['onboarding.recommended_plan'] = onboardingData.recommended_plan;
    if (onboardingData.primary_cv_id) {
      if (/^[0-9a-fA-F]{24}$/.test(onboardingData.primary_cv_id)) {
        updateFields['onboarding.primary_cv_id'] = onboardingData.primary_cv_id;
      } else {
        console.log(`[Onboarding API] Skipping invalid primary_cv_id format: ${onboardingData.primary_cv_id}`);
      }
    }
    if (onboardingData.activation_status) updateFields['onboarding.activation_status'] = onboardingData.activation_status;
    if (onboardingData.activation_route) updateFields['onboarding.activation_route'] = onboardingData.activation_route;
    if (onboardingData.dashboard_layout_type) updateFields['onboarding.dashboard_layout_type'] = onboardingData.dashboard_layout_type;

    if (body.userLifecycleState) updateFields['userLifecycleState'] = body.userLifecycleState;
    if (body.hasSeenWelcome !== undefined) updateFields['settings.hasSeenWelcome'] = body.hasSeenWelcome;

    const updatedUser = await userRepository.updateById(userId, { $set: updateFields } as any);

    return NextResponse.json({
      success: true,
      data: {
        onboarding: updatedUser?.onboarding,
        userLifecycleState: updatedUser?.userLifecycleState
      }
    });
  } catch (error: any) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
