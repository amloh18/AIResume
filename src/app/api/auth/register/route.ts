import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail, validatePassword, createErrorResponse } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          message: 'All fields are required',
          errors: {
            email: !email ? 'Email is required' : undefined,
            password: !password ? 'Password is required' : undefined,
            firstName: !firstName ? 'First name is required' : undefined,
            lastName: !lastName ? 'Last name is required' : undefined
          }
        },
        { status: 400 }
      );
    }

    // Validate email and password
    const validatedEmail = validateEmail(email);
    const validatedPassword = validatePassword(password);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedEmail });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User with this email already exists',
          field: 'email'
        },
        { status: 409 }
      );
    }

    // Create new user
    const user = new User({
      email: validatedEmail,
      password: validatedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      subscription: {
        planKey: 'free',
        status: 'inactive',
        startDate: new Date(),
        provider: 'stripe',
        interval: 'monthly',
        seats: 3,
        storageUsed: 0
      },
      settings: {
        theme: 'auto',
        notifications: {
          email: true,
          push: true
        }
      }
    });

    await user.save();

    // Return user data without password
    const userResponse = user.toJSON();

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token: 'jwt-token-here' // TODO: Implement JWT token generation
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        statusCode: 400
      }, { status: 400 });
    }
    
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 