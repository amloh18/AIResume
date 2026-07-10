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
    let user = await User.findOne({ email: userEmail })
      .select('firstName lastName email username avatar role isEmailVerified currentPlanKey subscription settings authProvider createdAt updatedAt phone location website linkedin github summary company address jobTitle industry experience dateOfBirth gender nationality')
      .lean()
      .exec() as any;

    let isAdminAuthUser = false;
    if (!user) {
      const AdminAuth = (await import('@/models/AdminAuth')).default;
      user = await AdminAuth.findOne({ email: userEmail }).lean().exec();
      if (user) {
        isAdminAuthUser = true;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { currentPlanKey, subscription } = !isAdminAuthUser
      ? subscriptionService.getEffectivePlan(user)
      : { currentPlanKey: 'pro_lifetime', subscription: { status: 'active', planKey: 'pro_lifetime' } };

    // Format user data for frontend
    const userData = {
      id: user._id.toString(),
      firstName: !isAdminAuthUser ? user.firstName : 'Admin',
      lastName: !isAdminAuthUser ? user.lastName : 'User',
      name: !isAdminAuthUser ? `${user.firstName} ${user.lastName}` : 'Admin User',
      email: user.email,
      username: !isAdminAuthUser ? user.username : undefined,
      avatar: !isAdminAuthUser ? user.avatar : undefined,
      role: user.role || (isAdminAuthUser ? 'admin' : 'user'),
      isEmailVerified: !isAdminAuthUser ? user.isEmailVerified : true,
      authProvider: !isAdminAuthUser ? user.authProvider : 'local',
      currentPlanKey,
      subscription,
      settings: !isAdminAuthUser ? user.settings : { theme: 'dark', timezone: 'UTC', languagePreference: 'en' },
      phone: !isAdminAuthUser ? user.phone : undefined,
      location: !isAdminAuthUser ? user.location : undefined,
      website: !isAdminAuthUser ? user.website : undefined,
      linkedin: !isAdminAuthUser ? user.linkedin : undefined,
      github: !isAdminAuthUser ? user.github : undefined,
      summary: !isAdminAuthUser ? user.summary : undefined,
      company: !isAdminAuthUser ? user.company : undefined,
      address: !isAdminAuthUser ? user.address : undefined,
      jobTitle: !isAdminAuthUser ? user.jobTitle : undefined,
      industry: !isAdminAuthUser ? user.industry : undefined,
      experience: !isAdminAuthUser ? user.experience : undefined,
      dateOfBirth: !isAdminAuthUser ? user.dateOfBirth : undefined,
      gender: !isAdminAuthUser ? user.gender : undefined,
      nationality: !isAdminAuthUser ? user.nationality : undefined,
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
    const { 
      firstName, lastName, username, avatar, 
      phone, location, website, linkedin, github, summary, 
      company, address, dateOfBirth, gender, nationality,
      experience, settings 
    } = body;

    // Find user
    let user = await User.findOne({ email: userEmail });
    let isAdminAuthUser = false;

    if (!user) {
      // Fallback: Check AdminAuth collection
      const AdminAuth = (await import('@/models/AdminAuth')).default;
      user = await AdminAuth.findOne({ email: userEmail });
      if (user) {
        isAdminAuthUser = true;
      }
    }

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
    if (firstName !== undefined && !isAdminAuthUser) user.firstName = firstName;
    if (lastName !== undefined && !isAdminAuthUser) user.lastName = lastName;
    if (avatar !== undefined && !isAdminAuthUser) user.avatar = avatar;
    
    // Update profile fields (only for regular users)
    if (!isAdminAuthUser) {
      if (phone !== undefined) user.phone = phone;
      if (location !== undefined) user.location = location;
      if (website !== undefined) user.website = website;
      if (linkedin !== undefined) user.linkedin = linkedin;
      if (github !== undefined) user.github = github;
      if (summary !== undefined) user.summary = summary;
      if (company !== undefined) user.company = company;
      if (address !== undefined) user.address = address;
      if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
      if (gender !== undefined) user.gender = gender;
      if (nationality !== undefined) user.nationality = nationality;
      if (experience !== undefined) user.experience = experience;
    }
    
    // Update settings (only for regular users)
    if (settings !== undefined && !isAdminAuthUser) {
      // Merge settings while preserving existing structure
      const currentSettings = user.settings || {
        theme: 'auto',
        notifications: { email: true, push: true },
        timezone: 'UTC',
        languagePreference: 'en'
      };

      user.settings = {
        ...currentSettings,
        ...settings,
        notifications: {
          ...(currentSettings.notifications || { email: true, push: true }),
          ...(settings.notifications || {})
        }
      };
    }

    console.log('User before save:', {
      email: user.email,
      isAdminAuthUser,
      role: user.role
    });

    try {
      // Bypass validation for superadmins and AdminAuth users to avoid stale enum issues
      const skipValidation = isAdminAuthUser || user.role === 'superadmin';
      await user.save({ validateBeforeSave: !skipValidation });
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

    const { currentPlanKey, subscription } = !isAdminAuthUser 
      ? subscriptionService.getEffectivePlan(user)
      : { currentPlanKey: 'pro_lifetime', subscription: { status: 'active', planKey: 'pro_lifetime' } };

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        firstName: !isAdminAuthUser ? user.firstName : 'Admin',
        lastName: !isAdminAuthUser ? user.lastName : 'User',
        name: !isAdminAuthUser ? `${user.firstName} ${user.lastName}` : 'Admin User',
        email: user.email,
        username: !isAdminAuthUser ? user.username : undefined,
        avatar: !isAdminAuthUser ? user.avatar : undefined,
        role: user.role,
        isEmailVerified: !isAdminAuthUser ? user.isEmailVerified : true,
        currentPlanKey,
        subscription,
        settings: !isAdminAuthUser ? user.settings : { theme: 'dark', timezone: 'UTC', languagePreference: 'en' },
        phone: !isAdminAuthUser ? user.phone : undefined,
        location: !isAdminAuthUser ? user.location : undefined,
        website: !isAdminAuthUser ? user.website : undefined,
        linkedin: !isAdminAuthUser ? user.linkedin : undefined,
        github: !isAdminAuthUser ? user.github : undefined,
        summary: !isAdminAuthUser ? user.summary : undefined,
        company: !isAdminAuthUser ? user.company : undefined,
        address: !isAdminAuthUser ? user.address : undefined,
        dateOfBirth: !isAdminAuthUser ? user.dateOfBirth : undefined,
        gender: !isAdminAuthUser ? user.gender : undefined,
        nationality: !isAdminAuthUser ? user.nationality : undefined,
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
