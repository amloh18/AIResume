import { signOut } from 'next-auth/react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearSessionFromStorage, getCSRFToken } from '@/lib/session';

/**
 * Comprehensive signout utility that handles both Firebase and NextAuth users
 * Clears all browser storage and redirects to home page
 */
export const comprehensiveSignOut = async (): Promise<void> => {
  try {
    console.log('🔍 Starting comprehensive signout process...');
    
    // Call server-side logout API to clear HTTP-only cookies first
    try {
      console.log('🔍 Calling server-side logout API...');
      const csrfToken = getCSRFToken();
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log('✅ Server-side logout successful');
      } else {
        console.warn('⚠️ Server-side logout failed, continuing with client-side cleanup');
      }
    } catch (error) {
      console.error('❌ Error calling server-side logout:', error);
    }
    
    // Sign out from Firebase
    try {
      console.log('🔍 Signing out from Firebase...');
      await firebaseSignOut(auth);
      console.log('✅ Signed out from Firebase');
    } catch (error) {
      console.error('❌ Error signing out from Firebase:', error);
    }
    
    // Sign out from NextAuth
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
    
    // Clear all client-side storage using the session utility
    clearSessionFromStorage();
    
    // Clear additional localStorage items
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
      localStorage.removeItem(key);
    });
    
    console.log('✅ Cleared all storage');
    
    // Force redirect with cache busting
    const timestamp = Date.now();
    window.location.replace(`/?_t=${timestamp}&logout=success`);
    
  } catch (error) {
    console.error('❌ Error during comprehensive signout:', error);
    // Fallback - clear everything and force redirect
    try {
      clearSessionFromStorage();
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

/**
 * Simple signout for Firebase users only
 */
export const firebaseSignOutOnly = async (): Promise<void> => {
  try {
    console.log('🔍 Signing out from Firebase...');
    await firebaseSignOut(auth);
    clearSessionFromStorage();
    console.log('✅ Signed out from Firebase');
    window.location.href = '/';
  } catch (error) {
    console.error('❌ Error during Firebase signout:', error);
    // Fallback
    clearSessionFromStorage();
    window.location.href = '/';
  }
};

/**
 * Simple signout for NextAuth users only
 */
export const nextAuthSignOutOnly = async (): Promise<void> => {
  try {
    console.log('🔍 Signing out from NextAuth...');
    await signOut({ 
      redirect: false,
      callbackUrl: '/'
    });
    clearSessionFromStorage();
    console.log('✅ Signed out from NextAuth');
    window.location.href = '/';
  } catch (error) {
    console.error('❌ Error during NextAuth signout:', error);
    // Fallback
    clearSessionFromStorage();
    window.location.href = '/';
  }
};