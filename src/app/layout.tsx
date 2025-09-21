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
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CVCircle.io - AI-Powered CV Builder',
  description: 'Create stunning CVs with AI assistance. Professional templates, ATS optimization, and real-time analytics.',
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
                {children}
              </PaymentModalProvider>
            </LoadingProvider>
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
        <PerformanceMonitor />
        <CookieConsent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
