import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import VerificationToken from '@/models/VerificationToken';
import User from '@/models/User';
import { 
  validateCodeFormat, 
  incrementFailedAttempts,
  getRemainingAttempts,
  isCodeExpired,
  hasExceededMaxAttempts
} from '@/lib/verification-code';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

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
        { success: false, message: 'Invalid code format. Please enter a 4-digit code.' },
        { status: 400 }
      );
    }

    await getConnection();

    // Find verification token BEFORE verification (so we can check it)
    const verificationToken = await VerificationToken.findOne({
      code,
      email: email.toLowerCase(),
      type: 'email-verification',
      expiresAt: { $gt: new Date() }
    });

    if (!verificationToken) {
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

    // Verify the code - this will BURN the code (delete it)
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

    // Code is valid and has been burned - now mark user as verified
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

    // Create a one-time session token for immediate sign-in
    // This token will be used with passwordless provider to skip code verification
    const sessionCode = Math.random().toString().slice(2, 6).padStart(4, '0'); // Generate a 4-digit token
    const sessionToken = await VerificationToken.createCode(
      user._id,
      email.toLowerCase(),
      'passwordless-login',
      sessionCode
    );

    console.log('✅ Created session token for sign-in:', {
      email: email.toLowerCase(),
      code: sessionCode,
      tokenId: sessionToken._id
    });

    // Return user data and session token for NextAuth session creation
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      sessionToken: sessionCode, // One-time token for sign-in (use the code we generated)
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        image: user.avatar || null,
      }
    });

  } catch (error: any) {
    console.error('❌ Complete signup error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to complete signup' },
      { status: 500 }
    );
  }
}

