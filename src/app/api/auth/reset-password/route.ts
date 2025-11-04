import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';

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

    // Find verification token
    const verificationToken = await VerificationToken.findOne({
      token,
      email: email.toLowerCase(),
      type: 'password',
      expiresAt: { $gt: new Date() }
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Find user by email - include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user password (let the User model handle hashing via pre-save hook)
    user.password = password;
    user.lastLogin = new Date();
    await user.save();

    // Delete the verification token after successful reset
    await VerificationToken.deleteOne({ _id: verificationToken._id });

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
