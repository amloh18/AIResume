import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required'
        },
        { status: 400 }
      );
    }

    const validatedEmail = validateEmail(email);

    // Check if user exists
    const existingUser = await User.findOne({ email: validatedEmail });
    
    return NextResponse.json({
      success: true,
      exists: !!existingUser,
      message: existingUser ? 'Email already exists' : 'Email is available'
    });

  } catch (error: any) {
    console.error('Email check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Error checking email availability',
        error: error.message
      },
      { status: 500 }
    );
  }
} 