import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendTwoFactorCode } from '@/lib/services/twoFactorService';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

/**
 * Generate and send 2FA code
 * This is called after password verification when 2FA is enabled
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if this is a setup request
    const isSetup = request.nextUrl.searchParams.get('setup') === 'true';

    // Generate and send code
    const result = await generateAndSendTwoFactorCode(userId, email, isSetup);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      message: 'Verification code sent to your email',
    });
  } catch (error: any) {
    console.error('❌ Error generating 2FA code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate code' },
      { status: 500 }
    );
  }
}

