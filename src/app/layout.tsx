import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import PerformanceMonitor from '@/components/ui/PerformanceMonitor'
import { LoadingProvider } from '@/components/providers/LoadingProvider'
import { PaymentModalProvider } from '@/contexts/PaymentModalContext'
import CookieConsent from '@/components/CookieConsent'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ConsoleLoggerProvider } from '@/contexts/ConsoleLoggerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CVCircle.io - AI-Powered CV Builder',
  description: 'Create stunning CVs with AI assistance. Professional templates, ATS optimization, and real-time analytics.',
  icons: {
    icon: '/images/favicon.png',
    shortcut: '/images/favicon.png',
    apple: '/images/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider>
            <LoadingProvider>
              <PaymentModalProvider>
                <NotificationProvider>
                  <ConsoleLoggerProvider>
                    {children}
                  </ConsoleLoggerProvider>
                </NotificationProvider>
              </PaymentModalProvider>
            </LoadingProvider>
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
        <PerformanceMonitor />
        <CookieConsent />
      </body>
    </html>
  )
}
