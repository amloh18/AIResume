import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/user-service';
import { generateAndSendTwoFactorCode, isTwoFactorEnabled } from '@/lib/services/twoFactorService';
import { authRateLimit } from '@/lib/rate-limiter';

/**
 * Verify credentials and check if 2FA is required
 * This endpoint is called before NextAuth sign-in to check 2FA status
 * 
 * Returns structured error codes for frontend handling:
 * - EMAIL_NOT_VERIFIED: User exists but hasn't verified email
 * - OAUTH_USER: User should sign in with Google
 * - INVALID_CREDENTIALS: Wrong email or password
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await authRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    const { email, password, portal } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResult = await UserService.authenticateUser(email, password);

    if (authResult.user) {
      // Enforce portal isolation
      const role = authResult.user.role;
      // Use any to bypass strict typing issues with mongoose lean documents
      const isB2b = !!(authResult.user as any).b2b?.tenantId || !!(authResult.user as any).isB2b;
      const isAdmin = role === 'admin' || role === 'superadmin';

      if (portal === 'admin' && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Please use the consumer login.', code: 'UNAUTHORIZED_PORTAL' },
          { status: 403 }
        );
      }
      if (portal === 'b2b' && !isB2b && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Please use the consumer login.', code: 'UNAUTHORIZED_PORTAL' },
          { status: 403 }
        );
      }
      if (portal === 'default' && isB2b && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Please use the B2B login.', code: 'UNAUTHORIZED_PORTAL' },
          { status: 403 }
        );
      }
    }

    if (!authResult.user || authResult.error) {
      // Parse error message to determine error code for frontend handling
      let errorCode = 'INVALID_CREDENTIALS';
      let errorMessage = authResult.error || 'Invalid credentials';

      if (authResult.error?.includes('verify your email')) {
        errorCode = 'EMAIL_NOT_VERIFIED';
        errorMessage = 'Please verify your email before signing in';
      } else if (authResult.error?.includes('sign in with Google')) {
        errorCode = 'OAUTH_USER';
        errorMessage = 'This account uses Google sign-in. Please use the Google button.';
      }

      return NextResponse.json(
        { success: false, error: errorMessage, code: errorCode },
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
          { success: false, error: codeResult.error || 'Failed to send 2FA code', code: 'TWO_FACTOR_SEND_FAILED' },
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
    console.error('❌ Error verifying credentials for email:', error.message || 'Unknown error');
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

