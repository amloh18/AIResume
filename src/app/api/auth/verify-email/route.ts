import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail, createErrorResponse } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { email } = body;

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
    
    const user = await User.findOne({ email: validatedEmail });
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found'
        },
        { status: 404 }
      );
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error: any) {
    console.error('Email verification error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 