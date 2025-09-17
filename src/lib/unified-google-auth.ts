import { signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { signIn, getSession } from 'next-auth/react';

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  needsOnboarding?: boolean;
}

/**
 * Unified Google Authentication Handler
 * This function handles the complete Google sign-in flow including:
 * 1. Firebase authentication
 * 2. NextAuth session creation
 * 3. User profile creation/update
 * 4. Proper error handling
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    console.log('🚀 Starting unified Google sign-in process...');
    
    // Step 1: Authenticate with Firebase
    const firebaseResult = await signInWithPopup(auth, googleProvider);
    const firebaseUser = firebaseResult.user;
    
    console.log('✅ Firebase authentication successful:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    });
    
    // Step 2: Get Firebase ID token
    const idToken = await firebaseUser.getIdToken();
    
    // Step 3: Sign in with NextAuth using Google provider
    const nextAuthResult = await signIn('google', {
      redirect: false
    });
    
    if (nextAuthResult?.error) {
      console.error('❌ NextAuth sign-in failed:', nextAuthResult.error);
      return {
        success: false,
        error: `Authentication failed: ${nextAuthResult.error}`
      };
    }
    
    if (!nextAuthResult?.ok) {
      console.error('❌ NextAuth sign-in unsuccessful');
      return {
        success: false,
        error: 'Authentication was unsuccessful'
      };
    }
    
    console.log('✅ NextAuth sign-in successful');
    
    // Step 4: Get the session to access user data
    const session = await getSession();
    
    if (!session?.user) {
      console.error('❌ No session data available after sign-in');
      return {
        success: false,
        error: 'Session data not available'
      };
    }
    
    console.log('✅ Session data retrieved:', {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name
    });
    
    // Step 5: Check if user needs onboarding (has CVs)
    try {
      const cvResponse = await fetch(`/api/cvs?userId=${session.user.id}&projection=count`);
      const cvResult = await cvResponse.json();
      
      const hasCVs = cvResult.success && cvResult.count > 0;
      console.log(`📊 User CV status: ${hasCVs ? 'Has CVs' : 'Needs onboarding'}`);
      
      return {
        success: true,
        user: session.user,
        needsOnboarding: !hasCVs
      };
      
    } catch (error: any) {
      console.warn('⚠️ Could not check CV status, assuming needs onboarding:', error.message);
      return {
        success: true,
        user: session.user,
        needsOnboarding: true
      };
    }
    
  } catch (error: any) {
    console.error('❌ Google sign-in error:', error);
    
    // Handle specific Firebase errors
    let errorMessage = 'An error occurred during sign-in';
    
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in was cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage = 'This domain is not authorized for Google sign-in. Please contact support.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Google sign-in is not enabled. Please contact support.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check if Google authentication is properly configured
 */
export function isGoogleAuthConfigured(): boolean {
  const hasGoogleCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );
  
  const hasFirebaseConfig = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  
  return hasGoogleCredentials && hasFirebaseConfig;
}

/**
 * Get Google authentication configuration status
 */
export function getGoogleAuthConfigStatus() {
  return {
    googleOAuth: {
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      publicClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    },
    firebase: {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    },
    configured: isGoogleAuthConfigured()
  };
}
