'use client';

import React, { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import PageSkeleton from '@/components/ui/PageSkeleton';

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
  // Ref (not state) so the redirect fires exactly once without a synchronous
  // setState-in-effect cascading render.
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (requireAuth && status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true;
      const queryString = typeof window !== 'undefined'
        ? window.location.search.replace(/^\?/, '')
        : '';
      const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;
      // Redirect to sign-in page with callback URL
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, requireAuth, pathname, router]);

  // While the session is being verified (or we're redirecting to sign-in), keep the
  // page chrome visible and show skeleton cards in the content area instead of a
  // full-screen overlay. This prevents the "ghost account" (stale data) from
  // flashing without blanking the whole screen.
  if (status === 'loading' || (requireAuth && status === 'unauthenticated')) {
    return (
      <div className="w-full h-full min-h-0 p-4 sm:p-6 overflow-y-auto">
        <PageSkeleton cards={status === 'loading' ? 6 : 3} />
      </div>
    );
  }

  // Render children normally for authenticated or public routes
  return <>{children}</>;
};

export default RouteGuard;
