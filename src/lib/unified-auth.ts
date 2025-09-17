import { signInWithEmailAndPassword } from 'firebase/auth';
import { signIn } from 'next-auth/react';
import { auth } from '@/lib/firebase';

export interface UnifiedAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  method?: 'firebase' | 'nextauth';
}

/**
 * Unified Authentication Handler
 * Tries Firebase authentication first, falls back to NextAuth if Firebase fails
 */
export async function signInWithEmail(email: string, password: string): Promise<UnifiedAuthResult> {
  try {
    console.log('🚀 Starting unified email/password authentication...');
    
    // Step 1: Try Firebase authentication first
    try {
      console.log('🔥 Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Firebase authentication successful:', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified
      });
      
      // Get Firebase ID token and sign in with NextAuth
      const idToken = await firebaseUser.getIdToken();
      const nextAuthResult = await signIn('firebase', { 
        idToken, 
        redirect: false 
      });
      
      if (nextAuthResult?.error) {
        console.error('❌ NextAuth sign-in failed after Firebase success:', nextAuthResult.error);
        return {
          success: false,
          error: `Authentication failed: ${nextAuthResult.error}`,
          method: 'firebase'
        };
      }
      
      if (!nextAuthResult?.ok) {
        console.error('❌ NextAuth sign-in unsuccessful after Firebase success');
        return {
          success: false,
          error: 'Authentication was unsuccessful',
          method: 'firebase'
        };
      }
      
      console.log('✅ Unified authentication successful via Firebase');
      return {
        success: true,
        user: firebaseUser,
        method: 'firebase'
      };
      
    } catch (firebaseError: any) {
      console.log('🔥 Firebase authentication failed:', firebaseError.code);
      
      // Step 2: Fallback to NextAuth credentials provider
      try {
        console.log('🔐 Attempting NextAuth credentials authentication...');
        const nextAuthResult = await signIn('credentials', { 
          email, 
          password, 
          redirect: false 
        });
        
        if (nextAuthResult?.error) {
          console.error('❌ NextAuth credentials sign-in failed:', nextAuthResult.error);
          return {
            success: false,
            error: 'Invalid email or password. Please try again.',
            method: 'nextauth'
          };
        }
        
        if (!nextAuthResult?.ok) {
          console.error('❌ NextAuth credentials sign-in unsuccessful');
          return {
            success: false,
            error: 'Authentication was unsuccessful',
            method: 'nextauth'
          };
        }
        
        console.log('✅ Unified authentication successful via NextAuth');
        return {
          success: true,
          user: { email, method: 'nextauth' },
          method: 'nextauth'
        };
        
      } catch (nextAuthError: any) {
        console.error('❌ NextAuth credentials authentication failed:', nextAuthError);
        
        // Determine the most appropriate error message
        if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
          return {
            success: false,
            error: 'Invalid email or password. Please try again.',
            method: 'nextauth'
          };
        } else if (firebaseError.code === 'auth/invalid-email') {
          return {
            success: false,
            error: 'Invalid email address',
            method: 'nextauth'
          };
        } else if (firebaseError.code === 'auth/too-many-requests') {
          return {
            success: false,
            error: 'Too many failed attempts. Please try again later',
            method: 'nextauth'
          };
        } else {
          return {
            success: false,
            error: 'Authentication failed. Please try again.',
            method: 'nextauth'
          };
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Unified authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed. Please try again.'
    };
  }
}
