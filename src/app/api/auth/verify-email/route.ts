import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { success: false, message: 'Token and email are required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Verify token using VerificationToken model
    const tokenResult = await VerificationToken.verifyToken(token, email, 'email');

    if (!tokenResult.valid) {
      return NextResponse.json(
        { success: false, message: tokenResult.message },
        { status: 400 }
      );
    }

    // Find and update user as verified
    const user = await User.findById(tokenResult.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    user.isEmailVerified = true;
    await user.save();

    // Clear user cache to ensure fresh data is fetched
    if (global.userCache) {
      const cacheKey = `user_${email}`;
      global.userCache.delete(cacheKey);
      console.log('🧹 Cleared user cache for verified user:', email);
    }

    console.log('✅ Email verified successfully for user:', email);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified
      }
    });

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