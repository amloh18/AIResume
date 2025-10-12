'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useConsoleLoggerContext } from '@/contexts/ConsoleLoggerProvider';
import InlineMessages from '@/components/auth/InlineMessages';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { messages, clearMessages } = useConsoleLoggerContext();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetCode, setResetCode] = useState('');

  useEffect(() => {
    // Check if we have a reset token in the URL
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    if (token && email) {
      setResetCode(token);
      setEmail(email);
      setStep('reset');
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Password reset request form submitted');
    setIsLoading(true);
    setError('');
    setMessage('');

    console.log('📤 Sending forgot password request for:', email);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (data.success && data.message) {
        setMessage(data.message);
      } else {
        setError(data.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Password reset form submitted');
    setIsLoading(true);
    setError('');
    setMessage('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    console.log('📤 Sending reset request:', { token: resetCode, email, passwordLength: newPassword.length });

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: resetCode, 
          email: email,
          password: newPassword 
        }),
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (data.message) {
        setMessage(data.message);
        setTimeout(() => {
          router.push('/sign-in');
        }, 2000);
      } else {
        setError(data.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRequestStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Reset Your Password</h3>
        <p className="text-gray-400">Enter your email address and we'll send you a password reset link</p>
      </div>

      <form onSubmit={handleRequestReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
              placeholder="john@example.com"
              required
            />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
          >
            <CheckCircle size={16} />
            {message}
          </motion.div>
        )}

        {/* Inline Messages from Console Logs */}
        <InlineMessages 
          messages={messages} 
          onClear={clearMessages}
          className="mt-4"
        />

        <motion.button
          type="button"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRequestReset}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </motion.button>
      </form>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-gray-500 text-sm">
          Remember your password?{' '}
          <Link href="/sign-in" className="text-lime-400 hover:text-lime-300 transition-colors duration-200 font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </motion.div>
  );

  const renderResetStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Set New Password</h3>
        <p className="text-gray-400">Enter your new password below</p>
      </div>

      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:border-lime-400 focus:ring-lime-400 focus:ring-2 transition-all duration-200 rounded-lg"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
          >
            <CheckCircle size={16} />
            {message}
          </motion.div>
        )}

        {/* Inline Messages from Console Logs */}
        <InlineMessages 
          messages={messages} 
          onClear={clearMessages}
          className="mt-4"
        />

        <motion.button
          type="button"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePasswordReset}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </motion.button>
      </form>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-gray-500 text-sm">
          Remember your password?{' '}
          <Link href="/sign-in" className="text-lime-400 hover:text-lime-300 transition-colors duration-200 font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex">
      {/* Left Side - Full Height Image (50%) */}
      <div className="w-1/2 p-4">
        {/* Full Height Image with Padding */}
        <div className="relative h-full rounded-2xl overflow-hidden bg-gradient-to-br from-lime-400/20 to-lime-500/20">
          <img 
            src="/images/Login/signin.png" 
            alt="Reset Password Interface"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Simple fallback - just hide the image
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Text Overlay */}
          <div className="absolute inset-0 flex flex-col justify-start pt-20 px-12 lg:px-16 xl:px-20">
            <div className="relative z-10">
              {/* Main Heading */}
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Reset Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
                  Password
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-xl text-gray-300 leading-relaxed">
                {step === 'request' 
                  ? "Enter your email address and we'll send you a secure link to reset your password."
                  : "Create a new secure password for your account."
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Password Modal (50%) */}
      <div className="w-1/2 flex flex-col items-center justify-center px-8 lg:px-12 xl:px-16 relative">
        {/* CVCircle Logo - Top Right */}
        <div className="absolute top-8 right-8">
          <h1 className="text-3xl font-bold">
            <span className="text-lime-400">CV</span>
            <span className="text-white">Circle</span>
          </h1>
        </div>
        
        <div className="w-full max-w-md">
          {/* Reset Password Modal */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            {step === 'request' ? renderRequestStep() : renderResetStep()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
