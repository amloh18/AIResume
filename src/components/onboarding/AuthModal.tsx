'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, User, ArrowRight } from 'lucide-react';
import { useFirebaseAuth } from '@/lib/hooks/useFirebaseAuth';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  selectedRole?: string;
  onSwitchToLogin?: () => void;
}

export default function SignupModal({ isOpen, onClose, onSuccess, selectedRole, onSwitchToLogin }: SignupModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithGoogle: firebaseSignInWithGoogle } = useFirebaseAuth();
  
  // Registration form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Comprehensive password validation
    if (registerData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    if (!/(?=.*[a-z])/.test(registerData.password)) {
      setError('Password must contain at least one lowercase letter');
      setIsLoading(false);
      return;
    }
    if (!/(?=.*[A-Z])/.test(registerData.password)) {
      setError('Password must contain at least one uppercase letter');
      setIsLoading(false);
      return;
    }
    if (!/(?=.*\d)/.test(registerData.password)) {
      setError('Password must contain at least one number');
      setIsLoading(false);
      return;
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(registerData.password)) {
      setError('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          role: selectedRole || 'user'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const userData = {
          id: result.data.user._id,
          email: result.data.user.email,
          name: `${result.data.user.firstName} ${result.data.user.lastName}`,
          firstName: result.data.user.firstName,
          lastName: result.data.user.lastName
        };
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Check if user has CVs before deciding where to route
        try {
          console.log('🔍 Checking CVs for manual signup user:', userData.id);
          const response = await fetch(`/api/cvs?userId=${userData.id}`);
          const result = await response.json();
          console.log('🔍 CV check result:', result);
          
          if (result.success && result.data.cvs && result.data.cvs.length > 0) {
            // User has CVs, redirect to dashboard
            console.log('✅ User has CVs, redirecting to dashboard');
            window.location.href = '/dashboard';
          } else {
            // New user, continue with onboarding
            console.log('🆕 New user, continuing with onboarding');
            onSuccess(userData);
          }
        } catch (error) {
          console.log('Error checking CVs, continuing with onboarding:', error);
          // If we can't check CVs, continue with onboarding
          onSuccess(userData);
        }
      } else {
        const errorResult = await response.json();
        if (response.status === 409) {
          setError('Email already exists. Please use a different email or try logging in.');
        } else {
          setError(errorResult.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setError('');
      setRegisterData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-lg flex items-center justify-center">
                  <User size={16} className="text-black" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Create Account
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}

              {/* Google Sign In Button - Quick signup option */}
              <div className="mb-6">
                <motion.button
                  onClick={async () => {
                    setIsLoading(true);
                    setError('');
                    try {
                      const user = await firebaseSignInWithGoogle();
                      
                      // The useFirebaseAuth hook already handles localStorage storage
                      const userData = localStorage.getItem('user');
                      if (userData) {
                        const parsedUser = JSON.parse(userData);
                        
                        // Check if user has CVs before deciding where to route
                        try {
                          console.log('🔍 Checking CVs for signup user:', parsedUser.id);
                          const response = await fetch(`/api/cvs?userId=${parsedUser.id}`);
                          const result = await response.json();
                          console.log('🔍 CV check result:', result);
                          
                          if (result.success && result.data.cvs && result.data.cvs.length > 0) {
                            // User has CVs, redirect to dashboard
                            console.log('✅ User has CVs, redirecting to dashboard');
                            window.location.href = '/dashboard';
                          } else {
                            // New user, continue with onboarding
                            console.log('🆕 New user, continuing with onboarding');
                            onSuccess(parsedUser);
                          }
                        } catch (error) {
                          console.log('Error checking CVs, continuing with onboarding:', error);
                          // If we can't check CVs, continue with onboarding
                          onSuccess(parsedUser);
                        }
                      } else {
                        console.log('No user data in localStorage, continuing with onboarding');
                        onSuccess({
                          id: user.uid,
                          email: user.email,
                          name: user.displayName || user.email,
                          firstName: user.displayName?.split(' ')[0] || 'User',
                          lastName: user.displayName?.split(' ').slice(1).join(' ') || ''
                        });
                      }
                    } catch (error: any) {
                      setError(error.message || 'Failed to sign in with Google. Please try again.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-white/60">Or create account with email</span>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/80 text-xs font-medium mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to Login */}
              <div className="mt-6 text-center">
                <p className="text-white/60 text-sm">
                  Already have an account?{' '}
                  <motion.button
                    onClick={() => {
                      if (onSwitchToLogin && typeof onSwitchToLogin === 'function') {
                        onSwitchToLogin();
                      } else {
                        onClose();
                      }
                    }}
                    className="text-lime-400 hover:text-lime-300 font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign in
                  </motion.button>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
