'use client';

import { ReactNode, useEffect } from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';
import SessionProvider from './SessionProvider';
import { AuthProvider } from '@/contexts/AuthContext';
// AdminAuthProvider removed - use NextAuth useSession() directly
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import { PaymentModalProvider } from '@/contexts/PaymentModalContext';
import { CreditExhaustionProvider } from '@/contexts/CreditExhaustionContext';
import CookieConsent from '@/components/CookieConsent';
import { ConsoleLoggerProvider } from '@/contexts/ConsoleLoggerProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import SessionCleanup from '@/components/SessionCleanup';
import { setupEventErrorHandling } from '@/lib/utils/errorHandler';
import { Toaster } from '@/components/ui/toaster';
import { Session } from 'next-auth';
import ClientErrorBoundary from './ClientErrorBoundary';
import FeaturePromotionProvider from '@/components/promotions/FeaturePromotionProvider';
import AuthModal from '@/components/auth/AuthModal';
import ReactQueryProvider from './ReactQueryProvider';

interface ClientProvidersProps {
  children: ReactNode;
  session?: Session | null; // Session from getServerSession
}

function AppSkinProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PaymentModalProvider>
        <CreditExhaustionProvider>
          <ConsoleLoggerProvider>
            <FeaturePromotionProvider>
              <PerformanceMonitor />
              <CookieConsent />
              <SessionCleanup />
              <Toaster />
              <HotToaster />
              <AuthModal />
              {children}
            </FeaturePromotionProvider>
          </ConsoleLoggerProvider>
        </CreditExhaustionProvider>
      </PaymentModalProvider>
    </ThemeProvider>
  );
}

export default function ClientProviders({ children, session }: ClientProvidersProps) {
  useEffect(() => {
    // Delay error handler setup to avoid race conditions with React initialization
    const timeoutId = setTimeout(() => {
      try {
        // Setup global error handling for Event object errors
        const cleanup = setupEventErrorHandling();

        // Store cleanup function for unmount
        return cleanup;
      } catch (error) {
        console.warn('Failed to setup error handling:', error);
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <ReactQueryProvider>
      <SessionProvider session={session}>
        {/* Flattened outer provider chain: these three must elide auth/session dependencies */}
        <AuthProvider>
          <ClientErrorBoundary>
            <NotificationProvider>
              {/* App-level UI providers without auth/session dependencies */}
              <AppSkinProviders>{children}</AppSkinProviders>
            </NotificationProvider>
          </ClientErrorBoundary>
        </AuthProvider>
      </SessionProvider>
    </ReactQueryProvider>
  );
}
