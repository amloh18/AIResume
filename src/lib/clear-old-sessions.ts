// Utility function to clear old session data from localStorage
// This helps with migration from old auth system to NextAuth-based auth
// NOTE: This is superseded by the new comprehensive cleanup system in @/lib/utils/session-cleanup

export function clearOldSessionData() {
  console.warn('⚠️ clearOldSessionData is deprecated. Use the new cleanup system in @/lib/utils/session-cleanup instead.');
  
  if (typeof window === 'undefined') return;
  
  try {
    // Clear old auth session data
    localStorage.removeItem('auth-session');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('needsCVSetup');
    sessionStorage.removeItem('fromLogin');
    sessionStorage.removeItem('fromRegistration');
    
    // Clear old cookies
    const cookiesToClear = [
      'auth-session',
      'auth-session-secure', 
      'auth-token',
      'refresh-token',
      'csrf-token',
      'session-info'
    ];
    
    const isSecure = window.location.protocol === 'https:';
    
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=strict`;
    });
    
    console.log('✅ Cleared old session data (deprecated method)');
  } catch (error) {
    console.error('Error clearing old session data:', error);
  }
}

// Removed auto-clear to prevent interference with NextAuth session management
// Use the new comprehensive cleanup system instead:
// import { clearOversizedSessionCookies } from '@/lib/utils/session-cleanup';
