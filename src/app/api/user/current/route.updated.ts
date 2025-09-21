import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, CV } from '@/models';
import { extractUserIdentifier } from '@/lib/firebase-uid-utils';

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

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ /api/user/current - No valid user identifier found');
      return NextResponse.json({ error: 'User identification failed' }, { status: 401 });
    }

    console.log('🔍 /api/user/current - User identifier:', userIdentifier);

    // Find user in database based on identifier type
    let user;
    
    if (userIdentifier.type === 'firebase') {
      // For Firebase users, find by Firebase UID
      user = await User.findOne({ firebaseUid: userIdentifier.id });
    } else {
      // For traditional users, find by MongoDB ObjectId
      user = await User.findById(userIdentifier.id);
    }

    if (!user) {
      console.log('❌ /api/user/current - User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a master CV based on identifier type
    let masterCV;
    
    if (userIdentifier.type === 'firebase') {
      masterCV = await CV.findOne({ 
        firebaseUid: userIdentifier.id, 
        isMaster: true 
      });
    } else {
      masterCV = await CV.findOne({ 
        userId: user._id.toString(), 
        isMaster: true 
      });
    }

    console.log('✅ /api/user/current - User found successfully');
    console.log('🔍 Master CV check:', masterCV ? 'Found' : 'Not found');
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        userRole: user.userRole,
        isEmailVerified: user.isEmailVerified,
        currentPlanKey: user.currentPlanKey,
        monthlyGoal: user.monthlyGoal,
        usage: user.usage,
        subscription: user.subscription,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasProfile: !!(user.firstName && user.lastName),
        hasMasterCV: !!masterCV,
        firebaseUid: user.firebaseUid // Include Firebase UID in response
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
