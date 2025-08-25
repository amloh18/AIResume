'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

interface SessionManagerProviderProps {
  children: React.ReactNode;
}

const SessionManagerProvider: React.FC<SessionManagerProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Handle authenticated users trying to access landing page
    if (status === 'authenticated' && session && pathname === '/') {
      router.push('/dashboard');
    }
  }, [session, status, pathname, router]);

  return <>{children}</>;
};

export default SessionManagerProvider;
