'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const FirebaseDebugInfo: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setDebugInfo({
        currentUser: user ? {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          photoURL: user.photoURL,
          providerData: user.providerData.map(provider => ({
            providerId: provider.providerId,
            uid: provider.uid,
            email: provider.email
          }))
        } : null,
        authDomain: auth.app.options.authDomain,
        apiKey: auth.app.options.apiKey ? 'Set' : 'Not Set',
        projectId: auth.app.options.projectId,
        timestamp: new Date().toISOString()
      });
    });

    return () => unsubscribe();
  }, []);

  const testFirebaseConnection = async () => {
    try {
      // Test Firebase connection by trying to get current user
      const user = auth.currentUser;
      console.log('Firebase connection test:', {
        connected: true,
        currentUser: user ? 'Logged in' : 'Not logged in',
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId
      });
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      return false;
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
        title="Show Firebase Debug Info"
      >
        <Info className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Firebase Debug Info
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Auth Domain:</span>
          <span className="text-gray-900 dark:text-white">{debugInfo.authDomain}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Project ID:</span>
          <span className="text-gray-900 dark:text-white">{debugInfo.projectId}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {debugInfo.apiKey === 'Set' ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-500" />
          )}
          <span className="text-gray-600 dark:text-gray-400">API Key:</span>
          <span className="text-gray-900 dark:text-white">{debugInfo.apiKey}</span>
        </div>

        <div className="flex items-center gap-2">
          {debugInfo.currentUser ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <AlertCircle className="h-3 w-3 text-yellow-500" />
          )}
          <span className="text-gray-600 dark:text-gray-400">User Status:</span>
          <span className="text-gray-900 dark:text-white">
            {debugInfo.currentUser ? 'Logged In' : 'Not Logged In'}
          </span>
        </div>

        {debugInfo.currentUser && (
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-gray-600 dark:text-gray-400 mb-1">Current User:</div>
            <div className="text-gray-900 dark:text-white">
              <div>Email: {debugInfo.currentUser.email}</div>
              <div>Verified: {debugInfo.currentUser.emailVerified ? 'Yes' : 'No'}</div>
              <div>UID: {debugInfo.currentUser.uid}</div>
            </div>
          </div>
        )}

        <button
          onClick={testFirebaseConnection}
          className="w-full mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
        >
          Test Connection
        </button>
      </div>
    </div>
  );
};

export default FirebaseDebugInfo;
