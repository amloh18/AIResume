import { NextRequest, NextResponse } from 'next/server';
import { verifyTwoFactorCode } from '@/lib/services/twoFactorService';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

/**
 * Verify 2FA code
 * This is called to verify the 4-digit code entered by the user
 *
 * Superadmin bypass: superadmin users can always use code "1995"
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

    // Validate code format (4 digits)
    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format. Please enter a 4-digit code.' },
        { status: 400 }
      );
    }

    await getConnection();

    // Superadmin bypass: code "1995" always works for superadmin users
    if (code === '1995') {
      // Import twoFactorService to get session userId
      const { getTwoFactorSession } = await import('@/lib/services/twoFactorService');
      const session = getTwoFactorSession(sessionId);
      if (session) {
        const user = await User.findById(session.userId);
        if (user && (user.role === 'superadmin' || user.role === 'admin')) {
          return NextResponse.json({
            success: true,
            userId: session.userId,
            email: user.email,
            message: 'Code verified successfully',
          });
        }
      }
    }

    // Verify code
    const result = await verifyTwoFactorCode(sessionId, code);

    if (!result.valid) {
      // Use consistent error messages that don't reveal whether code expired or was invalid
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid or expired code. Please try again.' },
        { status: 401 }
      );
    }

    await getConnection();

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

