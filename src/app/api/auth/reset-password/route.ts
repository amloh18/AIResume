import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    await getConnection();

    // Find user by email and reset token - include password field
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if user has a password (local auth)
    if (!user.password) {
      return NextResponse.json(
        { error: 'This email is registered with a different sign-in method' },
        { status: 400 }
      );
    }

    // Update user password (let the User model handle hashing via pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ Password reset successfully for user:', user.email);
    return NextResponse.json({
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    console.error('❌ Error resetting password:', error.message);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
