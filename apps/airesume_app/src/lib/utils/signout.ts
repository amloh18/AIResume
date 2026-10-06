import { signOut } from 'next-auth/react';

/**
 * Comprehensive signout utility using NextAuth
 * Clears all browser storage and redirects to home page
 * 
 * Migration Note: This has been simplified to only use NextAuth.
 * Firebase authentication has been removed.
 */
export const comprehensiveSignOut = async (): Promise<void> => {
  try {
    console.log('🔍 Starting signout process...');

    // Set a flag to prevent any auto-login or guest session creation
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('logout-in-progress', 'true');
    }

    // Step 1: Call our custom signout API endpoint FIRST to invalidate server-side cache
    // This needs to happen while the session is still valid to get the user ID.
    // Raced against a timeout so a slow/hung endpoint can never block the
    // redirect below — the cookie clearing also happens in Step 2 and via
    // document.cookie fallbacks, so logout must always proceed.
    try {
      console.log('🔍 Calling custom signout API endpoint...');
      await Promise.race([
        fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
      console.log('✅ Custom signout API endpoint called, cache invalidated');
    } catch (error) {
      console.error('❌ Error calling signout API:', error);
    }

    // Step 2: Sign out from NextAuth (this destroys the session)
    try {
      console.log('🔍 Signing out from NextAuth...');
      await signOut({
        redirect: false,
        callbackUrl: '/'
      });
      console.log('✅ Signed out from NextAuth');
    } catch (error) {
      console.error('❌ Error signing out from NextAuth:', error);
    }


    // Step 3: Explicitly clear all NextAuth cookies (in case signOut didn't work)
    if (typeof document !== 'undefined') {
      console.log('🔍 Explicitly clearing NextAuth cookies...');
      const currentDomain = window.location.hostname;
      const isSecure = window.location.protocol === 'https:';
      // Detect production by checking if domain contains buildairesume.com or if using secure protocol
      const isProduction = currentDomain.includes('buildairesume.com') || (isSecure && currentDomain !== 'localhost');

      // NextAuth cookie names (both dev and production), including chunked
      // session-token variants NextAuth may use for large JWTs
      const nextAuthCookies = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.session-token.0',
        'next-auth.session-token.1',
        'next-auth.session-token.2',
        'next-auth.session-token.3',
        '__Secure-next-auth.session-token.0',
        '__Secure-next-auth.session-token.1',
        '__Secure-next-auth.session-token.2',
        '__Secure-next-auth.session-token.3',
        'next-auth.csrf-token',
        '__Secure-next-auth.csrf-token',
        'next-auth.callback-url',
        '__Secure-next-auth.callback-url',
      ];

      nextAuthCookies.forEach(cookieName => {
        // Clear with various configurations to ensure deletion
        const domains = isProduction ? [currentDomain, `.${currentDomain}`, ''] : [currentDomain, ''];
        const paths = ['/', ''];
        const sameSites = ['strict', 'lax', 'none', ''];

        domains.forEach(domain => {
          paths.forEach(path => {
            sameSites.forEach(sameSite => {
              try {
                let cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; max-age=0`;
                if (path) cookieString += `; path=${path}`;
                if (domain) cookieString += `; domain=${domain}`;
                if (sameSite) cookieString += `; samesite=${sameSite}`;
                if (isSecure || cookieName.startsWith('__Secure-')) cookieString += '; secure';
                document.cookie = cookieString;
              } catch (e) {
                // Ignore errors for invalid combinations
              }
            });
          });
        });
      });
      console.log('✅ Cleared NextAuth cookies');
    }

    // Preserve cookie consent (not user-specific, should persist across sessions)
    const cookieConsent = localStorage.getItem('cookieConsent');
    const cookieConsentExpiry = localStorage.getItem('cookieConsentExpiry');
    const cookiePreferences = localStorage.getItem('cookiePreferences');

    // Clear ALL localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Cleared all storage');
    } catch (error) {
      console.error('⚠️ Error clearing storage:', error);
    }

    // Clear session cookies related to CV data
    if (typeof document !== 'undefined') {
      const cookiesToClear = ['cv-draft-session-id'];
      const currentDomain = window.location.hostname;
      const isSecure = window.location.protocol === 'https:';

      cookiesToClear.forEach(cookieName => {
        // Clear with various configurations to ensure deletion
        const domains = [currentDomain, `.${currentDomain}`, ''];
        const paths = ['/', ''];
        const sameSites = ['strict', 'lax', 'none', ''];

        domains.forEach(domain => {
          paths.forEach(path => {
            sameSites.forEach(sameSite => {
              try {
                let cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; max-age=0`;
                if (path) cookieString += `; path=${path}`;
                if (domain) cookieString += `; domain=${domain}`;
                if (sameSite) cookieString += `; samesite=${sameSite}`;
                if (isSecure) cookieString += '; secure';
                document.cookie = cookieString;
              } catch (e) {
                // Ignore errors for invalid combinations
              }
            });
          });
        });
      });
      console.log('✅ Cleared CV-related cookies');
    }

    // Restore cookie consent after clearing
    if (cookieConsent) {
      try {
        localStorage.setItem('cookieConsent', cookieConsent);
      } catch (e) {
        console.warn('⚠️ Could not restore cookieConsent');
      }
    }
    if (cookieConsentExpiry) {
      try {
        localStorage.setItem('cookieConsentExpiry', cookieConsentExpiry);
      } catch (e) {
        console.warn('⚠️ Could not restore cookieConsentExpiry');
      }
    }
    if (cookiePreferences) {
      try {
        localStorage.setItem('cookiePreferences', cookiePreferences);
      } catch (e) {
        console.warn('⚠️ Could not restore cookiePreferences');
      }
    }

    // Set flag in sessionStorage to prevent landing page from re-signing out
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('logout-complete', 'true');
    }

    console.log('✅ Logout complete, redirecting...');

    // Force redirect WITHOUT logout parameter (clean redirect)
    const timestamp = Date.now();
    window.location.replace(`/?_t=${timestamp}`);

  } catch (error) {
    console.error('❌ Error during signout:', error);
    // Fallback - clear everything and force redirect
    try {
      localStorage.clear();
      sessionStorage.clear();

      // Force redirect
      const timestamp = Date.now();
      window.location.replace(`/?_t=${timestamp}`);
    } catch (fallbackError) {
      console.error('❌ Fallback signout failed:', fallbackError);
      // Last resort - just redirect
      window.location.replace('/');
    }
  }
};
