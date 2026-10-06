import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, getClientIP } from '@/lib/jwt';
import { saveSessionToResponse, validateCSRFFromRequest, createSession } from '@/lib/session';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

// Rate limiting for refresh attempts
const refreshAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_REFRESH_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRefreshRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `refresh_${ip}`;
  const attempts = refreshAttempts.get(key);
  
  if (!attempts || now > attempts.resetTime) {
    refreshAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempts.count >= MAX_REFRESH_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Token refresh attempt started');
    
    // Rate limiting by IP
    const clientIP = getClientIP(request);
    if (!checkRefreshRateLimit(clientIP)) {
      console.log('❌ Refresh rate limit exceeded for IP:', clientIP);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many refresh attempts. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    // CSRF validation
    const isValidCSRF = validateCSRFFromRequest(request);
    if (!isValidCSRF) {
      console.log('❌ CSRF validation failed');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid CSRF token',
          error: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      );
    }
    
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh-token')?.value;
    if (!refreshToken) {
      console.log('❌ No refresh token found');
      return NextResponse.json(
        {
          success: false,
          message: 'No refresh token provided',
          error: 'NO_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    }
    
    // Refresh the access token
    const newTokens = await refreshAccessToken(refreshToken);
    if (!newTokens) {
      console.log('❌ Token refresh failed');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired refresh token',
          error: 'INVALID_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    }
    
    // Get user data for session creation
    await getConnection();
    
    // Decode the new tokens to get user info
    const { verifyToken } = await import('@/lib/jwt');
    const payload = await verifyToken(newTokens.accessToken, 'access');
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unable to decode refreshed token',
          error: 'TOKEN_DECODE_FAILED'
        },
        { status: 401 }
      );
    }
    
    // Find user to create new session
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // Create new session with refreshed tokens
    const sessionData = createSession(user, newTokens);
    
    console.log('✅ Token refresh successful');
    
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newTokens.accessToken,
        expiresAt: newTokens.expiresAt,
        csrfToken: sessionData.csrfToken
      }
    });
    
    // Save new session to cookies
    saveSessionToResponse(response, sessionData);
    
    return response;
    
  } catch (error: any) {
    console.error('❌ Token refresh error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Token refresh failed',
        error: 'REFRESH_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    },
  });
}
