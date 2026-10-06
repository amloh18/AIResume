// Edge Runtime compatible JWT implementation using jose library
import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || process.env.NEXTAUTH_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string; // Add session tracking
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for revocation
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// In-memory token blacklist (in production, use Redis)
const revokedTokens = new Set<string>();

// Rate limiting for JWT operations
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

// Rate limiting function
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const key = `jwt_${identifier}`;
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  limit.count++;
  return true;
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

// Generate secure session ID
function generateSessionId(): string {
  return crypto.randomUUID();
}

// Generate JWT ID for revocation
function generateJTI(): string {
  return crypto.randomUUID();
}

export async function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp' | 'sessionId' | 'tokenType' | 'jti'>): Promise<TokenPair> {
  if (!payload.userId || !payload.email) {
    throw new Error('JWT generation requires userId and email');
  }
  
  // Rate limiting
  if (!checkRateLimit(payload.userId)) {
    throw new Error('Rate limit exceeded for token generation');
  }
  
  const sessionId = generateSessionId();
  const accessJTI = generateJTI();
  const refreshJTI = generateJTI();
  
  // Generate access token (15 minutes)
  const accessToken = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sessionId,
    tokenType: 'access',
    jti: accessJTI
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('circle-cv-app')
    .setAudience('circle-cv-app-users')
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
  
  // Generate refresh token (7 days)
  const refreshToken = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sessionId,
    tokenType: 'refresh',
    jti: refreshJTI
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('circle-cv-app')
    .setAudience('circle-cv-app-users')
    .setExpirationTime('7d')
    .sign(REFRESH_SECRET);
    
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
  };
}

// Legacy function for backward compatibility - now generates only access token
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'sessionId' | 'tokenType' | 'jti'>): Promise<string> {
  const tokenPair = await generateTokenPair(payload);
  return tokenPair.accessToken;
}

export async function verifyToken(token: string, tokenType: 'access' | 'refresh' = 'access'): Promise<JWTPayload | null> {
  if (!token || typeof token !== 'string') {
    console.error('JWT verification failed: Invalid token format');
    return null;
  }

  try {
    // Check if token is revoked
    const decoded = decodeToken(token);
    if (decoded?.jti && revokedTokens.has(decoded.jti)) {
      console.error('JWT verification failed: Token has been revoked');
      return null;
    }
    
    const secret = tokenType === 'refresh' ? REFRESH_SECRET : JWT_SECRET;
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'circle-cv-app',
      audience: 'circle-cv-app-users'
    });
    
    const validatedPayload = payload as unknown as JWTPayload;
    
    // Additional validation
    if (!validatedPayload.userId || !validatedPayload.email) {
      console.error('JWT verification failed: Missing required fields');
      return null;
    }
    
    // Verify token type matches expected
    if (validatedPayload.tokenType !== tokenType) {
      console.error('JWT verification failed: Token type mismatch');
      return null;
    }
    
    return validatedPayload;
  } catch (error: any) {
    console.error('JWT verification failed:', {
      name: error.name,
      message: error.message,
      tokenLength: token?.length || 0,
      tokenType
    });
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  if (!token || typeof token !== 'string') {
    console.error('JWT decode failed: Invalid token format');
    return null;
  }

  try {
    const decoded = decodeJwt(token) as unknown as JWTPayload;
    
    // Basic validation of decoded payload
    if (!decoded || typeof decoded !== 'object') {
      console.error('JWT decode failed: Invalid payload');
      return null;
    }
    
    return decoded;
  } catch (error: any) {
    console.error('JWT decode failed:', {
      name: error.name,
      message: error.message,
      tokenLength: token?.length || 0
    });
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

// Refresh token function
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  try {
    const payload = await verifyToken(refreshToken, 'refresh');
    if (!payload) {
      return null;
    }
    
    // Generate new token pair
    const newTokenPair = await generateTokenPair({
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });
    
    // Revoke old refresh token
    if (payload.jti) {
      revokedTokens.add(payload.jti);
    }
    
    return newTokenPair;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

// Revoke token function
export function revokeToken(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (decoded?.jti) {
      revokedTokens.add(decoded.jti);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token revocation failed:', error);
    return false;
  }
}

// Synchronous version for Edge Runtime compatibility
export function verifyTokenSync(token: string, tokenType: 'access' | 'refresh' = 'access'): JWTPayload | null {
  // For middleware, we'll use a simpler approach - just decode and validate structure
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.userId || !decoded.email) {
      return null;
    }
    
    // Check if token is revoked
    if (decoded.jti && revokedTokens.has(decoded.jti)) {
      return null;
    }
    
    // Check token type
    if (decoded.tokenType !== tokenType) {
      return null;
    }
    
    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Sync JWT verification failed:', error);
    return null;
  }
}

// Validate CSRF token from request
export function validateCSRFToken(request: NextRequest, token: string): boolean {
  const headerToken = request.headers.get('x-csrf-token');
  return headerToken === token;
}

// Extract IP address for rate limiting
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}
