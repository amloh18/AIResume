/**
 * Authentication Helper for API Routes
 * Following BACKEND_INTEGRATION_GUIDE.md for Chrome Extension support
 * 
 * Supports both:
 * - NextAuth session cookies (web interface)
 * - JWT Bearer tokens (Chrome extension)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';

export interface AuthResult {
  userId: string;
  method: 'session' | 'token';
  source: 'web' | 'extension';
}

/**
 * Authenticates a request from either web (session) or extension (JWT token)
 * Following the guide pattern from BACKEND_INTEGRATION_GUIDE.md
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult | null> {
  // Try JWT Bearer token first (extension requests)
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
      
      if (decoded.type !== 'extension') {
        console.log('❌ Invalid token type');
        return null;
      }
      
      const userId = decoded.userId || decoded.id || '';
      if (!userId) {
        console.log('❌ No userId in extension token');
        return null;
      }
      
      console.log('✅ Extension token verified for user:', userId);
      return { userId, method: 'token', source: 'extension' };
    } catch (error: any) {
      console.log('❌ Invalid extension token:', error);
      return null;
    }
  }
  
  // Fall back to session (web interface requests)
  const authResult = await getAuthenticatedUser();
  
  if (!authResult) {
    console.log('❌ No valid authentication found for web request');
    return null;
  }
  
  console.log('✅ Web session verified for user:', authResult.userId);
  return { userId: authResult.userId, method: 'session', source: 'web' };
}

/**
 * Verifies extension JWT token
 * Following the guide pattern for optional JWT support
 */
export function verifyExtensionToken(authHeader: string | null): { userId: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
    
    // Verify it's an extension token
    if (decoded.type !== 'extension') {
      return null;
    }
    
    const userId = decoded.userId || decoded.id || '';
    if (!userId) {
      return null;
    }
    
    return { userId };
  } catch (error) {
    return null;
  }
}

