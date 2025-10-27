import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
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

    await connectDB();

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    return NextResponse.json({
      success: true,
      exists: !!existingUser
    });

  } catch (error: any) {
    console.error('❌ Check email error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check email' },
      { status: 500 }
    );
  }
}