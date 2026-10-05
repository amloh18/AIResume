// IMMEDIATE FIX for 431 error - Run this in browser console first
// This will instantly remove all cookies causing the 431 error

export function immediate431Fix() {
  if (typeof window === 'undefined') {
    return;
  }

  // Get current cookies before cleanup
  const beforeCookies = document.cookie.split(';').filter(c => c.trim());
  
  // Remove ALL cookies except NextAuth session cookies
  beforeCookies.forEach(cookie => {
    const [name] = cookie.split('=');
    const trimmedName = name.trim();
    
    // Only keep essential NextAuth cookies
    if (!trimmedName.includes('next-auth.session-token') && 
        !trimmedName.includes('__Secure-next-auth.session-token') &&
        !trimmedName.includes('__Host-next-auth.session-token')) {
      
      // Clear with all possible methods
      const methods = [
        `${trimmedName}=; path=/; max-age=0;`,
        `${trimmedName}=; path=/; max-age=0; samesite=strict;`,
        `${trimmedName}=; path=/; max-age=0; samesite=lax;`,
        `${trimmedName}=; path=/; max-age=0; domain=${window.location.hostname};`,
        `${trimmedName}=; path=/; max-age=0; domain=.${window.location.hostname.split('.').slice(-2).join('.')};`
      ];
      
      methods.forEach(method => {
        document.cookie = method;
      });
    }
  });
  
  // Preserve cookie consent before clearing
  const cookieConsent = localStorage.getItem('cookieConsent');
  const cookieConsentExpiry = localStorage.getItem('cookieConsentExpiry');
  const cookiePreferences = localStorage.getItem('cookiePreferences');
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Restore cookie consent after clearing
  if (cookieConsent) {
    localStorage.setItem('cookieConsent', cookieConsent);
  }
  if (cookieConsentExpiry) {
    localStorage.setItem('cookieConsentExpiry', cookieConsentExpiry);
  }
  if (cookiePreferences) {
    localStorage.setItem('cookiePreferences', cookiePreferences);
  }
  
    // Check result
    setTimeout(()=>{

        const afterCookies = document.cookie.split(';').filter((c)=>c.trim());
        if (afterCookies.length <= 2) {
            // Success - 431 error should be fixed
        } else {
            // Still have multiple cookies, may need to reload
            window.location.reload();
        }
    }, 100);
}

// Add to global scope for easy access
if (typeof window !== 'undefined') {
  (window as any).fix431 = immediate431Fix;
}

// Don't auto-run - let SessionCleanup component call it explicitly
// This prevents clearing localStorage on every import
// immediate431Fix();
