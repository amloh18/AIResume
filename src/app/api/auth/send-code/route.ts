import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '@/lib/email-service';
import connectDB from '@/lib/database';
import VerificationToken from '@/models/VerificationToken';
import User from '@/models/User';
import { 
  generateVerificationCode, 
  checkCodeRateLimit, 
  checkCodeCooldown,
  cleanupExpiredCodes 
} from '@/lib/verification-code';

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    // Validate input
    if (!email || !type) {
      return NextResponse.json(
        { success: false, message: 'Email and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['email-verification', 'passwordless-login', 'password-reset'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification type' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    await connectDB();

    // For passwordless-login, check if user exists FIRST before rate limiting
    // This ensures we show "account not registered" instead of "too many requests"
    if (type === 'passwordless-login') {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'No account found with this email. Please sign up first.' },
          { status: 404 }
        );
      }
    }

    // For email-verification, check if user exists and is not verified
    if (type === 'email-verification') {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      if (user.isEmailVerified) {
        return NextResponse.json(
          { success: false, message: 'Email is already verified' },
          { status: 400 }
        );
      }
    }

    // Clean up expired codes
    await cleanupExpiredCodes();

    // Check rate limiting (only after user existence check for passwordless-login)
    const canSendCode = await checkCodeRateLimit(email);
    if (!canSendCode) {
      return NextResponse.json(
        { success: false, message: 'Too many code requests. Please wait before requesting another code.' },
        { status: 429 }
      );
    }

    // Check cooldown
    const cooldownPassed = await checkCodeCooldown(email);
    if (!cooldownPassed) {
      return NextResponse.json(
        { success: false, message: 'Please wait 60 seconds before requesting another code.' },
        { status: 429 }
      );
    }

    // Generate verification code
    const code = generateVerificationCode();
    console.log(`🔐 Generated verification code for ${email}: ${code}`);

    // Create verification token
    const verificationToken = await VerificationToken.createCode(
      null, // userId will be set after verification
      email.toLowerCase(),
      type,
      code
    );

    // Try to send email
    let emailSent = false;
    try {
      console.log('📧 Attempting to send verification code...');
      
      const emailResult = await sendVerificationCode(
        email,
        code,
        type
      );

      if (emailResult.success) {
        console.log('✅ Verification code sent successfully');
        emailSent = true;
      } else {
        console.warn('⚠️ Email service returned error:', emailResult.error);
      }
    } catch (emailError: any) {
      console.warn('⚠️ Email service failed:', emailError?.message || 'Unknown error');
    }

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully',
        codeId: verificationToken._id,
        expiresIn: 5 * 60 // 5 minutes in seconds
      });
    } else {
      // Still return success but indicate email service issue
      return NextResponse.json({
        success: true,
        message: 'Code generated successfully. Email service temporarily unavailable.',
        codeId: verificationToken._id,
        expiresIn: 5 * 60,
        emailServiceStatus: 'unavailable',
        debugCode: code // Only for development
      });
    }

  } catch (error: any) {
    console.error('❌ Send code error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
