'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Mail, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const email = searchParams.get('email') || session?.user?.email;

  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Redirect if user is already verified
  useEffect(() => {
    if (session?.user?.emailVerified) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('No email address found');
      setMessageType('error');
      return;
    }

    setIsResending(true);
    setMessage('');
    setMessageType('');

    try {
      // Send magic link for verification
      const response = await fetch('/api/auth/signin/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `email=${encodeURIComponent(email)}&csrfToken=${encodeURIComponent(await fetch('/api/auth/csrf').then(res => res.json()).then(data => data.csrfToken))}`,
      });

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox and click the magic link to verify your account.');
        setMessageType('success');
      } else {
        throw new Error('Failed to send verification email');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      setMessage('Failed to send verification email. Please try again.');
      setMessageType('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/sign-in');
  };

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        {/* CVCircle Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-lime-400">CV</span>
            <span className="text-white">Circle</span>
          </h1>
        </div>

        {/* Verification Modal */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-lime-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Verify Your Email</h3>
            <p className="text-gray-400">
              Please verify your email address to access your CV Circle dashboard
            </p>
          </div>

          {/* Email Display */}
          <div className="bg-white/10 border border-gray-600 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-lime-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-400">Email Address</p>
                <p className="text-white font-medium">{email}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">What you need to do:</h4>
            <ol className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-3">
                <span className="bg-lime-400/20 text-lime-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                Check your email inbox for a verification message
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-lime-400/20 text-lime-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                Click the "Sign In" button in the email to verify your account
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-lime-400/20 text-lime-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                You'll be automatically redirected to your dashboard
              </li>
            </ol>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-6 ${
              messageType === 'success' 
                ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            {/* Resend Verification Button */}
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </>
              )}
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full bg-white/10 hover:bg-white/20 border border-gray-600 hover:border-gray-500 text-white py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              Sign Out & Try Different Email
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-6 border-t border-gray-600">
            <p className="text-gray-500 text-sm">
              Didn't receive the email? Check your spam folder or{' '}
              <button 
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-lime-400 hover:text-lime-300 transition-colors underline"
              >
                resend verification email
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}