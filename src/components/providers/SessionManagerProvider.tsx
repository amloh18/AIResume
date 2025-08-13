'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import SessionManager from '@/lib/utils/sessionManager';
import NavigationManager from '@/lib/utils/navigationManager';
import SessionTimeoutNotification from '@/components/ui/SessionTimeoutNotification';
import { useNavigationGuard } from '@/lib/hooks/useNavigationGuard';

interface SessionManagerProviderProps {
  children: React.ReactNode;
}

const SessionManagerProvider: React.FC<SessionManagerProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Use navigation guard hook
  useNavigationGuard();

  useEffect(() => {
    const sessionManager = SessionManager.getInstance();

    // Set up logout callback
    sessionManager.setLogoutCallback(() => {
      // Clear any stored data
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Redirect to login with session expired message
      router.push('/auth/signin?message=session_expired');
    });

    // Handle session timeout on page load
    if (status === 'authenticated' && session) {
      // Check if session is still valid
      if (!sessionManager.isSessionValid()) {
        console.log('Session expired on page load');
        sessionManager.forceLogout();
        return;
      }
    }

  }, [session, status, router]);

  const handleLogout = () => {
    router.push('/auth/signin?message=session_expired');
  };

  return (
    <>
      {children}
      <SessionTimeoutNotification onLogout={handleLogout} />
    </>
  );
};

export default SessionManagerProvider;
