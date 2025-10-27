'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
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
  cooldownSeconds = 0
}: CodeVerificationScreenProps) {
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [canResend, setCanResend] = useState(cooldownSeconds === 0);

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

  return (
    <div className="text-center">
      {/* Email Icon with Animation */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-[#88E03F]">
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
      <h3 className="text-3xl font-bold text-white mb-6">
        Check your email
      </h3>
      
      {/* Instructions */}
      <p className="text-gray-300 text-lg mb-2">
        We've sent a 4-digit verification code to your email address.
      </p>
      <p className="text-gray-300 text-lg mb-8">
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

      {/* Attempt Counter */}
      {remainingAttempts < 5 && (
        <div className="mb-4">
          <p className="text-yellow-400 text-sm">
            {remainingAttempts} attempts remaining
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        </motion.div>
      )}

      {/* Resend Link */}
      <div className="mt-8">
        <p className="text-gray-300 text-sm">
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
