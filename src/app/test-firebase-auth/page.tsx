'use client';

import React, { useState } from 'react';
import { testFirebaseAuth, testFirebaseConfig, testFirebaseToken } from '@/lib/firebase-auth-test';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const TestFirebaseAuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [results, setResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runConfigTest = async () => {
    const result = testFirebaseConfig();
    setResults(prev => ({ ...prev, config: result }));
  };

  const runAuthTest = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await testFirebaseAuth(email, password);
      setResults(prev => ({ ...prev, auth: result }));
    } finally {
      setIsLoading(false);
    }
  };

  const runTokenTest = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await testFirebaseToken(email, password);
      setResults(prev => ({ ...prev, token: result }));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Firebase Authentication Test
          </h1>

          {/* Test Credentials */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Credentials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="password"
                />
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Run Tests
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={runConfigTest}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Test Firebase Config
              </button>
              <button
                onClick={runAuthTest}
                disabled={isLoading || !email || !password}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Test Authentication
              </button>
              <button
                onClick={runTokenTest}
                disabled={isLoading || !email || !password}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Test ID Token
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Results
            </h2>

            {/* Config Test Results */}
            {results.config && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(results.config.success)}
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Firebase Configuration Test
                  </h3>
                </div>
                {results.config.success ? (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    ✅ Firebase configuration is valid
                  </p>
                ) : (
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    ❌ {results.config.error}
                  </p>
                )}
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.config.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Auth Test Results */}
            {results.auth && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(results.auth.success)}
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Firebase Authentication Test
                  </h3>
                </div>
                {results.auth.success ? (
                  <div>
                    <p className="text-green-600 dark:text-green-400 text-sm mb-2">
                      ✅ Authentication successful
                    </p>
                    {results.auth.user && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>User ID: {results.auth.user.uid}</p>
                        <p>Email: {results.auth.user.email}</p>
                        <p>Email Verified: {results.auth.user.emailVerified ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    ❌ {results.auth.error}
                  </p>
                )}
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.auth.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Token Test Results */}
            {results.token && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(results.token.success)}
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Firebase ID Token Test
                  </h3>
                </div>
                {results.token.success ? (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    ✅ ID token generated successfully
                  </p>
                ) : (
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    ❌ {results.token.error}
                  </p>
                )}
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.token.details, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Troubleshooting Tips */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Troubleshooting Tips
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Make sure you have a valid Firebase project configured</li>
              <li>• Check that Email/Password authentication is enabled in Firebase Console</li>
              <li>• Verify your environment variables are set correctly</li>
              <li>• Ensure the user account exists and email is verified</li>
              <li>• Check Firebase Console for any domain restrictions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestFirebaseAuthPage;
