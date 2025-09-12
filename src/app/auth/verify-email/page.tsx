'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleResendVerification = async () => {
    if (!email) return;
    
    setStatus('loading');
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          firstName: 'User',
          useCustomEmail: true 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus('pending');
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to send verification email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to send verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gray-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-16 h-16 mb-6"
          >
            {status === 'loading' && (
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            )}
            {status === 'pending' && (
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-yellow-400" />
              </div>
            )}
          </motion.div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'pending' && 'Check Your Email'}
          </h1>

          {/* Message */}
          <p className="text-gray-300 mb-6">
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email has been successfully verified. You can now sign in to your account.'}
            {status === 'error' && message}
            {status === 'pending' && `We've sent a verification email to ${email}. Please check your inbox and click the verification link.`}
          </p>

          {/* Email Display */}
          {email && (
            <div className="bg-gray-700/50 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-400">Verification sent to:</p>
              <p className="text-white font-medium">{email}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {status === 'success' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Sign In to Your Account
              </motion.button>
            )}

            {(status === 'error' || status === 'pending') && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={handleResendVerification}
                disabled={status === 'loading'}
                className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </div>
                ) : (
                  'Resend Verification Email'
                )}
              </motion.button>
            )}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => router.push('/')}
              className="w-full text-gray-400 py-2 px-6 rounded-lg font-medium hover:text-white transition-colors duration-200"
            >
              Back to Home
            </motion.button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-xs text-gray-500">
            <p>Didn't receive the email? Check your spam folder or try resending.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
            <p className="text-gray-300">Please wait while we load the verification page...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
