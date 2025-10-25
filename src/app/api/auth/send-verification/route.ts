import { NextRequest, NextResponse } from 'next/server';
import { sendEmailVerification } from '@/lib/email-service';
import connectDB from '@/lib/database';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName } = await request.json();

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create verification token using VerificationToken model
    const verificationToken = await VerificationToken.createToken(
      null, // userId will be set after user creation
      email,
      'email',
      24 // 24 hours expiration
    );

    // Create verification link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken.token}&email=${encodeURIComponent(email)}`;

    // Try to send email using custom email service
    let emailSent = false;
    try {
      console.log('📧 Attempting to send verification email...');
      
      const emailResult = await sendEmailVerification(
        email,
        verificationLink,
        firstName
      );

      if (emailResult.success) {
        console.log('✅ Verification email sent successfully');
        emailSent = true;
      } else {
        console.warn('⚠️ Email service returned error:', emailResult.error);
      }
    } catch (emailError: any) {
      console.warn('⚠️ Email service failed:', emailError?.message || 'Unknown error');
    }

    // Create user in database regardless of email status
    try {
      const user = new User({
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isEmailVerified: false,
        role: 'user',
        currentPlanKey: 'free',
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
          theme: 'auto',
          notifications: {
            email: true,
            push: true
          }
        }
      });

      await user.save();
      console.log('✅ User created in database');

      // Update verification token with user ID
      verificationToken.userId = user._id;
      await verificationToken.save();
      
      if (emailSent) {
        return NextResponse.json({
          success: true,
          message: 'Account created! Please check your email to verify your account.',
          userId: user._id,
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Account created! You can sign in now. Email verification is temporarily unavailable.',
          userId: newUser._id,
          emailServiceStatus: 'unavailable'
        });
      }

    } catch (dbError: any) {
      console.error('❌ Failed to create user in database:', dbError);
      
      // If it's a duplicate key error, user already exists
      if (dbError.code === 11000) {
        return NextResponse.json(
          { success: false, message: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Failed to create account. Please try again later.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Send verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
