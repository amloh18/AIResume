import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      idToken, 
      firstName, 
      lastName, 
      username, 
      email, 
      location, 
      website, 
      linkedin, 
      github, 
      company, 
      professionalSummary 
    } = body;

    // Validate required fields
    if (!idToken || !firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid Firebase token' },
        { status: 401 }
      );
    }

    const firebaseUid = decodedToken.uid;
    const firebaseEmail = decodedToken.email;

    // Verify email matches
    if (firebaseEmail !== email) {
      return NextResponse.json(
        { success: false, error: 'Email mismatch with Firebase token' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser = await User.findOne({ 
      $or: [
        { email: email },
        { firebaseUid: firebaseUid }
      ]
    });

    if (existingUser) {
      // Update existing user with Firebase UID if not already set
      if (!existingUser.firebaseUid) {
        existingUser.firebaseUid = firebaseUid;
        await existingUser.save();
      }

      return NextResponse.json({
        success: true,
        message: 'User profile updated',
        data: {
          id: existingUser._id,
          email: existingUser.email,
          firebaseUid: existingUser.firebaseUid,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName
        }
      });
    }

    // Check username uniqueness if provided
    if (username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return NextResponse.json(
          { success: false, error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    // Create new user
    const userData = {
      email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username?.trim() || undefined,
      location: location?.trim() || undefined,
      website: website?.trim() || undefined,
      linkedin: linkedin?.trim() || undefined,
      github: github?.trim() || undefined,
      company: company?.trim() || undefined,
      summary: professionalSummary?.trim() || undefined,
      firebaseUid,
      isEmailVerified: true, // Firebase users are pre-verified
      role: 'user',
      currentPlanKey: 'free',
      authProvider: 'firebase',
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

    console.log('🔍 Creating Firebase user with data:', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      firebaseUid: userData.firebaseUid
    });

    const newUser = new User(userData);
    await newUser.save();

    console.log('✅ New Firebase user created:', newUser._id);

    return NextResponse.json({
      success: true,
      message: 'User profile created successfully',
      data: {
        id: newUser._id,
        email: newUser.email,
        firebaseUid: newUser.firebaseUid,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Create profile error:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { success: false, error: `${field} already exists` },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create user profile' },
      { status: 500 }
    );
  }
}
