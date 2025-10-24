'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    setUserEmail(email);
    verifyEmail(token, email);
  }, [token, email]);

  const verifyEmail = async (token: string, email: string) => {
    try {
      // First, try to get the password from localStorage (stored during signup)
      const storedPassword = localStorage.getItem('temp_password');
      
      if (storedPassword) {
        // Try to verify and sign in automatically
        const response = await fetch('/api/auth/verify-and-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email, password: storedPassword }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully! Signing you in...');
          
          // Clear the temporary password
          localStorage.removeItem('temp_password');
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
          return;
        }
      }
      
      // Fallback to regular verification
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        // Redirect to sign-in page after 3 seconds
        setTimeout(() => {
          router.push('/sign-in?verified=true');
        }, 3000);
      } else {
        if (result.message.includes('expired')) {
          setStatus('expired');
          setMessage('This verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to verify email');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your email');
    }
  };

  const resendVerification = async () => {
    setStatus('loading');
    setMessage('Sending new verification email...');
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail,
          firstName: 'User', // We don't have this info here
          lastName: ''
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage('New verification email sent! Please check your inbox.');
      } else {
        setStatus('error');
        setMessage(result.message || 'Failed to resend verification email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to resend verification email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center">
              {status === 'loading' && (
                <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="w-16 h-16 text-green-400" />
              )}
              {(status === 'error' || status === 'expired') && (
                <XCircle className="w-16 h-16 text-red-400" />
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-4">
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {(status === 'error' || status === 'expired') && 'Verification Failed'}
            </h1>

            {/* Message */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              {message}
            </p>

            {/* Email Display */}
            {userEmail && (
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                  <Mail className="w-4 h-4" />
                  <span>{userEmail}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
              {status === 'success' && (
                <div className="text-sm text-gray-400">
                  Redirecting to sign-in page...
                </div>
              )}

              {(status === 'error' || status === 'expired') && (
                <div className="space-y-3">
                  <button
                    onClick={resendVerification}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Resend Verification Email
                  </button>
                  
                  <button
                    onClick={() => router.push('/sign-in')}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Go to Sign In
                  </button>
                </div>
              )}

              {status === 'loading' && (
                <div className="text-sm text-gray-400">
                  Please wait while we verify your email...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Having trouble? Contact our support team
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
              <p className="text-gray-300">Please wait while we load the verification page...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}