import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Get all users (for debugging)
    const users = await User.find({}, { password: 0, emailVerificationToken: 0, resetPasswordToken: 0 });
    
    return NextResponse.json({ 
      success: true, 
      message: '✅ MongoDB connection successful!',
      timestamp: new Date().toISOString(),
      users: users
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: '❌ MongoDB connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    await connectDB();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'jamie@gmail.com' });
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        data: {
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          isEmailVerified: existingUser.isEmailVerified
        }
      });
    }
    
    // Create test user
    const testUser = new User({
      email: 'jamie@gmail.com',
      password: 'Jamie@123',
      firstName: 'Jamie',
      lastName: 'Test',
      isEmailVerified: true, // Set to true to bypass email verification
      subscription: {
        plan: 'basic',
        status: 'active',
        startDate: new Date(),
        seats: 3,
        storageUsed: 0
      }
    });
    
    await testUser.save();
    
    return NextResponse.json({
      success: true,
      message: '✅ Test user created successfully!',
      data: {
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        isEmailVerified: testUser.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Test user creation error:', error);
    return NextResponse.json({ 
      success: false, 
      message: '❌ Failed to create test user',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT() {
  try {
    await connectDB();
    
    // Verify all users for testing
    const result = await User.updateMany(
      { isEmailVerified: false },
      { 
        $set: { 
          isEmailVerified: true,
          'subscription.status': 'active'
        } 
      }
    );
    
    return NextResponse.json({
      success: true,
      message: `✅ Verified ${result.modifiedCount} users for testing!`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('User verification error:', error);
    return NextResponse.json({ 
      success: false, 
      message: '❌ Failed to verify users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 