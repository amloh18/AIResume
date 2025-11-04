import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    try {
      await getConnection();
    } catch (dbError: any) {
      console.error('❌ MongoDB connection error in check-email:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database connection failed. Please try again later.',
          error: 'DATABASE_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }

    try {
      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      
      return NextResponse.json({
        success: true,
        exists: !!existingUser,
        isEmailVerified: existingUser?.isEmailVerified || false
      });
    } catch (queryError: any) {
      console.error('❌ Database query error in check-email:', queryError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to check email. Please try again later.',
          error: 'DATABASE_QUERY_ERROR'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Check email error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check email' },
      { status: 500 }
    );
  }
}