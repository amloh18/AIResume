import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import CV from '@/models/CV';
import subscriptionService from '@/lib/services/subscriptionService';

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

    // Find user with optimized query
    const user = await User.findOne({ email: session.user.email })
      .select('firstName lastName email username avatar role isEmailVerified authProvider currentPlanKey subscription settings createdAt updatedAt')
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a master CV
    const masterCVCount = await CV.countDocuments({
      userId: user._id,
      $or: [
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { cvType: 'master' },
        { 'metadata.createdVia': 'ai-career-report' }
      ]
    });

    const { currentPlanKey, subscription } = subscriptionService.getEffectivePlan(user);

    // Format user data for frontend
    const userData = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider,
      currentPlanKey,
      subscription,
      settings: user.settings,
      hasMasterCV: masterCVCount > 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
