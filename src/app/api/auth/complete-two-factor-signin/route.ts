import { NextRequest, NextResponse } from 'next/server';
import { verifyTwoFactorCode } from '@/lib/services/twoFactorService';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encode } from 'next-auth/jwt';

/**
 * Complete sign-in after 2FA verification
 * Creates a session token for NextAuth
 *
 * This endpoint CONSUMES the 2FA code (single use). It is the authoritative check —
 * /api/auth/two-factor/verify only peeks so that this call still has a session to use.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, code } = await request.json();

    if (!sessionId || !code) {
      return NextResponse.json(
        { success: false, error: 'Session ID and code are required' },
        { status: 400 }
      );
    }

    // Same format gate as /api/auth/two-factor/verify, so both endpoints agree on what
    // a well-formed code is instead of one 400-ing and the other 401-ing.
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    // Verify 2FA code and consume the session (single use)
    const verifyResult = await verifyTwoFactorCode(sessionId, code, { consume: true });

    if (!verifyResult.valid || !verifyResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: verifyResult.error || 'Invalid code',
          // Lets the UI show the remaining attempt count without a second round-trip.
          ...(typeof verifyResult.attemptsRemaining === 'number' && {
            attemptsRemaining: verifyResult.attemptsRemaining,
          }),
        },
        { status: 401 }
      );
    }

    await getConnection();

    // Get user
    const user = await User.findById(verifyResult.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update last login
    await User.findByIdAndUpdate(verifyResult.userId, { lastLogin: new Date() });

    // Return user info - frontend will call create-session endpoint
    return NextResponse.json({
      success: true,
      userId: verifyResult.userId,
      email: user.email,
      user: {
        id: verifyResult.userId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error completing 2FA sign-in:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete sign-in' },
      { status: 500 }
    );
  }
}

