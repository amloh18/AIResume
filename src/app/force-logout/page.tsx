'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

export default function ForceLogoutPage() {
  const [status, setStatus] = useState<string[]>(['Starting forced logout...']);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, message]);
    console.log(message);
  };

  useEffect(() => {
    const forceLogout = async () => {
      try {
        // Step 1: Sign out from NextAuth with redirect disabled
        addStatus('Step 1: Signing out from NextAuth...');
        try {
          await signOut({ redirect: false });
          addStatus('✅ NextAuth signout completed');
        } catch (error) {
          addStatus('⚠️ NextAuth signout error (continuing): ' + error);
        }

        // Step 2: Clear all localStorage
        addStatus('Step 2: Clearing localStorage...');
        try {
          localStorage.clear();
          addStatus('✅ localStorage cleared');
        } catch (error) {
          addStatus('⚠️ localStorage clear error: ' + error);
        }

        // Step 3: Clear all sessionStorage
        addStatus('Step 3: Clearing sessionStorage...');
        try {
          sessionStorage.clear();
          addStatus('✅ sessionStorage cleared');
        } catch (error) {
          addStatus('⚠️ sessionStorage clear error: ' + error);
        }

        // Step 4: Clear all cookies manually
        addStatus('Step 4: Clearing all cookies...');
        try {
          const cookies = document.cookie.split(';');
          addStatus(`Found ${cookies.length} cookies to clear`);
          
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            
            // Clear with multiple configurations to ensure deletion
            const domains = [window.location.hostname, `.${window.location.hostname}`, '', undefined];
            const paths = ['/', '', undefined];
            const sameSites = ['strict', 'lax', 'none', undefined];
            
            for (const domain of domains) {
              for (const path of paths) {
                for (const sameSite of sameSites) {
                  try {
                    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; max-age=0`;
                    if (path) cookieString += `; path=${path}`;
                    if (domain) cookieString += `; domain=${domain}`;
                    if (sameSite) cookieString += `; samesite=${sameSite}`;
                    document.cookie = cookieString;
                  } catch (e) {
                    // Ignore errors for invalid combinations
                  }
                }
              }
            }
            addStatus(`  Cleared: ${name}`);
          }
          addStatus('✅ All cookies cleared');
        } catch (error) {
          addStatus('⚠️ Cookie clear error: ' + error);
        }

        // Step 5: Call logout API
        addStatus('Step 5: Calling logout API...');
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          addStatus('✅ Logout API called');
        } catch (error) {
          addStatus('⚠️ Logout API error (continuing): ' + error);
        }

        // Step 6: Wait a moment for everything to clear
        addStatus('Step 6: Waiting for cleanup...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 7: Redirect to home
        addStatus('✅ LOGOUT COMPLETE! Redirecting to home page...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force a hard navigation to clear any cached state
        window.location.href = '/';
        
      } catch (error) {
        addStatus('❌ Critical error: ' + error);
        // Still try to redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    forceLogout();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-red-500/20 rounded-full mb-4">
            <svg
              className="w-16 h-16 text-red-400 animate-pulse"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Force Logout</h1>
          <p className="text-white/60">Clearing all session data...</p>
        </div>

        <div className="bg-black/40 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
          <div className="space-y-2 font-mono text-sm">
            {status.map((message, index) => (
              <div
                key={index}
                className={`${
                  message.startsWith('✅')
                    ? 'text-green-400'
                    : message.startsWith('⚠️')
                    ? 'text-yellow-400'
                    : message.startsWith('❌')
                    ? 'text-red-400'
                    : 'text-white/80'
                }`}
              >
                {message}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-white/40 text-sm">
          <p>Do not close this window...</p>
          <p className="mt-2">You will be redirected automatically</p>
        </div>
      </div>
    </div>
  );
}

