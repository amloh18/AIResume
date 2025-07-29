import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User, CV, JobApplication, CoverLetter } from '@/models';

export async function GET() {
  try {
    // Connect to database
    await connectDB();
    
    // Get counts for each collection
    const userCount = await User.countDocuments();
    const cvCount = await CV.countDocuments();
    const jobApplicationCount = await JobApplication.countDocuments();
    const coverLetterCount = await CoverLetter.countDocuments();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: {
        collections: {
          users: userCount,
          cvs: cvCount,
          jobApplications: jobApplicationCount,
          coverLetters: coverLetterCount
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Create a test user
    const testUser = new User({
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
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
      message: 'Test user created successfully',
      data: {
        userId: testUser._id,
        email: testUser.email,
        createdAt: testUser.createdAt
      }
    });
  } catch (error: any) {
    console.error('Test user creation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create test user',
        error: error.message
      },
      { status: 500 }
    );
  }
} 