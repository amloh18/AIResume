import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, firebaseUid, firstName, lastName } = body;

    if (!email || !firebaseUid || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'Email, Firebase UID, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser = await User.findOne({ email });

    if (existingUser) {
      // Update existing user with Firebase UID
      existingUser.firebaseUid = firebaseUid;
      await existingUser.save();

      return NextResponse.json({
        success: true,
        message: 'User updated with Firebase UID',
        data: {
          id: existingUser._id,
          email: existingUser.email,
          firebaseUid: existingUser.firebaseUid
        }
      });
    }

    // Create new user
    const newUser = new User({
      email,
      firstName,
      lastName,
      isEmailVerified: true,
      role: 'user',
      currentPlanKey: 'free',
      authProvider: 'nextauth',
      firebaseUid,
    });

    await newUser.save();

    return NextResponse.json({
      success: true,
      message: 'New user created with Firebase UID',
      data: {
        id: newUser._id,
        email: newUser.email,
        firebaseUid: newUser.firebaseUid
      }
    });

  } catch (error: any) {
    console.error('Create Firebase user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test database connection
    await connectDB();
    console.log('✅ Database connected successfully');

    // Test user creation
    const testUser = new User({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      role: 'user',
      currentPlanKey: 'free',
      authProvider: 'nextauth',
    });

    // Validate without saving
    const validationError = testUser.validateSync();
    if (validationError) {
      console.error('❌ User validation failed:', validationError);
      return NextResponse.json({
        success: false,
        error: 'User validation failed',
        details: validationError.message
      });
    }

    console.log('✅ User validation passed');

    return NextResponse.json({
      success: true,
      message: 'Database connection and user validation successful',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}