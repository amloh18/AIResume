import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';
import VerificationToken from '@/models/VerificationToken';
import { validateEmail, validatePassword, createErrorResponse } from '@/lib/db-utils';
import { sendVerificationCode } from '@/lib/email-service';
import { generateVerificationCode } from '@/lib/verification-code';

/**
 * User Registration Endpoint
 * 
 * Creates new user accounts with email/password authentication.
 * Users must verify their email before logging in.
 * 
 * Flow:
 * 1. Validate input (email, password, names)
 * 2. Check for existing user
 * 3. Create user with isEmailVerified = false
 * 4. Generate verification token
 * 5. Send verification email
 * 6. Return success (user must verify before login)
 */

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

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 User registration attempt started');
    
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
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected for registration');
    
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    console.log('📧 Registration attempt for email:', email);

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields');
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
    
    console.log('✅ Email and password validated');

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedEmail });
    if (existingUser) {
      console.log('❌ User already exists:', validatedEmail);
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists. Please sign in instead.',
          field: 'email'
        },
        { status: 409 }
      );
    }

    // Create new user
    const user = new User({
      authProviderId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique local auth ID
      authProvider: 'local', // Use 'local' for email/password registration
      email: validatedEmail,
      password: validatedPassword, // Will be hashed by User model pre-save hook
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isEmailVerified: false, // Must verify email before login
      role: 'user',
      currentPlanKey: 'free',
      monthlyGoal: 20,
      usage: {
        cvJourneyCount: 0,
        cvCreatedCount: 0,
        journeysCreated: 0,
        exportCount: 0,
        atsCheckCount: 0,
        lastResetDate: new Date(),
      },
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
        theme: 'dark',
        notifications: {
          email: true,
          push: true
        },
        timezone: 'UTC',
        languagePreference: 'en'
      }
    });

    await user.save();
    console.log('✅ User created with ID:', user._id.toString());

    // Generate verification code
    const code = generateVerificationCode();
    console.log(`🔐 Generated verification code for ${user.email}: ${code}`);

    // Create verification token with code
    const verificationToken = await VerificationToken.createCode(
      user._id.toString(),
      user.email,
      'email-verification',
      code
    );
    
    console.log('✅ Verification code created');

    // Send verification code email
    try {
      const emailResult = await sendVerificationCode(
        user.email,
        code,
        'email-verification'
      );
      
      if (emailResult.success) {
        console.log('✅ Verification code sent to:', user.email);
      } else {
        console.warn('⚠️ Failed to send verification code:', emailResult.error);
      }
      
    } catch (emailError) {
      console.error('❌ Error sending verification code:', emailError);
      // Don't fail registration if email fails - user can request resend
    }

    // Return user data without password
    const userResponse = user.toJSON();

    // Reset rate limit on successful registration
    registrationAttempts.delete(`register_${clientIP}`);

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email for a 4-digit verification code.',
      data: {
        user: userResponse,
        requiresVerification: true
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors: Record<string, string> = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      }, { status: 400 });
    }
    
    // Handle MongoDB connection errors
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

