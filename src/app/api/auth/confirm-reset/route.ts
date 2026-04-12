import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Password reset confirmation started');
    
    await getConnection();
    console.log('✅ Database connected');
    
    const body = await request.json();
    const { code, newPassword, email } = body;
    
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
      // Find the token first to get the email if not provided
      let targetEmail = email;
      let tokenDoc;
      
      if (targetEmail) {
        tokenDoc = await VerificationToken.findOne({ code, email: targetEmail, type: 'password-reset' });
      } else {
        tokenDoc = await VerificationToken.findOne({ code, type: 'password-reset' });
        if (tokenDoc) {
          targetEmail = tokenDoc.email;
        }
      }

      if (!tokenDoc) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid or expired reset code. Please request a new password reset.',
            error: 'INVALID_CODE'
          },
          { status: 400 }
        );
      }

      if (tokenDoc.expiresAt < new Date()) {
        await VerificationToken.deleteOne({ _id: tokenDoc._id });
        return NextResponse.json(
          {
            success: false,
            message: 'Reset code has expired. Please request a new password reset.',
            error: 'EXPIRED_CODE'
          },
          { status: 400 }
        );
      }
      
      console.log('✅ Reset code verified for email:', targetEmail);
      
      // Find user in our database
      const user = await User.findOne({ email: targetEmail }).select('+password');
      if (!user) {
        console.log('❌ User not found in database:', targetEmail);
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
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password in our database
      user.password = hashedPassword;
      user.lastPasswordChange = new Date();
      await user.save();
      console.log('✅ Password updated in database');
      
      // Delete the token
      await VerificationToken.deleteOne({ _id: tokenDoc._id });
      
      return NextResponse.json(
        {
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.'
        },
        { status: 200 }
      );
      
    } catch (dbError: any) {
      console.error('❌ Database operation error:', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to reset password. Please try again.',
          error: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
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
