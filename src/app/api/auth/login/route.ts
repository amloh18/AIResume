import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail, createErrorResponse } from '@/lib/db-utils';
import { generateTokenPair, getClientIP } from '@/lib/jwt';
import { createSession, saveSessionToResponse, validateCSRFFromRequest } from '@/lib/session';

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `login_${ip}`;
  const attempts = loginAttempts.get(key);
  
  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login attempt started');
    
    // Rate limiting by IP
    const clientIP = getClientIP(request);
    if (!checkLoginRateLimit(clientIP)) {
      console.log('❌ Rate limit exceeded for IP:', clientIP);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    // CSRF validation for state-changing operations (relaxed for login)
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // Only validate CSRF if token is present (allow login without CSRF for initial attempts)
      const csrfHeader = request.headers.get('x-csrf-token');
      if (csrfHeader) {
        const isValidCSRF = validateCSRFFromRequest(request);
        if (!isValidCSRF) {
          console.log('❌ CSRF validation failed');
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid CSRF token',
              error: 'CSRF_VALIDATION_FAILED'
            },
            { status: 403 }
          );
        }
      }
    }
    
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

    // Find user by email (include password field for comparison)
    const user = await User.findOne({ email: validatedEmail }).select('+password');
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

    // Fix any invalid provider values before saving
    if (user.subscription?.provider && !['stripe', 'razorpay', 'admin'].includes(user.subscription.provider)) {
      console.log(`⚠️ Fixing invalid provider value: ${user.subscription.provider} -> stripe`);
      user.subscription.provider = 'stripe';
    }

    // Update last login
    user.updatedAt = new Date();
    await user.save();
    console.log('✅ User login timestamp updated');

    // Generate secure token pair
    const tokens = await generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Create secure session
    const sessionData = createSession(user, tokens);
    
    // Return user data without password
    const userResponse = user.toJSON();
    console.log('✅ Login successful for user:', validatedEmail);

    // Create response with secure session data
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token: tokens.accessToken, // Legacy compatibility
        sessionId: sessionData.sessionId,
        csrfToken: sessionData.csrfToken,
        expiresAt: sessionData.expiresAt
      }
    });

    // Save session to secure HTTP-only cookies
    saveSessionToResponse(response, sessionData);

    // Reset rate limit on successful login
    loginAttempts.delete(`login_${clientIP}`);

    return response;

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