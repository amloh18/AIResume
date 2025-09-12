import { NextRequest, NextResponse } from 'next/server';
import { sendEmailVerification } from '@/lib/email-service';
import { sendEmailVerification as firebaseSendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, useCustomEmail = false } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (useCustomEmail) {
      // Use custom email service
      const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?email=${encodeURIComponent(email)}`;
      const result = await sendEmailVerification(email, verificationLink, firstName || 'User');
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Verification email sent successfully',
          method: 'custom'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to send verification email'
        }, { status: 500 });
      }
    } else {
      // Use Firebase email verification
      try {
        // Get the current user (this should be called from the frontend after user creation)
        const user = auth.currentUser;
        if (!user) {
          return NextResponse.json({
            success: false,
            error: 'No authenticated user found. Please try signing up again.'
          }, { status: 401 });
        }

        await firebaseSendEmailVerification(user);
        
        return NextResponse.json({
          success: true,
          message: 'Verification email sent successfully via Firebase',
          method: 'firebase'
        });
      } catch (firebaseError: any) {
        console.error('Firebase email verification failed:', firebaseError);
        
        // Fallback to custom email service
        const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?email=${encodeURIComponent(email)}`;
        const result = await sendEmailVerification(email, verificationLink, firstName || 'User');
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'Verification email sent successfully via fallback service',
            method: 'fallback'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Both Firebase and custom email services failed. Please check your email configuration.'
          }, { status: 500 });
        }
      }
    }
  } catch (error: any) {
    console.error('Send verification email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
