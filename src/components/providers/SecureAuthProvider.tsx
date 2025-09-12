'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useSecureAuth, createAuthenticatedFetch } from '@/lib/hooks/useSecureAuth';

interface SecureAuthContextType {
  isAuthenticated: boolean;
  user: any;
  accessToken: string | null;
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const SecureAuthContext = createContext<SecureAuthContextType | undefined>(undefined);

export function SecureAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useSecureAuth();

  // Set up authenticated fetch interceptor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Replace global fetch with authenticated version
      const authenticatedFetch = createAuthenticatedFetch();
      // Store original fetch for restoration if needed
      (window as any).__originalFetch = window.fetch;
      window.fetch = authenticatedFetch;

      return () => {
        // Restore original fetch on cleanup
        if ((window as any).__originalFetch) {
          window.fetch = (window as any).__originalFetch;
        }
      };
    }
  }, []);

  return (
    <SecureAuthContext.Provider value={auth}>
      {children}
    </SecureAuthContext.Provider>
  );
}

export function useSecureAuthContext(): SecureAuthContextType {
  const context = useContext(SecureAuthContext);
  if (context === undefined) {
    throw new Error('useSecureAuthContext must be used within a SecureAuthProvider');
  }
  return context;
}

// HOC for protecting components
export function withSecureAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function SecureAuthComponent(props: P) {
    const { isAuthenticated, isLoading } = useSecureAuthContext();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to auth or show login form
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
