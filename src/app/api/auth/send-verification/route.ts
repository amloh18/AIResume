import { NextRequest, NextResponse } from 'next/server';
import { sendEmailVerification } from '@/lib/email-service';
import { createUserWithEmailAndPassword, sendEmailVerification as firebaseSendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import crypto from 'crypto';
import connectDB from '@/lib/database';
import User from '@/models/User';

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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create verification link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // Try to send email using custom email service first
    try {
      console.log('📧 Attempting to send verification email via Hostinger...');
      
      const emailResult = await sendEmailVerification(
        email,
        verificationLink,
        firstName
      );

      if (emailResult.success) {
        console.log('✅ Verification email sent via Hostinger');
        
        // Store verification token in database for verification
        await User.create({
          email,
          firstName,
          lastName,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
          isEmailVerified: false,
          authProvider: 'firebase', // Keep as firebase since user was created in Firebase
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
            storageUsed: 0,
          },
          settings: {
            theme: 'auto',
            notifications: {
              email: true,
              push: true,
            },
            timezone: 'UTC',
            languagePreference: 'en',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Verification email sent successfully',
          emailSent: true
        });
      } else {
        console.error('❌ Hostinger email failed:', emailResult.error);
        throw new Error(emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Custom email service failed, falling back to Firebase:', emailError);
      console.error('❌ Email error details:', {
        message: emailError.message,
        code: emailError.code,
        response: emailError.response
      });
      
      // Fallback to Firebase email verification
      try {
        // Check if Firebase is properly configured
        if (!auth || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
          throw new Error('Firebase is not properly configured');
        }
        
        // Create Firebase user (this will send Firebase verification email)
        const userCredential = await createUserWithEmailAndPassword(auth, email, 'temp-password-' + Date.now());
        const user = userCredential.user;
        
        // Send Firebase verification email
        await firebaseSendEmailVerification(user);
        
        // Create user record in MongoDB
        await User.create({
          email,
          firstName,
          lastName,
          firebaseUid: user.uid,
          isEmailVerified: false,
          authProvider: 'firebase',
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
            storageUsed: 0,
          },
          settings: {
            theme: 'auto',
            notifications: {
              email: true,
              push: true,
            },
            timezone: 'UTC',
            languagePreference: 'en',
          },
        });

        console.log('✅ Fallback: Firebase verification email sent');
        
        return NextResponse.json({
          success: true,
          message: 'Verification email sent via Firebase (fallback)',
          emailSent: true,
          fallback: true
        });
      } catch (firebaseError) {
        console.error('❌ Firebase fallback also failed:', firebaseError);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Failed to send verification email. Please try again later.',
            error: 'Both custom and Firebase email services failed'
          },
          { status: 500 }
        );
      }
    }

  } catch (error: any) {
    console.error('❌ Send verification email error:', error);
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
