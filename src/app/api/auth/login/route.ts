import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail, createErrorResponse } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required',
          errors: {
            email: !email ? 'Email is required' : undefined,
            password: !password ? 'Password is required' : undefined
          }
        },
        { status: 400 }
      );
    }

    // Validate email format
    const validatedEmail = validateEmail(email);

    // Find user by email
    const user = await User.findOne({ email: validatedEmail });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          field: 'email'
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          field: 'password'
        },
        { status: 401 }
      );
    }

    // Check if email is verified (optional for now)
    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email address before logging in',
          field: 'email',
          requiresVerification: true
        },
        { status: 403 }
      );
    }

    // Update last login (you might want to add this field to the User model)
    user.updatedAt = new Date();
    await user.save();

    // Return user data without password
    const userResponse = user.toJSON();

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token: 'jwt-token-here' // TODO: Implement JWT token generation
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 