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
      'needsCVSetup'
    ];
    
    additionalKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`⚠️ Could not remove ${key} from localStorage`);
      }
    });
    
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
