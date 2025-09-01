import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username can only contain letters, numbers, hyphens, and underscores'
        },
        { status: 400 }
      );
    }

    // Check username length
    if (username.length < 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username must be at least 3 characters long'
        },
        { status: 400 }
      );
    }

    if (username.length > 30) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username cannot exceed 30 characters'
        },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      email: { $ne: session.user.email } // Exclude current user
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username is already taken by another user'
        },
        { status: 409 }
      );
    }

    console.log('🔍 Updating username for user:', session.user.email);
    console.log('🔍 New username:', username.toLowerCase());
    
    // Update the user's username
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { username: username.toLowerCase() },
      { new: true, runValidators: true }
    );
    
    console.log('🔍 Update result:', updatedUser ? 'Success' : 'User not found');
    if (updatedUser) {
      console.log('🔍 Updated username:', updatedUser.username);
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Username updated successfully',
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
        avatar: updatedUser.avatar,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Error updating username:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username is already taken'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
