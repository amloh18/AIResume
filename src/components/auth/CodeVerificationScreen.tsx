'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import CodeInput from './CodeInput';

interface CodeVerificationScreenProps {
  email: string;
  type: 'email-verification' | 'passwordless-login' | 'password-reset';
  onCodeVerified: (code: string) => void;
  onResendCode: () => void;
  isLoading?: boolean;
  error?: string;
  success?: string;
  remainingAttempts?: number;
  cooldownSeconds?: number;
  onBack?: () => void;
}

export default function CodeVerificationScreen({
  email,
  type,
  onCodeVerified,
  onResendCode,
  isLoading = false,
  error,
  success,
  remainingAttempts = 5,
  cooldownSeconds = 0,
  onBack
}: CodeVerificationScreenProps) {
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [canResend, setCanResend] = useState(cooldownSeconds === 0);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  // Set session expiry (10 minutes from now) for display purposes
  useEffect(() => {
    if (!sessionExpiry) {
      setSessionExpiry(new Date(Date.now() + 10 * 60 * 1000));
    }
  }, []);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleCodeComplete = (completedCode: string) => {
    if (completedCode.length === 4) {
      onCodeVerified(completedCode);
    }
  };

  const handleResend = () => {
    if (canResend && !isLoading) {
      onResendCode();
      setCooldown(60); // 60 seconds cooldown
      setCanResend(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'email-verification':
        return 'Verify Your Email';
      case 'passwordless-login':
        return 'Sign In with Code';
      case 'password-reset':
        return 'Reset Your Password';
      default:
        return 'Verify Your Code';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'email-verification':
        return 'We\'ve sent a verification code to your email address.';
      case 'passwordless-login':
        return 'We\'ve sent a sign-in code to your email address.';
      case 'password-reset':
        return 'We\'ve sent a password reset code to your email address.';
      default:
        return 'We\'ve sent a verification code to your email address.';
    }
  };

  const getErrorDisplay = () => {
    if (!error) return null;
    
    // Check if it's a max attempts error
    if (error.includes('Too many failed attempts')) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-none"
        >
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-small">
              Too many failed attempts. Please request a new code to continue.
            </p>
          </div>
        </motion.div>
      );
    }

    // Generic error display
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-none"
      >
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-400 text-small">{error}</p>
        </div>
      </motion.div>
    );
  };

  const getAttemptWarning = () => {
    if (remainingAttempts <= 0) return null;
    
    // Show warning on 3rd attempt (2 remaining) or fewer
    if (remainingAttempts <= 2) {
      return (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-none">
          <p className="text-yellow-400 text-small text-center">
            Multiple failed attempts will require a new code.
          </p>
        </div>
      );
    }
    
    return null;
  };

  const getExpiryTime = () => {
    if (!sessionExpiry) return null;
    const now = new Date();
    const diff = Math.max(0, Math.floor((sessionExpiry.getTime() - now.getTime()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    if (diff <= 0) {
      return (
        <p className="text-red-400 text-small text-center">
          Code has expired. Please request a new code.
        </p>
      );
    }
    
    return (
      <p className="text-gray-400 text-small text-center">
        Code expires in {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
    );
  };

  return (
    <div className="text-center">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 lg:left-8 flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-small font-medium hidden sm:inline">Back to Login</span>
        </button>
      )}

      {/* Email Icon with Animation */}
      <div className="flex justify-center mb-8 mt-16 lg:mt-0">
        <div className="w-20 h-20 rounded-none flex items-center justify-center border-2 border-[#88E03F]">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1], 
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Mail className="w-10 h-10 text-[#88E03F]" />
          </motion.div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-h1 font-bold text-gray-900 dark:text-white mb-6">
        Check your email
      </h3>
      
      {/* Email Display */}
      {email && (
        <p className="text-[#013f2e] text-body mb-4 font-medium">
          {email}
        </p>
      )}
      
      {/* Instructions */}
      <p className="text-gray-600 dark:text-gray-300 text-h3 mb-2">
        We've sent a 4-digit verification code to your email address.
      </p>
      <p className="text-gray-600 dark:text-gray-300 text-h3 mb-8">
        Please enter it below to continue.
      </p>

      {/* Code Input */}
      <div className="mb-6">
        <CodeInput
          value={code}
          onChange={handleCodeChange}
          onComplete={handleCodeComplete}
          disabled={isLoading}
          error={error}
          autoFocus={true}
        />
      </div>

      {/* Expiry Timer */}
      {getExpiryTime()}

      {/* Attempt Warning */}
      {getAttemptWarning()}

      {/* Error Message */}
      {getErrorDisplay()}

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-none"
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-green-400 text-small">{success}</p>
          </div>
        </motion.div>
      )}

      {/* Resend Link */}
      <div className="mt-8">
        <p className="text-gray-300 text-small">
          Didn't receive the code?{' '}
          <button
            onClick={handleResend}
            disabled={!canResend || isLoading}
            className={`
              font-medium transition-colors duration-200
              ${canResend && !isLoading
                ? 'text-[#88E03F] hover:text-[#88E03F]/80'
                : 'text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </p>
      </div>
    </div>
  );
}

