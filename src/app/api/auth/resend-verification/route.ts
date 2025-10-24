import { NextRequest, NextResponse } from 'next/server';
import { sendEmailVerification } from '@/lib/email-service';
import crypto from 'crypto';
import connectDB from '@/lib/database';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find existing user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return NextResponse.json(
        { success: false, message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Create verification link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // Send verification email
    try {
      console.log('📧 Sending verification email to existing user...');
      
      const emailResult = await sendEmailVerification(
        email,
        verificationLink,
        user.firstName || user.displayName || 'User'
      );

      if (emailResult.success) {
        console.log('✅ Verification email sent successfully');
        
        // Clear user cache to ensure fresh data is fetched
        if (global.userCache) {
          const cacheKey = `user_${email}`;
          global.userCache.delete(cacheKey);
          console.log('🧹 Cleared user cache for:', email);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Verification email sent successfully',
          emailSent: true
        });
      } else {
        console.error('❌ Email sending failed:', emailResult.error);
        return NextResponse.json(
          { success: false, message: 'Failed to send verification email' },
          { status: 500 }
        );
      }
    } catch (emailError) {
      console.error('❌ Email service error:', emailError);
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Resend verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send verification email',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
