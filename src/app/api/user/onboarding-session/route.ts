import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { userRepository } from '@/lib/repositories/user-repository';
import { getConnection } from '@/lib/database/connection-manager';

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

    return NextResponse.json({
      success: true,
      data: {
        onboarding: user.onboarding,
        userLifecycleState: user.userLifecycleState,
        isAnonymous: !!user.isAnonymous
      }
    });
  } catch (error: any) {
    console.error('Onboarding session fetch error:', error);
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
    const { 
      current_stage, 
      completed_stages, 
      userLifecycleState, 
      primary_goal,
      confidence_score,
      recommended_plan,
      primary_cv_id
    } = body;

    const updateFields: any = {};
    if (current_stage) updateFields['onboarding.current_stage'] = current_stage;
    if (completed_stages) updateFields['onboarding.completed_stages'] = completed_stages;
    if (primary_goal) updateFields['onboarding.primary_goal'] = primary_goal;
    if (confidence_score !== undefined) updateFields['onboarding.confidence_score'] = confidence_score;
    if (recommended_plan) updateFields['onboarding.recommended_plan'] = recommended_plan;
    if (primary_cv_id) updateFields['onboarding.primary_cv_id'] = primary_cv_id;
    if (userLifecycleState) updateFields['userLifecycleState'] = userLifecycleState;

    const updatedUser = await userRepository.updateById(userId, { $set: updateFields } as any);

    return NextResponse.json({
      success: true,
      data: {
        onboarding: updatedUser?.onboarding,
        userLifecycleState: updatedUser?.userLifecycleState
      }
    });
  } catch (error: any) {
    console.error('Onboarding session update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
