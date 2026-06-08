import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { invalidateCache } from '@/lib/cache';

export async function PATCH(request: NextRequest) {
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

    // Check if user is a B2B admin or superadmin
    const isB2bAdmin = user.b2b && (user.role === 'admin' || user.role === 'superadmin');
    if (!isB2bAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only B2B admins can complete onboarding' },
        { status: 403 }
      );
    }

    // Mark B2B onboarding as complete
    if (!user.b2b) {
      user.b2b = {} as any;
    }
    user.b2b.setupComplete = true;
    await user.save();

    // Invalidate user cache to force fresh data fetch
    await invalidateCache(`user:${user._id.toString()}`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'B2B onboarding completed successfully',
        b2b: {
          tenantId: user.b2b.tenantId,
          role: user.b2b.role,
          setupComplete: true,
        },
      },
    });
  } catch (error) {
    console.error('Error completing B2B onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
