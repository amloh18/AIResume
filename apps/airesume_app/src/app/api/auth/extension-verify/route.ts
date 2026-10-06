import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { User } from '@/models';
import { getConnection } from '@/lib/database';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { formatExtensionError, formatExtensionSuccess, ExtensionErrorCode } from '@/lib/utils/extension-errors';
import { getSessionSecret } from '@/lib/auth/session-cookie';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limiter';

// In-memory token blacklist (in production, use Redis)
const revokedTokens = new Set<string>();

/**
 * Add token to blacklist (for logout/revocation)
 */
function revokeToken(token: string): void {
  revokedTokens.add(token);
  // Clean up old tokens periodically (keep last 1000)
  if (revokedTokens.size > 1000) {
    const tokensArray = Array.from(revokedTokens);
    revokedTokens.clear();
    tokensArray.slice(-500).forEach(t => revokedTokens.add(t));
  }
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(token: string): boolean {
  return revokedTokens.has(token);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Extension Auth Verify API - Verifying JWT token');
    
    // Rate limiting: 30 requests per 15 minutes per IP
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const rateLimitResult = await rateLimiter.checkLimit(
      { ip: ipAddress, path: '/api/auth/extension-verify' },
      rateLimitConfigs.auth
    );
    
    if (!rateLimitResult.allowed) {
      console.log('❌ Extension Auth - Rate limit exceeded for IP:', ipAddress);
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.RATE_LIMIT_EXCEEDED,
          `Too many verification requests. Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.`,
          undefined,
          true,
          Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        ),
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimitConfigs.auth.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Extension Auth - No Bearer token provided');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_MISSING,
          'No Bearer token provided. Please include authorization header.'
        ),
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      console.log('❌ Extension Auth - Token is blacklisted');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_INVALID,
          'Token has been revoked. Please sign in again.'
        ),
        { status: 401 }
      );
    }
    
    // Verify JWT token.
    //
    // The secret is resolved BEFORE the try below and deliberately not with a fallback: this
    // repository is public, so a literal default would be a published signing key. Resolving it
    // out here also keeps a missing secret from being caught and re-reported as "invalid token",
    // which would hide a misconfiguration behind a routine 401.
    let sessionSecret: string;
    try {
      sessionSecret = getSessionSecret();
    } catch (secretError) {
      console.error('❌ Extension Auth -', (secretError as Error).message);
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.SERVER_ERROR,
          'Authentication is temporarily unavailable. Please try again shortly.',
          undefined,
          true
        ),
        { status: 500 }
      );
    }

    let decoded: MyJwtPayload;
    try {
      decoded = jwt.verify(token, sessionSecret) as MyJwtPayload;
    } catch (jwtError: any) {
      console.log('❌ Extension Auth - Invalid JWT token:', jwtError.message);
      
      // Check if token is expired
      if (jwtError.name === 'TokenExpiredError') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.AUTH_EXPIRED,
            'Token has expired. Please refresh your token or sign in again.',
            { expiredAt: jwtError.expiredAt }
          ),
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_INVALID,
          'Invalid token. Please sign in again.'
        ),
        { status: 401 }
      );
    }
    
    if (!decoded || !decoded.userId) {
      console.log('❌ Extension Auth - Invalid token payload');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_INVALID,
          'Invalid token payload'
        ),
        { status: 401 }
      );
    }
    
    if (decoded.type !== 'extension') {
      console.log('❌ Extension Auth - Invalid token type');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_INVALID,
          'Invalid token type. This endpoint requires an extension token.'
        ),
        { status: 401 }
      );
    }
    
    console.log('✅ Extension Auth - JWT token verified for user:', decoded.userId);
    
    // Connect to database
    await getConnection();
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ Extension Auth - User not found in database');
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.AUTH_FAILED,
          'User not found'
        ),
        { status: 404 }
      );
    }
    
    console.log('✅ Extension Auth - User verified:', user.email);
    
    // Calculate token expiration info
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;
    const now = new Date();
    const expiresInMs = expiresAt ? expiresAt.getTime() - now.getTime() : null;
    const expiresInDays = expiresInMs ? Math.ceil(expiresInMs / (24 * 60 * 60 * 1000)) : null;
    const isExpiringSoon = expiresInDays !== null && expiresInDays <= 7;
    
    // Return user data (without sensitive information)
    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    return NextResponse.json(
      formatExtensionSuccess({
        user: userData,
        tokenInfo: {
          expiresAt: expiresAt?.toISOString(),
          expiresInDays,
          isExpiringSoon,
          warning: isExpiringSoon ? `Token expires in ${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}. Please refresh soon.` : undefined
        }
      }, 'Token verified successfully')
    );
    
  } catch (error: any) {
    console.error('❌ Extension Auth - Error:', error);
    return NextResponse.json(
      formatExtensionError(
        ExtensionErrorCode.SERVER_ERROR,
        error.message || 'Internal server error'
      ),
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET(request: NextRequest) {
  return POST(request);
}
