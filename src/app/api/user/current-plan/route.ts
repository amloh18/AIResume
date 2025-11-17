import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

/**
 * GET /api/user/current-plan
 * 
 * Returns the current user's plan information.
 * Used by payment modal to check user's current subscription status.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Find user with plan information
    const user = await User.findOne({ email: session.user.email })
      .select('currentPlanKey subscription credits')
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Format plan data for frontend
    const planData = {
      currentPlanKey: user.currentPlanKey || 'free',
      subscription: user.subscription || null,
      credits: user.credits || null
    };

    return NextResponse.json({
      success: true,
      ...planData
    });

  } catch (error) {
    console.error('Error fetching current plan:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

