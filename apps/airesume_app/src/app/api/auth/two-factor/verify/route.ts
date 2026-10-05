import { NextRequest, NextResponse } from 'next/server';
import { verifyTwoFactorCode } from '@/lib/services/twoFactorService';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

/**
 * Verify 2FA code
 * This is called to verify the 6-digit code entered by the user
 *
 * This is a NON-DESTRUCTIVE check (`consume: false`): it reports whether the code is
 * correct but leaves the session intact, because the sign-in flow calls this and then
 * calls /api/auth/complete-two-factor-signin to actually establish the session.
 * It used to consume the session here, which meant the follow-up call always failed with
 * "Invalid or expired session" — i.e. nobody with 2FA enabled could sign in.
 * Use /api/auth/complete-two-factor-signin to consume the code.
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

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    await getConnection();

    // Verify code without consuming it
    const result = await verifyTwoFactorCode(sessionId, code, { consume: false });

    if (!result.valid) {
      // Use consistent error messages that don't reveal whether code expired or was invalid
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Invalid or expired code. Please try again.',
          ...(typeof result.attemptsRemaining === 'number' && { attemptsRemaining: result.attemptsRemaining }),
        },
        { status: 401 }
      );
    }

    // Get user info for session creation
    const user = await User.findById(result.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      email: user.email,
      message: 'Code verified successfully',
    });
  } catch (error: any) {
    console.error('❌ Error verifying 2FA code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify code' },
      { status: 500 }
    );
  }
}

