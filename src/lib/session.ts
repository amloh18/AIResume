import { verifyToken, JWTPayload, TokenPair, generateCSRFToken } from './jwt';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    image?: string;
  };
  tokens: TokenPair;
  csrfToken: string;
  expiresAt: number;
  sessionId: string;
}

export function createSession(user: any, tokens: TokenPair): SessionData {
  return {
    user: {
      id: user.id || user._id,
      email: user.email,
      name: user.name || `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'user',
      image: user.image || user.avatar
    },
    tokens,
    csrfToken: generateCSRFToken(),
    expiresAt: tokens.expiresAt,
    sessionId: crypto.randomUUID()
  };
}

export async function validateSession(sessionData: SessionData): Promise<boolean> {
  if (!sessionData || !sessionData.tokens || !sessionData.user) {
    return false;
  }

  // Check if session is expired
  if (Date.now() > sessionData.expiresAt) {
    return false;
  }

  // Verify access token
  const payload = await verifyToken(sessionData.tokens.accessToken, 'access');
  if (!payload) {
    return false;
  }

  // Check if user ID matches
  return payload.userId === sessionData.user.id;
}

export async function getSessionFromStorage(): Promise<SessionData | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try to get from secure cookie first
    const cookieSession = getSessionFromCookie();
    if (cookieSession && await validateSession(cookieSession)) {
      return cookieSession;
    }
    
    // Fallback to localStorage (legacy)
    const stored = localStorage.getItem('auth-session');
    if (!stored) return null;
    
    const sessionData = JSON.parse(stored);
    return await validateSession(sessionData) ? sessionData : null;
  } catch (error) {
    console.error('Error parsing session from storage:', error);
    return null;
  }
}

// Get session from HTTP-only cookie (server-side)
export function getSessionFromCookie(cookieHeader?: string): SessionData | null {
  if (typeof window === 'undefined' && !cookieHeader) return null;
  
  try {
    let cookies: string;
    if (typeof window !== 'undefined') {
      cookies = document.cookie;
    } else {
      cookies = cookieHeader || '';
    }
    
    const match = cookies.match(/auth-session-secure=([^;]+)/);
    if (!match) return null;
    
    const sessionData = JSON.parse(decodeURIComponent(match[1]));
    return sessionData;
  } catch (error) {
    console.error('Error parsing session from cookie:', error);
    return null;
  }
}

export function saveSessionToStorage(sessionData: SessionData): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Save to localStorage for client-side access (legacy support)
    localStorage.setItem('auth-session', JSON.stringify(sessionData));
    
    // Save minimal data to secure HTTP-only cookie
    const secureCookieData = {
      userId: sessionData.user.id,
      sessionId: sessionData.sessionId,
      expiresAt: sessionData.expiresAt
    };
    
    const isSecure = window.location.protocol === 'https:';
    const maxAge = Math.floor((sessionData.expiresAt - Date.now()) / 1000);
    
    // Set secure session cookie
    document.cookie = `auth-session-secure=${encodeURIComponent(JSON.stringify(secureCookieData))}; path=/; max-age=${maxAge}; ${isSecure ? 'secure;' : ''} samesite=strict; httponly`;
    
    // Set CSRF token cookie (accessible to JS for form submissions)
    document.cookie = `csrf-token=${sessionData.csrfToken}; path=/; max-age=${maxAge}; ${isSecure ? 'secure;' : ''} samesite=strict`;
  } catch (error) {
    console.error('Error saving session to storage:', error);
  }
}

// Server-side session save function
export function saveSessionToResponse(response: NextResponse, sessionData: SessionData): void {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = Math.floor((sessionData.expiresAt - Date.now()) / 1000);
    
    // Set access token as HTTP-only cookie
    response.cookies.set('auth-token', sessionData.tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/'
    });
    
    // Set refresh token as HTTP-only cookie
    response.cookies.set('refresh-token', sessionData.tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });
    
    // Set CSRF token (accessible to JS)
    response.cookies.set('csrf-token', sessionData.csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/'
    });
    
    // Set session info
    const sessionInfo = {
      userId: sessionData.user.id,
      sessionId: sessionData.sessionId,
      expiresAt: sessionData.expiresAt
    };
    
    response.cookies.set('session-info', JSON.stringify(sessionInfo), {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/'
    });
  } catch (error) {
    console.error('Error saving session to response:', error);
  }
}

export function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear localStorage
    localStorage.removeItem('auth-session');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('needsCVSetup');
    sessionStorage.removeItem('fromLogin');
    sessionStorage.removeItem('fromRegistration');
    
    // Clear all auth-related cookies (including NextAuth cookies)
    const cookiesToClear = [
      'auth-session',
      'auth-session-secure', 
      'auth-token',
      'refresh-token',
      'csrf-token',
      'session-info',
      // NextAuth cookies (development)
      'next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token',
      // NextAuth cookies (production)
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.callback-url',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];
    
    const isSecure = window.location.protocol === 'https:';
    
    cookiesToClear.forEach(cookieName => {
      // Clear with current path and domain
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=strict`;
      // Also try clearing with lax same-site (for NextAuth cookies that might use it)
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=lax`;
      // Also try clearing with none same-site (for NextAuth cookies configured with none)
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=none`;
      // Clear without specifying samesite
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''}`;
    });
    
    console.log('✅ Cleared all session cookies including NextAuth cookies');
  } catch (error) {
    console.error('Error clearing session from storage:', error);
  }
}

// Server-side session clear function
export function clearSessionFromResponse(response: NextResponse): void {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookiesToClear = [
      'auth-token',
      'refresh-token', 
      'csrf-token',
      'session-info',
      // NextAuth cookies (development)
      'next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token',
      // NextAuth cookies (production)
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.callback-url',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Delete the cookie
      response.cookies.delete(cookieName);
      
      // Also explicitly set it to expired with max-age=0 (backup method)
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });
      
      // For NextAuth cookies with sameSite: 'none', also try that
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'none',
        maxAge: 0,
        path: '/'
      });
    });
    
    console.log('✅ Cleared all session cookies from response including NextAuth cookies');
  } catch (error) {
    console.error('Error clearing session from response:', error);
  }
}

// Validate CSRF token from request
export function validateCSRFFromRequest(request: NextRequest): boolean {
  try {
    const csrfHeader = request.headers.get('x-csrf-token');
    const csrfCookie = request.cookies.get('csrf-token')?.value;
    
    return csrfHeader === csrfCookie && csrfHeader !== null;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

// Get CSRF token from cookie
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}