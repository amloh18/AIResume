import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = authResult;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyGoal: user.monthlyGoal || 10,
        cvGoal: user.settings?.goals?.cvGoal || 5,
        interviewGoal: user.settings?.goals?.interviewGoal || 2
      }
    });

  } catch (error: any) {
    console.error('Fetch goals error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = authResult;
    const body = await request.json();
    const { monthlyGoal, cvGoal, interviewGoal } = body;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update user goals
    if (monthlyGoal !== undefined) user.monthlyGoal = monthlyGoal;
    
    // We'll store cvGoal and interviewGoal in the settings or a dedicated field if needed,
    // but for now let's use the metadata or settings.
    if (!user.settings) user.settings = {};
    if (!user.settings.goals) user.settings.goals = {};
    
    if (cvGoal !== undefined) user.settings.goals.cvGoal = cvGoal;
    if (interviewGoal !== undefined) user.settings.goals.interviewGoal = interviewGoal;

    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        monthlyGoal: user.monthlyGoal,
        cvGoal: user.settings.goals.cvGoal,
        interviewGoal: user.settings.goals.interviewGoal
      }
    });

  } catch (error: any) {
    console.error('Update goals error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update goals' },
      { status: 500 }
    );
  }
}
