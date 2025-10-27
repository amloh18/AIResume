'use client';

import { ReactNode } from 'react';
import SessionProvider from './SessionProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import { LoadingProvider } from './LoadingProvider';
import { PaymentModalProvider } from '@/contexts/PaymentModalContext';
import CookieConsent from '@/components/CookieConsent';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ConsoleLoggerProvider } from '@/contexts/ConsoleLoggerProvider';

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      <AuthProvider>
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
      </AuthProvider>
    </SessionProvider>
  );
}
