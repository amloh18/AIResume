import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/firebase-admin';
import { validateEmail } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Password reset request started');
    
    await connectDB();
    console.log('✅ Database connected');
    
    const body = await request.json();
    const { email } = body;
    
    console.log('📧 Password reset request for email:', email);
    
    // Validate required fields
    if (!email) {
      console.log('❌ Missing email');
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required',
          field: 'email'
        },
        { status: 400 }
      );
    }
    
    // Validate email format
    const validatedEmail = validateEmail(email);
    console.log('✅ Email validated:', validatedEmail);
    
    // Check if user exists
    const user = await User.findOne({ email: validatedEmail });
    if (!user) {
      console.log('❌ User not found for email:', validatedEmail);
      // For security, we don't reveal if email exists or not
      return NextResponse.json(
        {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        },
        { status: 200 }
      );
    }
    
    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      hasFirebaseUid: !!user.firebaseUid
    });
    
    try {
      // Send password reset email using Firebase
      const resetLink = await sendPasswordResetEmail(validatedEmail);
      console.log('✅ Password reset email sent successfully');
      
      // Log the password reset request
      user.lastPasswordResetRequest = new Date();
      await user.save();
      
      return NextResponse.json(
        {
          success: true,
          message: 'Password reset link has been sent to your email address.'
        },
        { status: 200 }
      );
      
    } catch (firebaseError: any) {
      console.error('❌ Firebase password reset error:', firebaseError);
      
      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/user-not-found') {
        // User doesn't exist in Firebase, but exists in our DB
        // This means they're using traditional auth, not Firebase
        console.log('⚠️ User exists in DB but not in Firebase - using traditional auth');
        
        return NextResponse.json(
          {
            success: false,
            message: 'This account uses traditional authentication. Please contact support for password reset.',
            error: 'TRADITIONAL_AUTH'
          },
          { status: 400 }
        );
      } else if (firebaseError.code === 'auth/invalid-email') {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid email address',
            field: 'email'
          },
          { status: 400 }
        );
      } else if (firebaseError.code === 'auth/too-many-requests') {
        return NextResponse.json(
          {
            success: false,
            message: 'Too many password reset requests. Please try again later.',
            error: 'RATE_LIMIT_EXCEEDED'
          },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to send password reset email. Please try again later.',
            error: 'FIREBASE_ERROR'
          },
          { status: 500 }
        );
      }
    }
    
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.',
        error: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
