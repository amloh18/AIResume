'use client';

import { useSession } from 'next-auth/react';
import { useFirebaseAuth } from './useFirebaseAuth';
import { useMemo } from 'react';

interface UnifiedUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  firebaseUid?: string;
  isFirebaseUser: boolean;
  isNextAuthUser: boolean;
}

interface UseUnifiedAuthReturn {
  user: UnifiedUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  // Firebase specific methods
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
}

/**
 * Unified authentication hook that combines NextAuth and Firebase authentication
 * Provides a consistent interface across all dashboard pages
 */
export const useUnifiedAuth = (): UseUnifiedAuthReturn => {
  const { data: session, status: nextAuthStatus } = useSession();
  const { user: firebaseUser, loading: firebaseLoading, signInWithGoogle, signOut: firebaseSignOut, error: firebaseError } = useFirebaseAuth();

  // Determine loading state
  const loading = nextAuthStatus === 'loading' || firebaseLoading;

  // Create unified user object
  const user = useMemo((): UnifiedUser | null => {
    // Priority: NextAuth session first, then Firebase user
    if (session?.user) {
      return {
        id: session.user.id || session.user.email || '',
        email: session.user.email || '',
        name: session.user.name || session.user.email?.split('@')[0] || 'User',
        image: session.user.image,
        firebaseUid: undefined,
        isFirebaseUser: false,
        isNextAuthUser: true
      };
    }

    if (firebaseUser) {
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        image: firebaseUser.photoURL || undefined,
        firebaseUid: firebaseUser.uid,
        isFirebaseUser: true,
        isNextAuthUser: false
      };
    }

    return null;
  }, [session?.user, firebaseUser]);

  // Determine if user is authenticated
  const isAuthenticated = !!user;

  // Get user ID for API calls
  const userId = user?.id || null;

  // Unified sign out function
  const signOut = async (): Promise<void> => {
    try {
      // Sign out from both systems
      if (user?.isFirebaseUser) {
        await firebaseSignOut();
      }
      // NextAuth sign out is handled by the session provider
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    error: firebaseError,
    isAuthenticated,
    userId,
    signInWithGoogle,
    signOut
  };
};

/**
 * Helper function to get user ID for API calls
 * Handles both NextAuth and Firebase user IDs
 */
export const getUserIdForAPI = (user: UnifiedUser | null): string | null => {
  if (!user) return null;
  
  // For NextAuth users, use the session user ID
  if (user.isNextAuthUser) {
    return user.id;
  }
  
  // For Firebase users, use the Firebase UID
  if (user.isFirebaseUser) {
    return user.firebaseUid || user.id;
  }
  
  return user.id;
};

/**
 * Helper function to check if user is Firebase user
 */
export const isFirebaseUser = (user: UnifiedUser | null): boolean => {
  return user?.isFirebaseUser || false;
};

/**
 * Helper function to check if user is NextAuth user
 */
export const isNextAuthUser = (user: UnifiedUser | null): boolean => {
  return user?.isNextAuthUser || false;
};
