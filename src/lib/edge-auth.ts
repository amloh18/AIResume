/**
 * Edge Runtime compatible authentication utilities
 * Works in middleware without requiring Node.js modules like 'jose'
 */

import { NextRequest } from 'next/server';

interface JWTPayload {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  type?: string;
  iat?: number;
  exp?: number;
}

/**
 * Parse JWT token without external dependencies
 * This is a simplified JWT parser for Edge Runtime compatibility
 * Note: This does not verify the signature, only decodes the payload
 */
function parseJWT(token: string): JWTPayload | null {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    
    // Add padding if needed (base64 padding)
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64url to base64, then decode
    // NextAuth uses base64url encoding (RFC 4648)
    const base64Payload = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(base64Payload);
    
    // Parse JSON
    const parsed = JSON.parse(decodedPayload);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) {
      return null;
    }
    
    // Validate required fields - at least id or email must be present
    if (!parsed.id && !parsed.email) {
      return null;
    }
    
    return parsed as JWTPayload;
  } catch (error) {
    // Silently fail - token might be encrypted or invalid format
    // Don't log in production to avoid noise
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT parsing error:', error);
    }
    return null;
  }
}

/**
 * Get JWT token from request cookies
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from cookies in order of preference
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value ||
                      request.cookies.get('auth-token')?.value ||
                      request.cookies.get('user-token')?.value;
  
  return sessionToken || null;
}

/**
 * Verify JWT token and return payload
 * This is a simplified verification for Edge Runtime
 */
export function verifyToken(request: NextRequest): JWTPayload | null {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return null;
    }

    // Parse the JWT token
    const payload = parseJWT(token);
    
    if (!payload) {
      return null;
    }

    // Basic validation - at least id or email must be present
    if (!payload.id && !payload.email) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has admin role
 * Checks both role and type fields to support admin authentication
 */
export function isAdmin(payload: JWTPayload | null): boolean {
  if (!payload) return false;
  
  // Check role field
  const hasAdminRole = payload.role === 'admin' || payload.role === 'superadmin';
  
  // Check type field (set by admin-credentials provider)
  const hasAdminType = payload.type === 'admin';
  
  return hasAdminRole || hasAdminType;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(payload: JWTPayload | null): boolean {
  return payload !== null;
}

/**
 * Get user ID from token payload
 */
export function getUserId(payload: JWTPayload | null): string | null {
  return payload?.id || null;
}

/**
 * Get user type from token payload
 */
export function getUserType(payload: JWTPayload | null): string | null {
  return payload?.type || null;
}

/**
 * Get user role from token payload
 */
export function getUserRole(payload: JWTPayload | null): string | null {
  return payload?.role || null;
}
