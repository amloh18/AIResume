import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/user-service';
import { generateAndSendTwoFactorCode, isTwoFactorEnabled } from '@/lib/services/twoFactorService';

/**
 * Verify credentials and check if 2FA is required
 * This endpoint is called before NextAuth sign-in to check 2FA status
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResult = await UserService.authenticateUser(email, password);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    const twoFactorEnabled = await isTwoFactorEnabled(authResult.user.id);

    if (twoFactorEnabled) {
      // Generate and send 2FA code
      const codeResult = await generateAndSendTwoFactorCode(
        authResult.user.id,
        authResult.user.email
      );

      if (!codeResult.success) {
        return NextResponse.json(
          { success: false, error: codeResult.error || 'Failed to send 2FA code' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        sessionId: codeResult.sessionId,
        userId: authResult.user.id,
        email: authResult.user.email,
        message: 'Please enter the 4-digit code sent to your email',
      });
    }

    // No 2FA required - proceed with normal sign-in
    return NextResponse.json({
      success: true,
      requiresTwoFactor: false,
      userId: authResult.user.id,
      email: authResult.user.email,
    });
  } catch (error: any) {
    console.error('❌ Error verifying credentials:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

