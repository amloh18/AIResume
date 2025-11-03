import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

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

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate referral link based on user ID
    const referralLink = `https://cvcircle.com/ref/${user._id.toString()}`;

    // For now, return default referral stats
    // In a real application, you would query a referrals collection
    const referralStats = {
      totalInvites: 0,
      successfulSignups: 0,
      rewardsEarned: 0,
      referralLink: referralLink
    };

    return NextResponse.json({
      success: true,
      stats: referralStats
    });

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
