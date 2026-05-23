'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';

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
      // Redirect to sign-in page with callback URL
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, requireAuth, pathname, router, isRedirecting]);

  // If loading or unauthenticated (and we're redirecting), show a minimal loading state
  // This prevents the "ghost account" (stale data) from flashing or being visible
  if (status === 'loading' || (requireAuth && status === 'unauthenticated')) {
    return (
      <div className="fixed inset-0 bg-[#f3f2ee] dark:bg-[#1a230f] flex flex-col items-center justify-center z-[9999] p-6 text-center">
        <div className="flex flex-col items-center gap-8">
          <div className="animate-pulse">
            <Logo size="lg" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#81ff00] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium animate-pulse">
              {status === 'loading' ? 'Verifying session...' : 'Redirecting to login...'}
            </p>
          </div>
        </div>
        
        {/* Decorative background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#81ff00] rounded-full blur-[100px] opacity-10" />
        </div>
      </div>
    );
  }

  // Render children normally for authenticated or public routes
  return <>{children}</>;
};

export default RouteGuard;
