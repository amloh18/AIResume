import { NextRequest, NextResponse } from 'next/server';
import connectDB, { healthCheck, isConnected, getConnectionStatus } from '@/lib/database';
import { userService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test database connection
    await connectDB();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const userCount = await userService.count();
    console.log('✅ User count query successful:', userCount);
    
    // Test environment variables
    const envInfo = {
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriLength: process.env.MONGODB_URI?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL
    };
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      data: {
        userCount,
        envInfo,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection test failed',
      error: error.message,
      stack: error.stack,
      envInfo: {
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriLength: process.env.MONGODB_URI?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    await connectDB();
    
    // Check if user already exists
    const existingUser = await userService.findOne({ email: 'jamie@gmail.com' });
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
    const testUser = await userService.create({
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
    const result = await userService.bulkUpdate(
      { isEmailVerified: false },
      { 
        isEmailVerified: true,
        'subscription.status': 'active'
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