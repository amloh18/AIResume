import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { createErrorResponse } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const body = await request.json();
    const { email, name, image, provider, firebaseUid, authProviderId } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user for Google OAuth
      const nameParts = name?.split(' ') || ['User'];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const userData = {
        email,
        firstName,
        lastName,
        avatar: image,
        firebaseUid: firebaseUid || undefined, // Store Firebase UID if provided
        authProviderId: authProviderId || undefined, // Store authProviderId if provided
        isEmailVerified: true, // Google OAuth users are pre-verified
        role: 'user',
        currentPlanKey: 'free',
        authProvider: 'nextauth',
        monthlyGoal: 20,
        usage: {
          cvJourneyCount: 0,
          cvCreatedCount: 0,
          journeysCreated: 0,
          exportCount: 0,
          atsCheckCount: 0,
          lastResetDate: new Date(),
        },
        subscription: {
          planKey: 'free',
          status: 'inactive',
          startDate: new Date(),
          provider: 'stripe',
          interval: 'monthly',
          seats: 3,
          storageUsed: 0,
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true,
          },
          timezone: 'UTC +07:00 - Asia / Jakarta',
          languagePreference: 'English',
        },
        lastLogin: new Date(),
      };
      
      console.log('🔍 Creating user with data:', userData);
      user = new User(userData);
      
      await user.save();
      console.log('✅ New Google OAuth user created:', user._id);
    } else {
      // Update existing user
      user.avatar = image || user.avatar;
      if (firebaseUid && !user.firebaseUid) {
        user.firebaseUid = firebaseUid;
      }
      if (authProviderId && !user.authProviderId) {
        user.authProviderId = authProviderId;
      }
      if (!user.authProvider) {
        user.authProvider = 'nextauth';
      }
      user.lastLogin = new Date();
      await user.save();
      console.log('✅ Existing Google OAuth user updated:', user._id);
    }

    // Return user data without sensitive information
    const userResponse = user.toJSON();

    return NextResponse.json({
      success: true,
      message: 'Google OAuth user processed successfully',
      data: {
        user: userResponse,
        isNewUser: !user.lastLogin || (new Date().getTime() - user.lastLogin.getTime()) < 5000
      }
    });

  } catch (error: any) {
    console.error('Google OAuth user processing error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user
    });

  } catch (error: any) {
    console.error('Get Google OAuth user error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
