import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendTwoFactorCode } from '@/lib/services/twoFactorService';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import redisRateLimiter from '@/lib/redis-rate-limiter';
import { getClientIP } from '@/lib/utils/apiLogger';

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

    // Check rate limit before generating code
    const ipAddress = getClientIP(request);
    const rateLimitResult = await redisRateLimiter.checkTwoFactorRateLimit(userId, ipAddress);
    
    if (!rateLimitResult.allowed) {
      const userLimit = rateLimitResult.userLimit;
      const resetTime = userLimit?.resetTime || Date.now() + 10 * 60 * 1000;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Too many code generation attempts. Please wait before requesting a new code.',
          retryAfter,
          limitInfo: {
            userLimit: rateLimitResult.userLimit,
            ipLimit: rateLimitResult.ipLimit,
          },
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          },
        }
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

