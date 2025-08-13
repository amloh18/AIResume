'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import SessionManager from '@/lib/utils/sessionManager';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/signin' 
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionManager = SessionManager.getInstance();
    
    // Set up logout callback
    sessionManager.setLogoutCallback(() => {
      router.push('/auth/signin?message=session_expired');
    });

    // Update route in session manager
    sessionManager.updateRoute(pathname);
  }, [pathname, router]);

  useEffect(() => {
    if (status === 'loading') return;

    if (requireAuth) {
      if (status === 'authenticated' && session) {
        setIsAuthorized(true);
      } else {
        // Not authenticated, redirect to login
        const callbackUrl = encodeURIComponent(pathname);
        router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
        return;
      }
    } else {
      // Public route - check if user is authenticated and redirect away from landing
      if (status === 'authenticated' && session && pathname === '/') {
        // Logged in user trying to access landing page, redirect to dashboard
        const sessionManager = SessionManager.getInstance();
        const lastRoute = sessionManager.getLastRoute();
        router.push(lastRoute || '/dashboard');
        return;
      }
      setIsAuthorized(true);
    }

    setIsLoading(false);
  }, [status, session, requireAuth, pathname, redirectTo, router]);

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;
