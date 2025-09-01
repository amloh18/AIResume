'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/SkeletonLoader';

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
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Don't process if still loading
    if (status === 'loading') return;

    // Don't redirect multiple times
    if (hasRedirected) return;

    if (requireAuth) {
      if (status === 'authenticated' && session) {
        setIsAuthorized(true);
        setIsLoading(false);
      } else if (status === 'unauthenticated') {
        // Not authenticated, redirect to login
        setHasRedirected(true);
        const callbackUrl = encodeURIComponent(pathname);
        router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
      }
    } else {
      // Public route - check if user is authenticated and redirect away from landing
      if (status === 'authenticated' && session && pathname === '/') {
        // Logged in user trying to access landing page, redirect to dashboard
        setHasRedirected(true);
        router.push('/dashboard');
        return;
      }
      setIsAuthorized(true);
      setIsLoading(false);
    }
  }, [status, session, requireAuth, pathname, redirectTo, router, hasRedirected]);

  // Show skeleton loader while checking authentication
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center mb-8">
            <Skeleton variant="text" height={32} width="300px" className="mx-auto mb-4" />
            <Skeleton variant="text" height={16} width="200px" className="mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton variant="rounded" height="200px" />
            <Skeleton variant="rounded" height="200px" />
            <Skeleton variant="rounded" height="200px" />
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authorized (will redirect)
  if (!isAuthorized && requireAuth) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;
