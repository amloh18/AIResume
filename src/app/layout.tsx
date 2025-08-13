import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import PerformanceMonitor from '@/components/ui/PerformanceMonitor'
import SessionManagerProvider from '@/components/providers/SessionManagerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Circle CV App',
  description: 'A modern CV builder and management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <SessionProvider>
            <SessionManagerProvider>
              {children}
            </SessionManagerProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
        <PerformanceMonitor />
      </body>
    </html>
  )
} 