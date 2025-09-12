'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, User, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useFirebaseAuth } from '@/lib/hooks/useFirebaseAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLogin?: (userData: any) => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signInWithGoogle: firebaseSignInWithGoogle } = useFirebaseAuth();

  // Check if OAuth providers are available
  // For Firebase Google Auth, we check for Firebase config
  const hasFirebaseGoogle = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  // For NextAuth Google Auth, we check for NextAuth credentials (server-side only)
  const hasNextAuthGoogle = false; // NextAuth credentials are server-side only
  const hasAppleCredentials = false; // Apple credentials are server-side only

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Sign in with Firebase first
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check email verification
      if (!user.emailVerified) {
        setError('Please verify your email before signing in. Check your inbox for a verification email.');
        return;
      }

      // Get Firebase ID token and sign in with NextAuth
      const idToken = await user.getIdToken();
      const result = await signIn('firebase', { 
        idToken, 
        redirect: false 
      });

      if (result?.error) {
        setError('Authentication failed. Please try again.');
      } else if (result?.ok) {
        // Get the session to access user data
        const session = await getSession();
        if (session?.user) {
          // Check if user has CVs before deciding where to route
          try {
            console.log('🔍 Checking CVs for NextAuth user:', session.user.id);
            const response = await fetch(`/api/cvs?userId=${session.user.id}`);
            const result = await response.json();
            console.log('🔍 CV check result:', result);
            
            if (result.success && result.data.cvs && result.data.cvs.length > 0) {
              // Check if user has any master CVs
              const hasMasterCV = result.data.cvs.some((cv: any) => cv.isMaster === true);
              
              if (hasMasterCV) {
                // User has master CV, redirect to dashboard
                console.log('✅ User has master CV, redirecting to dashboard');
                onClose();
                window.location.href = '/dashboard';
              } else {
                // User has CVs but no master CV, redirect to universal onboarding
                console.log('🆕 User has CVs but no master CV, redirecting to universal onboarding');
                onClose();
                window.location.href = '/onboarding-universal';
              }
            } else {
              // New user, redirect to universal onboarding
              console.log('🆕 New user, redirecting to universal onboarding');
              onClose();
              window.location.href = '/onboarding-universal';
            }
          } catch (error) {
            console.log('Error checking CVs, assuming new user:', error);
            // If we can't check CVs, assume new user and redirect to universal onboarding
            onClose();
            window.location.href = '/onboarding-universal';
          }
        } else {
          setError('Failed to establish session. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later');
      } else {
        setError(error.message || 'Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError('');

    if (provider === 'google') {
      // Use Firebase for Google authentication
      try {
        console.log('🚀 Starting Google sign-in process...');
        const user = await firebaseSignInWithGoogle();
        console.log('✅ Firebase authentication successful:', user);
        
        // Get Firebase ID token and sign in with NextAuth
        const idToken = await user.getIdToken();
        const result = await signIn('firebase', { 
          idToken, 
          redirect: false 
        });

        if (result?.error) {
          setError('Authentication failed. Please try again.');
        } else if (result?.ok) {
          // Get the session to access user data
          const session = await getSession();
          if (session?.user) {
            // Check if user has CVs before deciding where to route
            try {
              console.log('🔍 Checking CVs for NextAuth user:', session.user.id);
              const response = await fetch(`/api/cvs?userId=${session.user.id}`);
              const result = await response.json();
              console.log('🔍 CV check result:', result);
              
              if (result.success && result.data.cvs && result.data.cvs.length > 0) {
                // Check if user has any master CVs
                const hasMasterCV = result.data.cvs.some((cv: any) => cv.isMaster === true);
                
                if (hasMasterCV) {
                  // User has master CV, redirect to dashboard
                  console.log('✅ User has master CV, redirecting to dashboard');
                  onClose();
                  window.location.href = '/dashboard';
                } else {
                  // User has CVs but no master CV, redirect to universal onboarding
                  console.log('🆕 User has CVs but no master CV, redirecting to universal onboarding');
                  onClose();
                  window.location.href = '/onboarding-universal';
                }
              } else {
                // New user, redirect to universal onboarding
                console.log('🆕 New user, redirecting to universal onboarding');
                onClose();
                window.location.href = '/onboarding-universal';
              }
            } catch (error) {
              console.log('Error checking CVs, assuming new user:', error);
              // If we can't check CVs, assume new user and redirect to universal onboarding
              onClose();
              window.location.href = '/onboarding-universal';
            }
          } else {
            setError('Failed to establish session. Please try again.');
          }
        }
      } catch (error: any) {
        console.error('Google sign in error:', error);
        setError(error.message || 'Failed to sign in with Google. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Use NextAuth for Apple authentication
      try {
        const result = await signIn(provider, {
          redirect: false,
          callbackUrl: '/dashboard'
        });
        
        if (result?.ok) {
          // Get the session to access user data
          const session = await getSession();
          if (session?.user) {
            // Check if user has CVs before deciding where to route
            try {
              console.log('🔍 Checking CVs for NextAuth OAuth user:', session.user.id);
              const response = await fetch(`/api/cvs?userId=${session.user.id}`);
              const result = await response.json();
              console.log('🔍 CV check result:', result);
              
              if (result.success && result.data.cvs && result.data.cvs.length > 0) {
                // User has CVs, redirect to dashboard
                console.log('✅ User has CVs, redirecting to dashboard');
                onClose();
                window.location.href = '/dashboard';
              } else {
                // User exists but no CVs - still redirect to dashboard (they can create CVs there)
                console.log('🔄 Existing user with no CVs, redirecting to dashboard');
                onClose();
                window.location.href = '/dashboard';
              }
            } catch (error) {
              console.log('Error checking CVs, redirecting to dashboard:', error);
              // If we can't check CVs, redirect to dashboard (safer default)
              onClose();
              window.location.href = '/dashboard';
            }
          }
        } else if (result?.error) {
          setError(`Failed to sign in with ${provider}. Please try again.`);
        }
      } catch (error) {
        setError(`Failed to sign in with ${provider}. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    }
  };



  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setEmail('');
      setPassword('');
      setError('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ willChange: 'opacity' }}
          />

          {/* Modal - Fixed width and design */}
          <motion.div
            className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ position: 'relative', willChange: 'transform, opacity' }}
          >
            {/* Close Button */}
            <motion.button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 z-10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isLoading}
            >
              <X size={20} />
            </motion.button>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-lg flex items-center justify-center">
                  <User size={16} className="text-black" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Welcome Back
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* OAuth Buttons - Show Google sign-in if Firebase is configured */}
              {(hasFirebaseGoogle || hasNextAuthGoogle || hasAppleCredentials) && (
                <>
                  <div className="space-y-3 mb-6">
                    {/* Firebase Google Auth (Primary) */}
                    {hasFirebaseGoogle && (
                      <motion.button
                        onClick={() => handleOAuthSignIn('google')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        whileHover={{ scale: isLoading ? 1 : 1.02 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </motion.button>
                    )}

                    {/* NextAuth Google Auth (Fallback) */}
                    {!hasFirebaseGoogle && hasNextAuthGoogle && (
                      <motion.button
                        onClick={() => handleOAuthSignIn('google')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        whileHover={{ scale: isLoading ? 1 : 1.02 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </motion.button>
                    )}

                    {hasAppleCredentials && (
                      <motion.button
                        onClick={() => handleOAuthSignIn('apple')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-3 bg-black border border-white/20 rounded-lg text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        whileHover={{ scale: isLoading ? 1 : 1.02 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        Continue with Apple
                      </motion.button>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-900 text-white/60">Or sign in with email</span>
                    </div>
                  </div>
                </>
              )}

              {/* Show message if no OAuth providers are configured */}
              {!hasFirebaseGoogle && !hasNextAuthGoogle && !hasAppleCredentials && (
                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm text-center">
                    🔧 OAuth providers not configured. Please set up Firebase or NextAuth credentials.
                  </p>
                </div>
              )}

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </motion.div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      required
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.button>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Switch to Register */}
              <div className="mt-6 text-center">
                <p className="text-white/60 text-sm">
                  Don't have an account?{' '}
                  <motion.a
                    href="/onboarding"
                    className="text-lime-400 hover:text-lime-300 font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Signup
                  </motion.a>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 