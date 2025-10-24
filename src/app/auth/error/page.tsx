'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link is invalid or has expired.';
      case 'OAuthSignin':
        return 'There was an error with the Google sign-in process. Please try again.';
      case 'OAuthCallback':
        return 'There was an error processing the Google sign-in callback.';
      case 'OAuthCreateAccount':
        return 'Could not create account with Google. Please try again.';
      case 'EmailCreateAccount':
        return 'Could not create account with this email.';
      case 'Callback':
        return 'There was an error with the authentication callback.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with a different account.';
      case 'EmailSignin':
        return 'Check your email for a sign-in link.';
      case 'CredentialsSignin':
        return 'Sign in failed. Check your credentials and try again.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      case 'Default':
        return 'An unexpected error occurred.';
      default:
        return 'An authentication error occurred.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getErrorMessage(error)}
          </p>
          {(error === 'Configuration' || error === 'OAuthSignin' || error === 'OAuthCallback') && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Possible solutions:</strong>
              </p>
              <ul className="mt-2 text-xs text-yellow-700 list-disc list-inside">
                <li>Check your Google OAuth configuration</li>
                <li>Verify your environment variables</li>
                <li>Ensure your redirect URIs are correct</li>
                <li>Try clearing your browser cache</li>
                <li>Make sure JavaScript is enabled</li>
                <li>Try using a different browser</li>
              </ul>
            </div>
          )}
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/sign-in"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}