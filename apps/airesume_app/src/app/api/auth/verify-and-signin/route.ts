import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import VerificationToken from '@/models/VerificationToken';
import User from '@/models/User';
import mongoose from 'mongoose';
import {
  validateCodeFormat,
  incrementFailedAttempts,
  getRemainingAttempts,
  isCodeExpired,
  hasExceededMaxAttempts
} from '@/lib/verification-code';

export async function POST(request: NextRequest) {
  try {
    const { email, code, type } = await request.json();

    // Validate input
    if (!email || !code || !type) {
      return NextResponse.json(
        { success: false, message: 'Email, code, and type are required' },
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

    // Validate type
    const validTypes = ['email-verification', 'passwordless-login', 'password-reset'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification type' },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await VerificationToken.findOne({
      code,
      email: email.toLowerCase(),
      type,
      expiresAt: { $gt: new Date() }
    });

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Check if code has exceeded max attempts
    if (hasExceededMaxAttempts(verificationToken.attempts)) {
      await VerificationToken.deleteOne({ _id: verificationToken._id as mongoose.Types.ObjectId });
      return NextResponse.json(
        { success: false, message: 'Code has exceeded maximum attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (isCodeExpired(verificationToken.createdAt)) {
      await VerificationToken.deleteOne({ _id: verificationToken._id as mongoose.Types.ObjectId });
      return NextResponse.json(
        { success: false, message: 'Code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify the code
    const verificationResult = await VerificationToken.verifyCode(code, email.toLowerCase(), type);

    if (!verificationResult.valid) {
      let remainingAttempts = 5;
      if (verificationToken?._id) {
        const newAttemptCount = await incrementFailedAttempts((verificationToken._id as mongoose.Types.ObjectId).toString());
        remainingAttempts = Math.max(0, 5 - newAttemptCount);
      }

      return NextResponse.json(
        {
          success: false,
          message: verificationResult.message,
          remainingAttempts: Math.max(0, remainingAttempts)
        },
        { status: 400 }
      );
    }

    // Code is valid - handle based on type
    let user: any = null;
    const responseData: any = {
      success: true,
      message: 'Code verified successfully'
    };

    switch (type) {
      case 'email-verification':
        // Mark user as verified
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            isEmailVerified: true,
            emailVerifiedAt: new Date()
          });

          // Trigger Welcome Email (Fire and Forget)
          setTimeout(() => {
            import('@/lib/services/triggerEmailService').then(({ triggerService }) => {
              triggerService.trigger('1-welcome', user);
            }).catch(err => console.error('Failed to trigger welcome email:', err));
          }, 1000);

          responseData.userId = user._id;
          responseData.requiresSignIn = true;
          responseData.message = 'Email verified successfully! You can now sign in.';
        }
        break;

      case 'passwordless-login':
        // Find user or create new one for passwordless login
        user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          // Create new user for passwordless login
          user = new User({
            authProviderId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            authProvider: 'local',
            email: email.toLowerCase(),
            password: null,
            firstName: 'User',
            lastName: 'User',
            isEmailVerified: true,
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
              provider: 'polar',
              interval: 'monthly',
              seats: 3,
              storageUsed: 0
            },
            settings: {
              theme: 'auto',
              notifications: {
                email: true,
                push: true
              },
              timezone: 'UTC',
              languagePreference: 'en'
            }
          });

          await user.save();
          console.log('✅ New user created for passwordless login:', user._id.toString());
        } else {
          // Update existing user to be verified
          await User.findByIdAndUpdate(user._id, {
            isEmailVerified: true,
            emailVerifiedAt: new Date()
          });
        }

        responseData.userId = user._id;
        responseData.email = user.email;
        responseData.name = `${user.firstName} ${user.lastName}`;
        responseData.image = user.avatar;
        responseData.requiresSignIn = false;
        responseData.message = 'Code verified successfully! Signing you in...';
        break;

      case 'password-reset':
        // Generate temporary token for password reset
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          const resetToken = await VerificationToken.createToken(
            user._id,
            email.toLowerCase(),
            'password',
            1 // 1 hour expiration
          );
          responseData.resetToken = resetToken.token;
          responseData.userId = user._id;
          responseData.requiresSignIn = false;
          responseData.message = 'Code verified! You can now set a new password.';
        }
        break;
    }

    console.log(`✅ Code verified successfully for ${email} (${type})`);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('❌ Verify and signin error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to verify code' },
      { status: 500 }
    );
  }
}