// Comprehensive cookie cleanup utility to prevent 431 errors
// This addresses the "Request Header Fields Too Large" error by removing excess cookies

/**
 * Clears all authentication-related cookies to prevent 431 errors
 * This is the main function to call when experiencing cookie bloat
 */
export function clearOversizedSessionCookies() {
  if (typeof window === 'undefined') return;

  try {
    const currentDomain = window.location.hostname;
    const isSecure = window.location.protocol === 'https:';
    
    // Complete list of cookies that might be causing the 431 error
    const cookiesToClear = [
      // Legacy authentication cookies
      'auth-session',
      'auth-session-secure',
      'auth-token',
      'refresh-token',
      'csrf-token',
      'session-info',
      'user-token',
      
      // Custom auth system cookies (lib/custom-auth.ts)
      'auth-token',
      
      // Admin auth cookies (admin login route)
      'admin-token',
      
      // NextAuth cookies (development environment)
      'next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token',
      
      // NextAuth cookies (production environment)
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.callback-url',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      
      // Additional authentication-related cookies
      'session-token',
      'access-token',
      'token',
      'login-token',
      
      // Any cookie with auth/session related names
      'auth',
      'session',
      'token',
      'csrf'
    ];
    
    // Clear all identified cookies with various clearing strategies
    cookiesToClear.forEach(cookieName => {
      // Strategy 1: Clear with strict samesite
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=strict`;
      
      // Strategy 2: Clear with lax samesite (for NextAuth compatibility)
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=lax`;
      
      // Strategy 3: Clear with none samesite (for cross-site cookies)
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''} samesite=none`;
      
      // Strategy 4: Clear without samesite specification
      document.cookie = `${cookieName}=; path=/; max-age=0; ${isSecure ? 'secure;' : ''}`;
      
      // Strategy 5: Clear with domain specification
      document.cookie = `${cookieName}=; path=/; max-age=0; domain=${currentDomain}; ${isSecure ? 'secure;' : ''}`;
    });
    
    // Clear localStorage data that might be causing session bloat
    const storageKeysToCheck = [
      'auth-session',
      'user',
      'session',
      'ai-career-report-data',
      'cv-data',
      'onboarding-data',
      'profile-data',
      'settings'
    ];
    
    storageKeysToCheck.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data && data.length > 50000) { // If data is larger than 50KB
          localStorage.removeItem(key);
        } else if (data) {
          // Keep small data but remove if it contains sensitive auth info
          if (data.includes('token') || data.includes('session') || data.includes('auth')) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Silently handle localStorage errors
      }
    });
    
    // Clear sessionStorage data
    sessionStorage.clear();
  } catch {
    // Silently handle cleanup errors
  }
}

/**
 * Proactive cookie monitoring and cleanup
 * Call this function to prevent cookie bloat before it causes 431 errors
 */
export function monitorAndPreventCookieBloat() {
  if (typeof window === 'undefined') return;

  try {
    // Check current cookie count
    const allCookies = document.cookie.split(';');
    const cookieCount = allCookies.filter(c => c.trim()).length;
    
    // Check for NextAuth cookies specifically
    const nextAuthCookies = allCookies.filter(c => 
      c.trim().includes('next-auth') || 
      c.trim().startsWith('__Secure-') ||
      c.trim().startsWith('__Host-')
    );
    
    // If we have too many cookies, clean up proactively
    if (cookieCount > 10 || nextAuthCookies.length > 5) {
      clearOversizedSessionCookies();
      
      // Force page reload to get fresh cookies
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
    
    // If individual cookie is too large, clean it up
    allCookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      if (value && value.length > 4000) { // Approximate limit for cookie size
        clearOversizedSessionCookies();
        setTimeout(() => window.location.reload(), 100);
      }
    });
    
  } catch {
    // Silently handle monitoring errors
  }
}

/**
 * Nuclear option: Remove ALL cookies except the essential NextAuth ones
 * This is the most aggressive cleanup method
 */
export function nuclearCleanupAllNonEssentialCookies() {
  if (typeof window === 'undefined') return;
  
  try {
    const allCookies = document.cookie.split(';');
    const essentialNextAuthCookies = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.session-token'
    ];
    
    allCookies.forEach(cookie => {
      const [name] = cookie.split('=');
      const trimmedName = name.trim();
      
      // Check if this is an essential NextAuth cookie we want to keep
      const isEssential = essentialNextAuthCookies.some(essential =>
        trimmedName.includes(essential) || essential.includes(trimmedName)
      );
      
      if (!isEssential) {
        // Clear this cookie with all possible methods
        const methods = [
          () => document.cookie = `${trimmedName}=; path=/; max-age=0;`,
          () => document.cookie = `${trimmedName}=; path=/; max-age=0; samesite=strict;`,
          () => document.cookie = `${trimmedName}=; path=/; max-age=0; samesite=lax;`,
          () => document.cookie = `${trimmedName}=; path=/; max-age=0; samesite=none;`,
          () => document.cookie = `${trimmedName}=; domain=${window.location.hostname}; path=/; max-age=0;`,
          () => document.cookie = `${trimmedName}=; domain=.${window.location.hostname.split('.').slice(-2).join('.')}; path=/; max-age=0;`
        ];
        
        methods.forEach(method => method());
      }
    });
    
  } catch {
    // Silently handle nuclear cleanup errors
  }
}

/**
 * Emergency cleanup for 431 errors
 * Call this when you already have the error
 */
export function emergencyCleanup431Error() {
  // Use nuclear cleanup first
  nuclearCleanupAllNonEssentialCookies();
  
  // Clear any blocking localStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Force reload after a brief delay
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

/**
 * Initialize automatic cleanup on page load
 */
if (typeof window !== 'undefined') {
  // Check if we're getting 431 errors and handle them
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('431')) {
      emergencyCleanup431Error();
    }
  });
  
  // Run cleanup checks periodically
  setInterval(monitorAndPreventCookieBloat, 30000); // Every 30 seconds
  
  // Run cleanup on page load
  setTimeout(() => {
    monitorAndPreventCookieBloat();
  }, 1000);
}
