import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail, createErrorResponse } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  // Add CORS headers for Vercel
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    console.log('🔐 Login attempt started');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected for login');
    
    const body = await request.json();
    const { email, password } = body;

    console.log('📧 Login attempt for email:', email);

    // Validate required fields
    if (!email || !password) {
      console.log('❌ Missing email or password');
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
    console.log('✅ Email validated:', validatedEmail);

    // Find user by email
    const user = await User.findOne({ email: validatedEmail });
    if (!user) {
      console.log('❌ User not found for email:', validatedEmail);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          field: 'email'
        },
        { status: 401 }
      );
    }

    console.log('✅ User found, verifying password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', validatedEmail);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          field: 'password'
        },
        { status: 401 }
      );
    }

    console.log('✅ Password verified successfully');

    // Check if email is verified (temporarily disabled for testing)
    // TODO: Re-enable email verification after initial testing
    /*
    if (!user.isEmailVerified) {
      console.log('⚠️ Email not verified for user:', validatedEmail);
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
    */

    // Update last login
    user.updatedAt = new Date();
    await user.save();
    console.log('✅ User login timestamp updated');

    // Return user data without password
    const userResponse = user.toJSON();
    console.log('✅ Login successful for user:', validatedEmail);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token: 'jwt-token-here' // TODO: Implement JWT token generation
      }
    });

  } catch (error: any) {
    console.error('❌ Login error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Database connection error. Please try again later.',
          error: 'DATABASE_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }

    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 