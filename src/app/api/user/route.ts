import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
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

    await connectDB();

    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

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
      currentPlanKey: user.currentPlanKey,
      subscription: user.subscription,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check for Firebase user ID in headers or query params
    const firebaseUserId = request.headers.get('x-firebase-user-id') || 
                          request.nextUrl.searchParams.get('firebaseUserId');
    
    let userEmail: string | undefined;
    
    if (session?.user?.email) {
      // NextAuth user
      userEmail = session.user.email;
    } else if (firebaseUserId) {
      // Firebase user - get user by Firebase UID
      await connectDB();
      const firebaseUser = await User.findOne({ firebaseUid: firebaseUserId });
      if (firebaseUser) {
        userEmail = firebaseUser.email;
      }
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { firstName, lastName, username, avatar, phone, location, website, linkedin, github, summary, settings } = body;

    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check username uniqueness if username is being updated
    if (username !== undefined && username !== user.username) {
      if (username.trim() === '') {
        // Allow empty username
        user.username = undefined;
      } else {
        // Check if username is already taken by another user
        const existingUser = await User.findOne({ 
          username: username.toLowerCase().trim(),
          _id: { $ne: user._id }
        });
        if (existingUser) {
          return NextResponse.json(
            { success: false, error: 'Username is already taken' },
            { status: 400 }
          );
        }
        user.username = username.toLowerCase().trim();
      }
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (avatar !== undefined) user.avatar = avatar;
    
    // Update profile fields
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (github !== undefined) user.github = github;
    if (summary !== undefined) user.summary = summary;
    
    // Update settings
    if (settings !== undefined) {
      // Merge settings while preserving existing structure
      user.settings = {
        ...user.settings,
        ...settings,
        notifications: {
          ...user.settings.notifications,
          ...(settings.notifications || {})
        }
      };
    }

    console.log('User before save:', {
      firstName: user.firstName,
      lastName: user.lastName,
      settings: user.settings
    });

    try {
      await user.save();
      console.log('User saved successfully');
    } catch (saveError: any) {
      console.error('Save error:', saveError);
      // Check if it's a validation error
      if (saveError.name === 'ValidationError') {
        const errors = Object.values(saveError.errors).map((err: any) => err.message);
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to save user', details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        currentPlanKey: user.currentPlanKey,
        subscription: user.subscription,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
