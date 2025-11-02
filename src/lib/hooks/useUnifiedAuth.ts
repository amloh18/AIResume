'use client';

import { useSession, signOut } from 'next-auth/react';
import { useMemo } from 'react';

interface UnifiedUser {
  id: string;
  email: string;
  name: string;
  username?: string;
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
 * Unified authentication hook that uses NextAuth for authentication
 * Provides a consistent interface across all dashboard pages
 */
export const useUnifiedAuth = (): UseUnifiedAuthReturn => {
  const { data: session, status: nextAuthStatus } = useSession();

  // Determine loading state
  const loading = nextAuthStatus === 'loading';

  // Create unified user object
  const user = useMemo((): UnifiedUser | null => {
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

    return null;
  }, [session]);

  // Determine authentication status
  const isAuthenticated = !!session?.user;
  // Use unified user id (falls back to email) so it's never null post-login
  const userId = user?.id || null;

  // Error handling
  const error = null; // Add error handling if needed

  // Sign out function
  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Google sign-in function (placeholder - implement based on your needs)
  const signInWithGoogle = async () => {
    // This would typically redirect to Google OAuth
    // Implementation depends on your specific needs
    throw new Error('Google sign-in should be handled through NextAuth providers');
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    userId,
    signInWithGoogle,
    signOut: handleSignOut
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
