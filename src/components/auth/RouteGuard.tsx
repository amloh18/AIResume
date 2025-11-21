'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  redirectTo = '/sign-in'
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Don't process if still loading
    if (status === 'loading') return;

    // Don't redirect multiple times
    if (hasRedirected) return;

    if (requireAuth) {
      // Check NextAuth session (Firebase-based authentication)
      const isNextAuthAuthenticated = status === 'authenticated' && session;
      
      if (isNextAuthAuthenticated) {
        setIsAuthorized(true);
        setIsLoading(false);
      } else if (status === 'unauthenticated') {
        // Not authenticated, redirect to login
        setHasRedirected(true);
        const callbackUrl = encodeURIComponent(pathname);
        router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
      }
    } else {
      // Public route - allow access regardless of authentication status
      // Remove the automatic redirect to dashboard for authenticated users
      // This allows users to visit the landing page even when logged in
      setIsAuthorized(true);
      setIsLoading(false);
    }
  }, [status, session, requireAuth, pathname, redirectTo, router, hasRedirected]);

  // Don't show loading state - render children immediately
  // Pages will handle their own loading states
  // Only block if we're definitely redirecting (not authorized and not still checking)
  
  // If we're redirecting (unauthenticated and not still loading), return null
  // Otherwise, render children immediately - don't block with loading state
  if (requireAuth && status === 'unauthenticated' && !isLoading && hasRedirected) {
    return null; // Will redirect or already redirected
  }

  // Render children immediately - don't block with loading state
  return <>{children}</>;
};

export default RouteGuard;
