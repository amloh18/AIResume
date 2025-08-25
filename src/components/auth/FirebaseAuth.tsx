'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFirebaseAuth } from '@/lib/hooks/useFirebaseAuth';
import { Chrome, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface FirebaseAuthProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  mode?: 'login' | 'signup' | 'both';
  className?: string;
}

const FirebaseAuth: React.FC<FirebaseAuthProps> = ({
  onSuccess,
  onError,
  mode = 'both',
  className = ''
}) => {
  const { user, loading, signInWithGoogle, error } = useFirebaseAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const user = await signInWithGoogle();
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (error: any) {
      if (onError) {
        onError(error.message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign In';
      case 'signup':
        return 'Sign Up';
      default:
        return 'Sign In / Sign Up';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login':
        return 'Welcome back! Sign in to your account';
      case 'signup':
        return 'Create your account to get started';
      default:
        return 'Sign in or create a new account';
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white mb-2"
          >
            {getTitle()}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/60 text-sm"
          >
            {getDescription()}
          </motion.p>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-lg flex items-center gap-3"
          >
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Success Display */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-400/10 border border-green-400/20 rounded-lg flex items-center gap-3"
          >
            <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-400 text-sm font-medium">Successfully signed in!</p>
              <p className="text-green-400/80 text-xs">{user.email}</p>
            </div>
          </motion.div>
        )}

        {/* Google Sign In Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={loading || isSigningIn}
          className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || isSigningIn ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Chrome size={20} />
          )}
          {loading || isSigningIn ? 'Signing in...' : 'Continue with Google'}
        </motion.button>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative my-8"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-white/40">or</span>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="text-white/40 text-xs">
            By continuing, you agree to our{' '}
            <a href="#" className="text-lime-400 hover:text-lime-300 transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-lime-400 hover:text-lime-300 transition-colors">
              Privacy Policy
            </a>
          </p>
        </motion.div>

        {/* User Info (if signed in) */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10"
          >
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="text-white font-medium">{user.displayName}</p>
                <p className="text-white/60 text-sm">{user.email}</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FirebaseAuth;
