import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send password reset email via Firebase
    const resetLink = await sendPasswordResetEmail(email);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Password reset email sent successfully',
        resetLink // For development/testing purposes
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Password reset error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}