'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useAuthModalStore } from '@/lib/stores/authModalStore';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
}) => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const openModal = useAuthModalStore((state) => state.openModal);
  const isOpen = useAuthModalStore((state) => state.isOpen);
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (requireAuth && status === 'unauthenticated' && !hasPrompted) {
      setHasPrompted(true);
      // Trigger the auth modal and preserve the URL intent
      openModal({ view: 'signin', callbackUrl: pathname });
    }
  }, [status, requireAuth, pathname, openModal, hasPrompted]);

  // If authentication is required and user is unauthenticated,
  // we render the children but add a blur/lock overlay.
  // The AuthModal will appear on top because it's at the root level.
  if (requireAuth && status === 'unauthenticated') {
    return (
      <div className="relative min-h-screen">
        <div className="pointer-events-none select-none blur-sm opacity-50 transition-all duration-300">
          {children}
        </div>
        {/* If the modal is somehow closed without logging in, we can show a fallback or just keep it blurred */}
        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center z-40">
            <button 
              onClick={() => openModal({ view: 'signin', callbackUrl: pathname })}
              className="px-6 py-3 bg-emerald-600 text-white rounded-none shadow-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Sign In to Continue
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render children normally for authenticated or public routes
  return <>{children}</>;
};

export default RouteGuard;
