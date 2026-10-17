import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getSessionSecret } from '@/lib/auth/session-cookie';

/** Token lifetimes for the extension grant — keep in step with extension-token/route.ts. */
const TOKEN_EXPIRY_DAYS = 30;
const REFRESH_EXPIRY_DAYS = 60;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Find user by email (include password field for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user has a password set
    if (!user.password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This account uses passwordless login. Please use the 6-digit code option.' 
        },
        { status: 401 }
      );
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    console.log('✅ Extension password signin successful for:', user.email);

    //
    // Issue the extension token pair here.
    //
    // The extension previously called `/api/auth/extension-token` after this
    // endpoint, but that route requires a NextAuth *session cookie* — which a
    // password sign-in from the extension never creates — so every extension
    // login failed at the token step. Proof of the password IS the credential
    // here, so the token is issued directly in this response.
    //
    let token: string;
    let refreshToken: string;
    try {
      const secret = getSessionSecret();
      token = jwt.sign(
        { userId: user._id.toString(), email: user.email, type: 'extension' },
        secret,
        { expiresIn: `${TOKEN_EXPIRY_DAYS}d` }
      );
      refreshToken = jwt.sign(
        { userId: user._id.toString(), email: user.email, type: 'extension_refresh' },
        secret,
        { expiresIn: `${REFRESH_EXPIRY_DAYS}d` }
      );
    } catch (secretError) {
      console.error('❌ Extension signin -', (secretError as Error).message);
      return NextResponse.json(
        { success: false, error: 'Authentication is temporarily unavailable. Please try again shortly.' },
        { status: 500 }
      );
    }

    // Return user data + tokens
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        role: user.role,
      },
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      expiresInDays: TOKEN_EXPIRY_DAYS,
    });

  } catch (error: any) {
    console.error('❌ Extension signin error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}