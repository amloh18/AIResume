// Utility function to clear old session data from localStorage
// This helps with migration from old auth system to Firebase-based auth

export function clearOldSessionData() {
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
    
    console.log('✅ Cleared old session data');
  } catch (error) {
    console.error('Error clearing old session data:', error);
  }
}

// Auto-clear on import (for development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  clearOldSessionData();
}
