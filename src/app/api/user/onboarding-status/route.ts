import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is new (created in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isNewUser = user.createdAt > fiveMinutesAgo;

    // Check if user has a Master CV
    const masterCV = await CV.findOne({ userId: user._id, 'metadata.isMaster': true });
    const hasMasterCV = !!masterCV;

    // Get welcome status from user settings
    const hasSeenWelcome = user.settings?.hasSeenWelcome || false;

    return NextResponse.json({
      success: true,
      data: {
        isNewUser,
        hasMasterCV,
        hasSeenWelcome,
        subscription: user.subscription,
        onboarding: user.onboarding || {}
      }
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    await getConnection();

    const updateFields: any = {};
    if (body.hasSeenWelcome !== undefined) {
      updateFields['settings.hasSeenWelcome'] = body.hasSeenWelcome;
    }

    if (body.onboarding) {
      if (body.onboarding.primary_goal !== undefined) updateFields['onboarding.primary_goal'] = body.onboarding.primary_goal;
      if (body.onboarding.confidence_score !== undefined) updateFields['onboarding.confidence_score'] = body.onboarding.confidence_score;
      if (body.onboarding.recommended_plan !== undefined) updateFields['onboarding.recommended_plan'] = body.onboarding.recommended_plan;
      if (body.onboarding.activation_status !== undefined) updateFields['onboarding.activation_status'] = body.onboarding.activation_status;
      if (body.onboarding.activation_route !== undefined) updateFields['onboarding.activation_route'] = body.onboarding.activation_route;
      if (body.onboarding.dashboard_layout_type !== undefined) updateFields['onboarding.dashboard_layout_type'] = body.onboarding.dashboard_layout_type;
    } else {
      if (body.primary_goal !== undefined) updateFields['onboarding.primary_goal'] = body.primary_goal;
      if (body.confidence_score !== undefined) updateFields['onboarding.confidence_score'] = body.confidence_score;
      if (body.recommended_plan !== undefined) updateFields['onboarding.recommended_plan'] = body.recommended_plan;
      if (body.activation_status !== undefined) updateFields['onboarding.activation_status'] = body.activation_status;
      if (body.activation_route !== undefined) updateFields['onboarding.activation_route'] = body.activation_route;
      if (body.dashboard_layout_type !== undefined) updateFields['onboarding.dashboard_layout_type'] = body.dashboard_layout_type;
    }

    await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: updateFields
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


