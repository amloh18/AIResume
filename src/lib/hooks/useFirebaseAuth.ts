// Stub implementation for useFirebaseAuth hook
// Firebase authentication has been removed from the application

export const useFirebaseAuth = () => {
  const signInWithGoogle = async () => {
    throw new Error('Firebase authentication is not available. Please use NextAuth providers.');
  };

  return {
    signInWithGoogle,
  };
};
