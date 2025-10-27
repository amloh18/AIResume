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
    
    // Clear additional localStorage items (application-specific data)
    const additionalKeys = [
      'cv-app-notifications',
      'onboarding-completed',
      'temp_password',
      'cookieConsent',
      'cookiePreferences',
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
    
    console.log('✅ Cleared all storage');
    
    // Force redirect with cache busting
    const timestamp = Date.now();
    window.location.replace(`/?_t=${timestamp}&logout=success`);
    
  } catch (error) {
    console.error('❌ Error during signout:', error);
    // Fallback - clear everything and force redirect
    try {
      localStorage.clear();
      sessionStorage.clear();
      
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
