import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, ...profileData } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'Firebase ID token is required' },
        { status: 400 }
      );
    }

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    const { uid, email, email_verified } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: 'Invalid Firebase token' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        { email: email }
      ]
    });

    if (existingUser) {
      // User already exists, update their profile with new data
      console.log('User already exists, updating profile for UID:', uid);
      
      // Update existing user with new profile data
      const updateData: any = {
        firstName: firstName,
        lastName: lastName,
        avatar: profileData.avatar || existingUser.avatar,
        location: profileData.location || existingUser.location,
        website: profileData.website || existingUser.website,
        linkedin: profileData.linkedin || existingUser.linkedin,
        github: profileData.github || existingUser.github,
        company: profileData.company || existingUser.company,
        professionalSummary: profileData.professionalSummary || existingUser.professionalSummary,
        lastLogin: new Date(),
      };

      // Only update username if it's provided and unique
      if (username) {
        const usernameExists = await User.findOne({ 
          username, 
          _id: { $ne: existingUser._id } 
        });
        if (!usernameExists) {
          updateData.username = username;
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        existingUser._id,
        updateData,
        { new: true, runValidators: true }
      );

      return NextResponse.json(
        { 
          success: true, 
          userId: updatedUser._id,
          message: 'Profile updated successfully' 
        },
        { status: 200 }
      );
    }

    // Validate required fields
    const { firstName, lastName, username } = profileData;
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Check if username is unique (if provided)
    if (username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    // Create new user profile
    const newUser = new User({
      firebaseUid: uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      username: username || undefined,
      avatar: profileData.avatar || '',
      location: profileData.location || '',
      website: profileData.website || '',
      linkedin: profileData.linkedin || '',
      github: profileData.github || '',
      company: profileData.company || '',
      professionalSummary: profileData.professionalSummary || '',
      isEmailVerified: email_verified,
      role: 'user',
      currentPlanKey: 'free',
      monthlyGoal: 20,
      usage: {
        cvJourneyCount: 0,
        cvCreatedCount: 0,
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
    });

    await newUser.save();

    return NextResponse.json(
      { 
        success: true, 
        userId: newUser._id,
        message: 'Profile created successfully' 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
