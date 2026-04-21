'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import PrivacyPolicyDialog from '@/components/ui/PrivacyPolicyDialog';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  onRegister?: (userData: any) => void;
  cvData?: any;
  selectedRole?: 'student' | 'professional' | 'recruiter';
}

export default function RegistrationModal({ isOpen, onClose, onSwitchToLogin, onRegister, cvData, selectedRole }: RegistrationModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const router = useRouter();

  // OAuth providers are configured server-side via NextAuth
  // We assume Google and Apple are available if NextAuth is configured
  const hasGoogle = true; // NextAuth Google provider is configured server-side
  const hasApple = true; // NextAuth Apple provider is configured server-side

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handlePrivacyPolicyAccept = () => {
    setShowPrivacyPolicy(false);
    // Continue with registration after privacy policy acceptance
    handleRegistration();
  };

  const handlePrivacyPolicyDecline = () => {
    setShowPrivacyPolicy(false);
    setError('You must accept our Privacy Policy and Terms of Service to continue.');
  };

  const handleRegistration = async () => {
    setIsLoading(true);
    setError('');

    // If this is the onboarding flow, use the onRegister callback
    if (onRegister) {
      try {
        const userData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: selectedRole || 'user' // Use selected role or default to 'user'
        };
        
        await onRegister(userData);
      } catch (error: any) {
        setError(error.message || 'Registration failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular registration flow
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setRegistrationSuccess(true);
        setTimeout(() => {
          onClose();
          const urlParams = new URLSearchParams(window.location.search);
          const callbackUrl = urlParams.get('callbackUrl') || '/dashboard';
          window.location.href = callbackUrl;
        }, 2000);
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Comprehensive password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/(?=.*[a-z])/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    if (!/(?=.*[A-Z])/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one number');
      return;
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
      setError('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
      return;
    }

    // Show privacy policy dialog before proceeding with registration
    setShowPrivacyPolicy(true);
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError('');

    try {
      // Use NextAuth signIn for OAuth providers
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl') || '/dashboard';
      
      const result = await signIn(provider, {
        callbackUrl,
        redirect: false
      });

      if (result?.error) {
        setError(`Failed to sign in with ${provider}. Please try again.`);
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Sign in successful, close modal and redirect
        onClose();
        // NextAuth will handle the redirect via callbackUrl
        window.location.href = callbackUrl;
      }
    } catch (error: any) {
      setError(error.message || `Failed to sign in with ${provider}. Please try again.`);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setError('');
      setRegistrationSuccess(false);
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
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-none p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Close Button */}
            <motion.button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors z-10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isLoading}
            >
              <X size={20} />
            </motion.button>

            {/* Success State */}
            <AnimatePresence>
              {registrationSuccess ? (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <motion.div
                    className="w-16 h-16 mx-auto rounded-none bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <CheckCircle size={32} className="text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to CVCircle!</h2>
                    <p className="text-white/60">Account created successfully. Redirecting to dashboard...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                    <p className="text-white/60">Join CVCircle and build your professional profile</p>
                  </div>

                  {/* OAuth Buttons - Show Google sign-in if Firebase is configured */}
                  {(hasGoogle || hasApple) && (
                    <>
                      <div className="space-y-3 mb-6">
                        {/* Firebase Google Auth (Primary) */}
                        {hasGoogle && (
                          <motion.button
                            onClick={() => handleOAuthSignIn('google')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
                        {hasGoogle && (
                          <motion.button
                            onClick={() => handleOAuthSignIn('google')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-white/10 border border-white/20 rounded-none text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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

                        {hasApple && (
                          <motion.button
                            onClick={() => handleOAuthSignIn('apple')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-black border border-white/20 rounded-none text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
                          <span className="px-2 bg-gray-900 text-white/60">Or sign up with email</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Show message if no OAuth providers are configured */}
                  {!hasGoogle && !hasApple && (
                    <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-none">
                      <p className="text-yellow-400 text-sm text-center">
                        🔧 OAuth providers not configured. Please set up Firebase or NextAuth credentials.
                      </p>
                    </div>
                  )}

                  {/* Registration Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <motion.div
                        className="p-4 bg-red-400/10 border border-red-400/20 rounded-none flex items-center gap-3 text-red-400"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AlertCircle size={20} />
                        <span className="text-sm">{error}</span>
                      </motion.div>
                    )}

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10" size={20} />
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[0_0_0_30px_rgba(255,255,255,0.1)_inset] [&:-webkit-autofill]:border-lime-400/50"
                            placeholder="First name"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Last Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10" size={20} />
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[0_0_0_30px_rgba(255,255,255,0.1)_inset] [&:-webkit-autofill]:border-lime-400/50"
                            placeholder="Last name"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10" size={20} />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[0_0_0_30px_rgba(255,255,255,0.1)_inset] [&:-webkit-autofill]:border-lime-400/50"
                          placeholder="Enter your email"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10" size={20} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[0_0_0_30px_rgba(255,255,255,0.1)_inset] [&:-webkit-autofill]:border-lime-400/50"
                          placeholder="Create a password"
                          disabled={isLoading}
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </motion.button>
                      </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10" size={20} />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-none text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[0_0_0_30px_rgba(255,255,255,0.1)_inset] [&:-webkit-autofill]:border-lime-400/50"
                          placeholder="Confirm your password"
                          disabled={isLoading}
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </motion.button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold py-3 rounded-none hover:from-lime-300 hover:to-lime-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <motion.div
                            className="w-5 h-5 border-2 border-black border-t-transparent rounded-none"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>Creating Account...</span>
                        </div>
                      ) : (
                        'Create Account'
                      )}
                    </motion.button>
                  </form>

                  {/* Switch to Login - Only show if onSwitchToLogin is provided */}
                  {onSwitchToLogin && (
                    <div className="mt-8 text-center">
                      <p className="text-white/60 text-sm">
                        Already have an account?{' '}
                        <motion.button
                          onClick={onSwitchToLogin}
                          className="text-lime-400 hover:text-lime-300 font-medium transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Sign in
                        </motion.button>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* Privacy Policy Dialog */}
      <PrivacyPolicyDialog
        isOpen={showPrivacyPolicy}
        onAccept={handlePrivacyPolicyAccept}
        onDecline={handlePrivacyPolicyDecline}
      />
    </AnimatePresence>
  );
} 