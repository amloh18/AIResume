import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import VerificationToken from '@/models/VerificationToken';
import User from '@/models/User';
import { 
  generateVerificationCode,
  validateCodeFormat, 
  incrementFailedAttempts,
  isCodeExpired,
  hasExceededMaxAttempts
} from '@/lib/verification-code';

/**
 * Atomic Signup Endpoint
 * 
 * This endpoint performs the verification atomically:
 * 1. Verify the email verification code
 * 2. Mark user as verified
 * 3. Create a one-time passwordless token for NextAuth sign-in
 * 
 * The client then uses this token to sign in via NextAuth's passwordless provider.
 * This ensures NextAuth properly manages the session while keeping the flow atomic.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    console.log('🔐 Atomic signup started for:', email);

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!validateCodeFormat(code)) {
      return NextResponse.json(
        { success: false, message: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    await getConnection();

    // Step 1: Find and validate verification token
    const verificationToken = await VerificationToken.findOne({
      code,
      email: email.toLowerCase(),
      type: 'email-verification',
      expiresAt: { $gt: new Date() }
    });

    if (!verificationToken) {
      // Check if user is already verified (e.g. from a previous attempt)
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser?.isEmailVerified) {
        return NextResponse.json(
          {
            success: false,
            alreadyVerified: true,
            message: 'Your email is already verified. Please sign in with your password.'
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Invalid or expired code' },
        { status: 401 }
      );
    }

    // Check if code has exceeded max attempts
    if (hasExceededMaxAttempts(verificationToken.attempts)) {
      await VerificationToken.deleteOne({ _id: verificationToken._id });
      return NextResponse.json(
        { success: false, message: 'Code has exceeded maximum attempts. Please request a new code.' },
        { status: 401 }
      );
    }

    // Check if code is expired
    if (isCodeExpired(verificationToken.createdAt)) {
      await VerificationToken.deleteOne({ _id: verificationToken._id });
      return NextResponse.json(
        { success: false, message: 'Code has expired. Please request a new code.' },
        { status: 401 }
      );
    }

    // Step 2: Verify the code - this will BURN the code (delete it)
    const verificationResult = await VerificationToken.verifyCode(
      code,
      email.toLowerCase(),
      'email-verification'
    );

    if (!verificationResult.valid) {
      const newAttemptCount = await incrementFailedAttempts(verificationToken._id.toString());
      const remainingAttempts = 5 - newAttemptCount;

      return NextResponse.json(
        { 
          success: false, 
          message: verificationResult.message,
          remainingAttempts: Math.max(0, remainingAttempts)
        },
        { status: 401 }
      );
    }

    console.log('✅ Code verified and burned');

    // Step 3: Find user and mark as verified
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Mark user as verified and update last login
    await User.findByIdAndUpdate(user._id, { 
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      lastLogin: new Date()
    });

    console.log('✅ User marked as verified:', user._id.toString());

    // Step 4: Create a one-time session token for NextAuth sign-in
    // This token will be used with the passwordless provider
    const sessionCode = generateVerificationCode();
    const sessionToken = await VerificationToken.createCode(
      user._id,
      email.toLowerCase(),
      'passwordless-login',
      sessionCode
    );

    console.log('✅ Created one-time session token for NextAuth sign-in');

    // Track email verification server-side
    try {
      const { getPostHogClient } = await import('@/lib/posthog-server');
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user._id.toString(),
        event: 'email_verified',
        properties: {
          email: user.email,
        },
      });
    } catch (phError) {
      console.error('PostHog capture error (email_verified):', phError);
    }

    // Return success with session token
    // The client will use this to sign in via NextAuth's passwordless provider
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      sessionToken: sessionCode, // One-time token for NextAuth sign-in
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        image: user.avatar || null,
      }
    });

  } catch (error: any) {
    console.error('❌ Atomic signup error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to complete signup' },
      { status: 500 }
    );
  }
}

