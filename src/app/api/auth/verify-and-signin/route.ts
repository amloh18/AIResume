import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { signIn } from 'next-auth/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email and verification token
    const user = await User.findOne({ 
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log('✅ Email verified successfully for user:', email);

    // Try to sign in with Firebase using the provided password
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get Firebase ID token and sign in with NextAuth
      const idToken = await firebaseUser.getIdToken();
      
      // This would need to be handled on the client side
      // For now, return success and let the client handle the sign-in
      return NextResponse.json({
        success: true,
        message: 'Email verified successfully. You can now sign in.',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified
        },
        firebaseUid: firebaseUser.uid,
        idToken: idToken
      });

    } catch (firebaseError: any) {
      console.error('❌ Firebase sign-in failed:', firebaseError);
      
      // If Firebase sign-in fails, just return verification success
      return NextResponse.json({
        success: true,
        message: 'Email verified successfully. Please sign in manually.',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Email verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to verify email',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
