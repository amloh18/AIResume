'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/SkeletonLoader';

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
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, requireAuth, pathname, router, isRedirecting]);

  // If loading session, keep the shell and show a minimal inline state instead of a full-screen overlay.
  // The server layout already rendered the shell; we only need to block interactive content until auth resolves.
  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Skeleton className="min-h-[160px] w-full rounded-2xl" />
          <Skeleton className="min-h-[160px] w-full rounded-2xl" />
          <Skeleton className="min-h-[160px] w-full rounded-2xl" />
        </div>
        <Skeleton className="min-h-[500px] w-full rounded-2xl mt-4" />
      </div>
    );
  }

  // For unauthenticated users, let the redirect happen in the background.
  // Render a minimal inline placeholder instead of a full-screen blocking overlay.
  if (requireAuth && status === 'unauthenticated') {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-64" />
        <p className="text-sm text-gray-500">Redirecting to sign-in...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouteGuard;
