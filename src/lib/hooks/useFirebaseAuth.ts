import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { signInWithGoogle, signOutUser, onAuthStateChange } from '@/lib/firebase';

interface UseFirebaseAuthReturn {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  error: string | null;
}

export const useFirebaseAuth = (): UseFirebaseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async (): Promise<User | null> => {
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await signInWithGoogle();
      
      // Get the ID token for backend verification
      const idToken = await firebaseUser.getIdToken();
      
      // Send to your backend API
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          }
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to authenticate with backend');
      }

      // Store user data in localStorage for compatibility with existing system
      localStorage.setItem('user', JSON.stringify(result.user));
      console.log('User data stored in localStorage:', result.user);
      console.log('User ID from backend:', result.user.id);
      console.log('User ID type:', typeof result.user.id);
      console.log('User ID string length:', result.user.id?.toString().length);
      
      return firebaseUser;
    } catch (error: any) {
      const errorMessage = error.code === 'auth/popup-closed-by-user' 
        ? 'Sign-in was cancelled'
        : error.message || 'An error occurred during sign-in';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      await signOutUser();
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign-out';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    error
  };
};
