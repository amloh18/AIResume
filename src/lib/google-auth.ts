import { signIn, getSession } from 'next-auth/react';

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  needsOnboarding?: boolean;
}

/**
 * Simple Google Authentication Handler using NextAuth
 * This function handles Google OAuth sign-in through NextAuth
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    console.log('🚀 Starting Google sign-in process...');
    
    // Sign in with NextAuth using Google provider
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
    
    // Get the session to access user data
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
    
    // Check if user needs onboarding (has CVs)
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
    
    let errorMessage = 'An error occurred during sign-in';
    
    if (error.message) {
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
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Get Google authentication configuration status
 */
export function getGoogleAuthConfigStatus() {
  return {
    googleOAuth: {
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    },
    configured: isGoogleAuthConfigured()
  };
}
