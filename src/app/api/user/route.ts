import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import subscriptionService from '@/lib/services/subscriptionService';

// Extend global type for cache
declare global {
  var userCache: Map<string, { data: any; timestamp: number }> | undefined;
  var journeysCache: Map<string, { data: any; timestamp: number }> | undefined;
}

// Cache cleanup utility
function cleanupExpiredCache(cache: Map<string, { data: any; timestamp: number }> | undefined, cacheName: string) {
  if (!cache) return;

  const now = Date.now();
  const CACHE_DURATION = cacheName === 'journeys' ? 30000 : 60000;
  const expiredKeys: string[] = [];

  Array.from(cache.entries()).forEach(([key, value]) => {
    if ((now - value.timestamp) > CACHE_DURATION) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => cache.delete(key));

  if (expiredKeys.length > 0) {
    console.log(`🧹 Cleaned up ${expiredKeys.length} expired entries from ${cacheName} cache`);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let dbConnection = null;

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
      dbConnection = await getConnection();
      const firebaseUser = await User.findOne({ authProviderId: firebaseUserId });
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

    // Check cache first
    const cacheKey = `user_${userEmail}`;
    const cachedData = global.userCache?.get(cacheKey);
    const CACHE_DURATION = 60000; // 1 minute cache for user data

    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log('🔍 User API - Returning cached data');
      return NextResponse.json(cachedData.data);
    }

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupExpiredCache(global.userCache, 'user');
    }

    if (!dbConnection) {
      dbConnection = await getConnection();
    }

    // Find user with optimized query
    const user = await User.findOne({ email: userEmail })
      .select('firstName lastName email username avatar role isEmailVerified currentPlanKey subscription settings authProvider createdAt updatedAt')
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const responseData = {
      success: true,
      user: userData,
      _performance: {
        queryTime: Date.now() - startTime
      }
    };

    // Cache the response
    if (!global.userCache) {
      global.userCache = new Map();
    }
    global.userCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log(`✅ User API - Completed in ${Date.now() - startTime}ms`);

    return NextResponse.json(responseData);

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
      await getConnection();
      const firebaseUser = await User.findOne({ authProviderId: firebaseUserId });
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

    await getConnection();

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

    const { currentPlanKey, subscription } = subscriptionService.getEffectivePlan(user);

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
        currentPlanKey,
        subscription,
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
