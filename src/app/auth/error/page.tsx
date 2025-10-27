'use client';

import React from 'react';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'Access was denied. You may have cancelled the sign-in process.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      case 'OAuthSignin':
        return 'Error occurred while trying to sign in with the OAuth provider.';
      case 'OAuthCallback':
        return 'Error occurred while handling the OAuth callback.';
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account. Please try again.';
      case 'EmailCreateAccount':
        return 'Could not create account with this email. Please try again.';
      case 'Callback':
        return 'Error occurred during the authentication callback.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account. Please sign in with your original account.';
      case 'EmailSignin':
        return 'Error occurred while trying to send the verification email.';
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your email and password.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      default:
        return 'An unexpected error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-4">
            Authentication Error
          </h1>

          {/* Error Message */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm text-center">
              {getErrorMessage(error)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/sign-in"
              className="w-full bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-lime-400/50 flex items-center justify-center gap-2"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-6 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
              <p className="text-xs text-gray-500 font-mono">Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}