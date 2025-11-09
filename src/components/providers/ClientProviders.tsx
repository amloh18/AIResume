'use client';

import { ReactNode, useEffect } from 'react';
import SessionProvider from './SessionProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import { PaymentModalProvider } from '@/contexts/PaymentModalContext';
import CookieConsent from '@/components/CookieConsent';
import { ConsoleLoggerProvider } from '@/contexts/ConsoleLoggerProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import SessionCleanup from '@/components/SessionCleanup';
import { setupEventErrorHandling } from '@/lib/utils/errorHandler';
import { Toaster } from '@/components/ui/toaster';
import { Session } from 'next-auth';
import ClientErrorBoundary from './ClientErrorBoundary';

interface ClientProvidersProps {
  children: ReactNode;
  session?: Session | null; // Session from getServerSession
}

function ConditionalProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <PaymentModalProvider>
        <ConsoleLoggerProvider>
          <PerformanceMonitor />
          <CookieConsent />
          <SessionCleanup />
          <Toaster />
          {children}
        </ConsoleLoggerProvider>
      </PaymentModalProvider>
    </ThemeProvider>
  );
}

export default function ClientProviders({ children, session }: ClientProvidersProps) {
  useEffect(() => {
    // Setup global error handling for Event object errors
    const cleanup = setupEventErrorHandling();

    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <AdminAuthProvider>
          {/* NotificationProvider must be inside SessionProvider to use useSession */}
          <NotificationProvider>
            <ClientErrorBoundary>
              <ConditionalProviders>{children}</ConditionalProviders>
            </ClientErrorBoundary>
          </NotificationProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
