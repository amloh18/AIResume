// Utility to clear oversized session cookies
// This can be called when the session cookie becomes too large

export function clearOversizedSessionCookies() {
  if (typeof window !== 'undefined') {
    try {
      // Clear all NextAuth cookies
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const [name] = cookie.split('=');
        if (name.trim().includes('next-auth')) {
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      });
      
      // Clear localStorage data that might be causing issues
      const keysToCheck = [
        'ai-career-report-data',
        'auth-session',
        'user',
        'session'
      ];
      
      keysToCheck.forEach(key => {
        const data = localStorage.getItem(key);
        if (data && data.length > 100000) { // If data is larger than 100KB
          console.warn(`Clearing oversized localStorage data: ${key} (${data.length} bytes)`);
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Cleared oversized session cookies and localStorage data');
    } catch (error) {
      console.error('❌ Error clearing session cookies:', error);
    }
  }
}

// Auto-clear on page load if session is too large
if (typeof window !== 'undefined') {
  // Check if session cookie is too large
  const sessionCookie = document.cookie
    .split(';')
    .find(cookie => cookie.trim().startsWith('next-auth.session-token'));
  
  if (sessionCookie && sessionCookie.length > 4000) {
    console.warn('⚠️ Session cookie is too large, clearing it');
    clearOversizedSessionCookies();
    // Reload page to get fresh session
    window.location.reload();
  }
}
