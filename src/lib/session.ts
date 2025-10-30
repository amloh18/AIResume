import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: Legacy session management
// This file is kept for backward compatibility but now only provides cleanup functions
// All new authentication should use NextAuth exclusively

// Helper function to clear legacy session data
function clearLegacySessionData() {
  if (typeof window === 'undefined') return;
  
  const legacyCookies = [
    'auth-session',
    'auth-session-secure',
    'auth-token',
    'refresh-token',
    'csrf-token',
    'session-info'
  ];
  
  legacyCookies.forEach(cookieName => {
    document.cookie = `${cookieName}=; path=/; max-age=0;`;
  });
  
  localStorage.removeItem('auth-session');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('needsCVSetup');
  sessionStorage.removeItem('fromLogin');
  sessionStorage.removeItem('fromRegistration');
}

/**
 * @deprecated Use NextAuth's useSession hook instead
 * This function is no longer maintained
 */
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
  tokens: any;
  csrfToken: string;
  expiresAt: number;
  sessionId: string;
}

/**
 * @deprecated This function is no longer used
 * NextAuth handles session creation automatically
 */
export function createSession(user: any, tokens: any): SessionData {
  console.warn('⚠️ createSession is deprecated. Use NextAuth for session management.');
  throw new Error('createSession is deprecated. Use NextAuth session management instead.');
}

/**
 * @deprecated This function is no longer used
 * NextAuth handles session validation automatically
 */
export async function validateSession(sessionData: SessionData): Promise<boolean> {
  console.warn('⚠️ validateSession is deprecated. Use NextAuth session validation.');
  throw new Error('validateSession is deprecated. Use NextAuth session management.');
}

/**
 * @deprecated This function is deprecated. Use NextAuth's useSession hook instead.
 * Kept for backward compatibility during migration period.
 */
export async function getSessionFromStorage(): Promise<SessionData | null> {
  console.warn('⚠️ getSessionFromStorage is deprecated. Please use NextAuth useSession hook.');
  
  if (typeof window === 'undefined') return null;
  
  try {
    // Clean up any legacy session data and return null
    clearLegacySessionData();
    return null;
  } catch (error) {
    console.error('Error cleaning session:', error);
    return null;
  }
}

/**
 * @deprecated This function is no longer used
 * NextAuth handles cookies automatically
 */
export function getSessionFromCookie(cookieHeader?: string): SessionData | null {
  console.warn('⚠️ getSessionFromCookie is deprecated. Use NextAuth useSession hook.');
  return null;
}

/**
 * @deprecated This function is deprecated. Use NextAuth's session management instead.
 * Kept for backward compatibility during migration period.
 */
export function saveSessionToStorage(sessionData: SessionData): void {
  console.warn('⚠️ saveSessionToStorage is deprecated. Please use NextAuth session management.');
  throw new Error('saveSessionToStorage is deprecated. Use NextAuth session management instead.');
}

/**
 * @deprecated This function is no longer used
 * NextAuth manages all cookies automatically
 */
export function saveSessionToResponse(response: NextResponse, sessionData: SessionData): void {
  console.warn('⚠️ saveSessionToResponse is deprecated. NextAuth manages cookies automatically.');
  // Do nothing - NextAuth handles this
}

/**
 * Clear legacy session data from storage
 */
export function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear legacy cookies first
    clearLegacySessionData();
    
    // Clear any orphaned localStorage/sessionStorage data that might cause issues
    localStorage.removeItem('auth-session');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('needsCVSetup');
    sessionStorage.removeItem('fromLogin');
    sessionStorage.removeItem('fromRegistration');
    
    console.log('✅ Cleared legacy session data');
  } catch (error) {
    console.error('Error clearing session from storage:', error);
  }
}

/**
 * @deprecated This function is no longer used
 * NextAuth manages all cookie cleanup automatically
 */
export function clearSessionFromResponse(response: NextResponse): void {
  console.warn('⚠️ clearSessionFromResponse is deprecated. NextAuth manages cookies automatically.');
  // Do nothing - NextAuth handles cookie cleanup
}

/**
 * @deprecated This function is no longer used
 * NextAuth handles CSRF tokens internally
 */
export function validateCSRFFromRequest(request: NextRequest): boolean {
  console.warn('⚠️ validateCSRFFromRequest is deprecated. NextAuth handles CSRF internally.');
  return false;
}

/**
 * @deprecated This function is no longer used
 * NextAuth handles CSRF tokens internally
 */
export function getCSRFToken(): string | null {
  console.warn('⚠️ getCSRFToken is deprecated. NextAuth handles CSRF internally.');
  return null;
}