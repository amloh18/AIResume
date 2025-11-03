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
    const masterCV = await CV.findOne({ userId: user._id, isMasterCV: true });
    const hasMasterCV = !!masterCV;

    // Get welcome status from user settings
    const hasSeenWelcome = user.settings?.hasSeenWelcome || false;

    return NextResponse.json({
      success: true,
      data: {
        isNewUser,
        hasMasterCV,
        hasSeenWelcome,
        subscription: user.subscription
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

    await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          'settings.hasSeenWelcome': body.hasSeenWelcome !== undefined ? body.hasSeenWelcome : true
        }
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


