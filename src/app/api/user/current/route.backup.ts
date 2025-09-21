import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, CV } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user from NextAuth session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('❌ /api/user/current - No NextAuth session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 /api/user/current - Found NextAuth user ID:', session.user.id);

    // Find user in database
    const user = await User.findById(session.user.id);

    if (!user) {
      console.log('❌ /api/user/current - User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a master CV
    const masterCV = await CV.findOne({ 
      userId: user._id.toString(), 
      isMaster: true 
    });

    console.log('✅ /api/user/current - User found successfully');
    console.log('🔍 Master CV check:', masterCV ? 'Found' : 'Not found');
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        needsCVSetup: user.needsCVSetup,
        hasMasterCV: !!masterCV, // New field to indicate if user has master CV
        clerkId: user.clerkId, // Keep for backward compatibility
        isEmailVerified: user.isEmailVerified,
        currentPlanKey: user.currentPlanKey,
        monthlyGoal: user.monthlyGoal,
        usage: user.usage,
        subscription: user.subscription,
        settings: user.settings,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        oauthProviders: [] // NextAuth handles OAuth differently
      }
    });

  } catch (error) {
    console.error('❌ /api/user/current - Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
