'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
}) => {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (requireAuth && status === 'unauthenticated' && !isRedirecting) {
      setIsRedirecting(true);
      const queryString = typeof window !== 'undefined'
        ? window.location.search.replace(/^\?/, '')
        : '';
      const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;
      // Redirect to sign-in page with callback URL
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, requireAuth, pathname, router, isRedirecting]);

  // If loading or unauthenticated (and we're redirecting), show a minimal loading state
  // This prevents the "ghost account" (stale data) from flashing or being visible
  if (status === 'loading' || (requireAuth && status === 'unauthenticated')) {
    return (
      <LoadingOverlay 
        message={status === 'loading' ? 'Verifying session...' : 'Redirecting to login...'} 
      />
    );
  }

  // Render children normally for authenticated or public routes
  return <>{children}</>;
};

export default RouteGuard;
