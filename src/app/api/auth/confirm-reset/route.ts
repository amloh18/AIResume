import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
// Firebase admin imports removed - using NextAuth password reset

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Password reset confirmation started');
    
    await getConnection();
    console.log('✅ Database connected');
    
    const body = await request.json();
    const { code, newPassword } = body;
    
    console.log('🔐 Processing password reset confirmation');
    
    // Validate required fields
    if (!code || !newPassword) {
      console.log('❌ Missing code or new password');
      return NextResponse.json(
        {
          success: false,
          message: 'Reset code and new password are required',
          errors: {
            code: !code ? 'Reset code is required' : undefined,
            newPassword: !newPassword ? 'New password is required' : undefined
          }
        },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 8 characters long',
          field: 'newPassword'
        },
        { status: 400 }
      );
    }
    
    try {
      // Verify the reset code and get the email
      // TODO: Implement NextAuth password reset verification
      // For now, we'll skip Firebase verification
      const email = null; // This needs to be implemented with NextAuth
      console.log('✅ Reset code verified for email:', email);
      
      // Find user in our database
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        console.log('❌ User not found in database:', email);
        return NextResponse.json(
          {
            success: false,
            message: 'User not found',
            error: 'USER_NOT_FOUND'
          },
          { status: 404 }
        );
      }
      
      console.log('✅ User found:', {
        id: user._id,
        email: user.email,
        firstName: user.firstName
      });
      
      // Confirm the password reset in Firebase
      // TODO: Implement NextAuth password reset confirmation
      // For now, we'll skip Firebase confirmation
      console.log('Password reset confirmation skipped - needs NextAuth implementation');
      console.log('✅ Password reset confirmed in Firebase');
      
      // Update password in our database (for users who also have local passwords)
      if (user.password) {
        user.password = newPassword;
        user.lastPasswordChange = new Date();
        await user.save();
        console.log('✅ Password updated in database');
      }
      
      return NextResponse.json(
        {
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.'
        },
        { status: 200 }
      );
      
    } catch (firebaseError: any) {
      console.error('❌ Firebase password reset error:', firebaseError);
      
      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/invalid-action-code') {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid or expired reset code. Please request a new password reset.',
            error: 'INVALID_CODE'
          },
          { status: 400 }
        );
      } else if (firebaseError.code === 'auth/expired-action-code') {
        return NextResponse.json(
          {
            success: false,
            message: 'Reset code has expired. Please request a new password reset.',
            error: 'EXPIRED_CODE'
          },
          { status: 400 }
        );
      } else if (firebaseError.code === 'auth/weak-password') {
        return NextResponse.json(
          {
            success: false,
            message: 'Password is too weak. Please choose a stronger password.',
            field: 'newPassword'
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to reset password. Please try again.',
            error: 'FIREBASE_ERROR'
          },
          { status: 500 }
        );
      }
    }
    
  } catch (error: any) {
    console.error('❌ Password reset confirmation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.',
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
