'use client';

import { useState } from 'react';

export default function TestClerkPage() {
  const [status, setStatus] = useState('Checking Clerk setup...');

  const checkClerkSetup = () => {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!publishableKey || publishableKey.includes('your-clerk')) {
      setStatus('❌ Clerk API keys not configured. Please add your real Clerk keys to .env.local');
      return;
    }

    if (!secretKey || secretKey.includes('your-clerk')) {
      setStatus('❌ Clerk secret key not configured. Please add your real Clerk secret key to .env.local');
      return;
    }

    setStatus('✅ Clerk API keys are configured! Ready to test authentication.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Clerk Setup Test</h1>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">Current Status:</p>
          <p className="text-sm font-mono bg-gray-100 p-2 rounded">{status}</p>
        </div>

        <button
          onClick={checkClerkSetup}
          className="w-full bg-lime-500 text-white py-2 px-4 rounded hover:bg-lime-600 transition-colors"
        >
          Check Clerk Configuration
        </button>

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Get your Clerk API keys from clerk.com</li>
            <li>Update .env.local with real keys</li>
            <li>Restart the development server</li>
            <li>Test sign-up and sign-in</li>
          </ol>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-blue-800 text-sm">
            <strong>Need help?</strong> Check the CLERK_SETUP_GUIDE.md file for detailed instructions.
          </p>
        </div>
      </div>
    </div>
  );
}
