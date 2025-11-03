import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userEmail = authResult.userEmail;
    const userId = authResult.userId;
    
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

    await getConnection();

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