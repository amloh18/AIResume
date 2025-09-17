// Google Authentication Test Utility
export async function testGoogleAuth() {
  try {
    // Check if Google OAuth credentials are configured
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasPublicClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!hasClientId || !hasClientSecret || !hasPublicClientId) {
      return {
        success: false,
        error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variables.'
      };
    }
    
    // Check Firebase configuration
    const hasFirebaseConfig = !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
    
    if (!hasFirebaseConfig) {
      return {
        success: false,
        error: 'Firebase configuration incomplete. Please check your Firebase environment variables.'
      };
    }
    
    // Test Firebase initialization
    try {
      const { auth, googleProvider } = require('./firebase');
      if (!auth || !googleProvider) {
        return {
          success: false,
          error: 'Firebase authentication not properly initialized.'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Firebase initialization failed: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'Google authentication configuration is valid',
      details: {
        googleOAuth: {
          clientId: hasClientId,
          clientSecret: hasClientSecret,
          publicClientId: hasPublicClientId
        },
        firebase: {
          configured: hasFirebaseConfig,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        }
      }
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: `Test failed: ${error.message}`
    };
  }
}

// Test Google OAuth configuration
export function getGoogleAuthStatus() {
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
    }
  };
}
