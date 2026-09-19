import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encode } from 'next-auth/jwt';
import crypto from 'crypto';
import { SessionService } from '@/lib/services/session-service';

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

    // Generate jti for session tracking
    const jti = crypto.randomUUID();

    // Create JWT token for NextAuth session
    const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
    if (!NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET is not configured');
    }
    
    const token = await encode({
      token: {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        jti,
      },
      secret: NEXTAUTH_SECRET,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Record login session
    try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || '';

      await SessionService.createSession({
        userId: (userDoc._id as any).toString(),
        jti,
        ip,
        userAgent,
        provider: 'credentials',
      });
    } catch (sessionError) {
      console.error('Failed to record login session:', sessionError);
    }

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
      maxAge: 7 * 24 * 60 * 60, // 7 days
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

