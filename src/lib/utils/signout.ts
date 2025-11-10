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
    
    // Sign out from NextAuth (clears HTTP-only cookies)
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
    
    // Preserve cookie consent (not user-specific, should persist across sessions)
    const cookieConsent = localStorage.getItem('cookieConsent');
    const cookieConsentExpiry = localStorage.getItem('cookieConsentExpiry');
    const cookiePreferences = localStorage.getItem('cookiePreferences');
    
    // Clear additional localStorage items (application-specific data)
    const additionalKeys = [
      'cv-app-notifications',
      'onboarding-completed',
      'temp_password',
      'jobJourneyState',
      'needsCVSetup',
      'ai-career-report-data',
      'cv-data'
    ];
    
    additionalKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`⚠️ Could not remove ${key} from localStorage`);
      }
    });
    
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
    
    console.log('✅ Cleared all storage');
    
    // Force redirect with cache busting
    const timestamp = Date.now();
    window.location.replace(`/?_t=${timestamp}&logout=success`);
    
  } catch (error) {
    console.error('❌ Error during signout:', error);
    // Fallback - clear everything and force redirect
    // Preserve cookie consent even in fallback
    const cookieConsent = localStorage.getItem('cookieConsent');
    const cookieConsentExpiry = localStorage.getItem('cookieConsentExpiry');
    const cookiePreferences = localStorage.getItem('cookiePreferences');
    
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear session cookies related to CV data
      if (typeof document !== 'undefined') {
        const cookiesToClear = ['cv-draft-session-id'];
        const currentDomain = window.location.hostname;
        const isSecure = window.location.protocol === 'https:';
        
        cookiesToClear.forEach(cookieName => {
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
                  // Ignore errors
                }
              });
            });
          });
        });
      }
      
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
      
      // Force redirect with cache busting
      const timestamp = Date.now();
      window.location.replace(`/?_t=${timestamp}&logout=fallback`);
    } catch (fallbackError) {
      console.error('❌ Fallback signout failed:', fallbackError);
      // Last resort - just redirect
      window.location.replace('/');
    }
  }
};
