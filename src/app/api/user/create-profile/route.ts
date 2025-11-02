import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      username, 
      location, 
      website, 
      linkedin, 
      github, 
      company, 
      professionalSummary 
    } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    const email = session.user.email;

    // Check if user already exists
    let existingUser = await User.findOne({ email });

    if (existingUser) {
      // Update existing user profile
      existingUser.firstName = firstName.trim();
      existingUser.lastName = lastName.trim();
      if (username) existingUser.username = username.trim();
      if (location) existingUser.location = location.trim();
      if (website) existingUser.website = website.trim();
      if (linkedin) existingUser.linkedin = linkedin.trim();
      if (github) existingUser.github = github.trim();
      if (company) existingUser.company = company.trim();
      if (professionalSummary) existingUser.summary = professionalSummary.trim();
      
      await existingUser.save();

      return NextResponse.json({
        success: true,
        message: 'User profile updated',
        data: {
          id: existingUser._id,
          email: existingUser.email,
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
      isEmailVerified: true, // Google Auth users are pre-verified
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
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
        },
        timezone: 'UTC +07:00 - Asia / Jakarta',
        languagePreference: 'English',
      },
      lastLogin: new Date(),
    };

    console.log('🔍 Creating user with data:', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });

    const newUser = new User(userData);
    await newUser.save();

    console.log('✅ New user created:', newUser._id);

    return NextResponse.json({
      success: true,
      message: 'User profile created successfully',
      data: {
        id: newUser._id,
        email: newUser.email,
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
