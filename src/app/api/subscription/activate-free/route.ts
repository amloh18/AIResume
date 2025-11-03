import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const { planKey } = body;

    // Validate plan key
    if (planKey !== 'free') {
      return NextResponse.json({ error: 'Only free plans can be activated without payment' }, { status: 400 });
    }

    // Get the plan from database
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user's current plan and subscription
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        currentPlanKey: planKey,
        subscription: {
          planKey: planKey,
          status: 'active',
          startDate: new Date(),
          provider: 'none',
          interval: 'one-time',
          seats: plan.maxCVs === -1 ? 1 : plan.maxCVs,
          storageUsed: 0
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Free plan activated successfully',
      user: {
        currentPlanKey: updatedUser.currentPlanKey,
        subscription: updatedUser.subscription
      }
    });

  } catch (error) {
    console.error('Free plan activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
