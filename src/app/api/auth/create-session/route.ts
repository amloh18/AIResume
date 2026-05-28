import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encode } from 'next-auth/jwt';

/**
 * Create NextAuth session server-side
 * Used after code verification to establish session without client-side NextAuth signIn
 * This is more reliable than client-side signIn calls
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'userId or email is required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Find user
    const user = await User.findOne(
      userId ? { _id: userId } : { email: email.toLowerCase() }
    ).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userDoc = Array.isArray(user) ? user[0] : user;
    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!userDoc.isEmailVerified) {
      return NextResponse.json(
        { success: false, error: 'User email not verified' },
        { status: 403 }
      );
    }

    // Create JWT token for NextAuth session
    // The token structure must match what NextAuth's JWT callback expects
    const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development';
    
    const token = await encode({
      token: {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        // NextAuth JWT callback only uses id and email from token
        // Other data is fetched fresh in the session callback
      },
      secret: NEXTAUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Update last login
    await User.findByIdAndUpdate((userDoc._id as any).toString(), { lastLogin: new Date() });

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        name: `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || 'User',
        image: userDoc.avatar || null,
      }
    });

    // Set NextAuth session cookie
    const cookieName = process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log('✅ Session created server-side for user:', (userDoc._id as any).toString());

    return response;

  } catch (error: any) {
    console.error('❌ Create session error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}

