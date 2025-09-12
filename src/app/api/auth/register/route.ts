import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { validateEmail, validatePassword, createErrorResponse } from '@/lib/db-utils';
import { generateTokenPair, getClientIP } from '@/lib/jwt';
import { createSession, saveSessionToResponse, validateCSRFFromRequest } from '@/lib/session';

// Rate limiting for registration attempts
const registrationAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_REGISTRATION_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRegistrationRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `register_${ip}`;
  const attempts = registrationAttempts.get(key);
  
  if (!attempts || now > attempts.resetTime) {
    registrationAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempts.count >= MAX_REGISTRATION_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIP = getClientIP(request);
    if (!checkRegistrationRateLimit(clientIP)) {
      console.log('❌ Registration rate limit exceeded for IP:', clientIP);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many registration attempts. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    // CSRF validation for state-changing operations
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
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

    // Fix any invalid provider values before saving
    if (user.subscription?.provider && !['stripe', 'razorpay', 'admin'].includes(user.subscription.provider)) {
      console.log(`⚠️ Fixing invalid provider value: ${user.subscription.provider} -> stripe`);
      user.subscription.provider = 'stripe';
    }

    await user.save();

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

    // Create response with secure session data
    const response = NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token: tokens.accessToken, // Legacy compatibility
        sessionId: sessionData.sessionId,
        csrfToken: sessionData.csrfToken,
        expiresAt: sessionData.expiresAt
      }
    }, { status: 201 });

    // Save session to secure HTTP-only cookies
    saveSessionToResponse(response, sessionData);

    // Reset rate limit on successful registration
    registrationAttempts.delete(`register_${clientIP}`);

    return response;

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