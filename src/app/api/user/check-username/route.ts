import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check for Firebase user ID in headers or query params
    const firebaseUserId = request.headers.get('x-firebase-user-id') || 
                          request.nextUrl.searchParams.get('firebaseUserId');
    
    let userEmail: string | undefined;
    let userId: string | undefined;
    
    if (session?.user?.email) {
      // NextAuth user
      userEmail = session.user.email;
    } else if (firebaseUserId) {
      // Firebase user - get user by Firebase UID
      await connectDB();
      const firebaseUser = await User.findOne({ firebaseUid: firebaseUserId });
      if (firebaseUser) {
        userEmail = firebaseUser.email;
        userId = firebaseUser._id.toString();
      }
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username || username.trim() === '') {
      return NextResponse.json({
        success: true,
        available: true,
        message: 'Empty username is allowed'
      });
    }

    await connectDB();

    // Find current user
    const currentUser = await User.findOne({ email: userEmail });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username: username.toLowerCase().trim(),
      _id: { $ne: currentUser._id }
    });

    const isAvailable = !existingUser;

    return NextResponse.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    });

  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}