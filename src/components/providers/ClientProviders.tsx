'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SessionProvider from './SessionProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import { LoadingProvider } from './LoadingProvider';
import { PaymentModalProvider } from '@/contexts/PaymentModalContext';
import CookieConsent from '@/components/CookieConsent';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ConsoleLoggerProvider } from '@/contexts/ConsoleLoggerProvider';
import { setupEventErrorHandling } from '@/lib/utils/errorHandler';

interface ClientProvidersProps {
  children: ReactNode;
}

function ConditionalProviders({ children }: ClientProvidersProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // For admin routes, use AdminAuthProvider instead of AuthProvider
  if (isAdminRoute) {
    return (
      <AdminAuthProvider>
        <ThemeProvider>
          <LoadingProvider>
            <PaymentModalProvider>
              <NotificationProvider>
                <ConsoleLoggerProvider>
                  <PerformanceMonitor />
                  <CookieConsent />
                  {children}
                </ConsoleLoggerProvider>
              </NotificationProvider>
            </PaymentModalProvider>
          </LoadingProvider>
        </ThemeProvider>
      </AdminAuthProvider>
    );
  }

  // For regular routes, use SessionProvider
  return (
    <SessionProvider>
      <ThemeProvider>
        <LoadingProvider>
          <PaymentModalProvider>
            <NotificationProvider>
              <ConsoleLoggerProvider>
                <PerformanceMonitor />
                <CookieConsent />
                {children}
              </ConsoleLoggerProvider>
            </NotificationProvider>
          </PaymentModalProvider>
        </LoadingProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  useEffect(() => {
    // Setup global error handling for Event object errors
    const cleanup = setupEventErrorHandling();
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  return <ConditionalProviders>{children}</ConditionalProviders>;
}
