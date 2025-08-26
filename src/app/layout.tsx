import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import PerformanceMonitor from '@/components/ui/PerformanceMonitor'
import SessionManagerProvider from '@/components/providers/SessionManagerProvider'
import { LoadingProvider } from '@/components/providers/LoadingProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CVCircle.io',
  description: 'AI-powered CV creation platform that revolutionizes how professionals land their dream jobs',
  keywords: 'CV, resume, job application, AI, career, professional',
  authors: [{ name: 'CVCircle Team' }],
  openGraph: {
    title: 'CVCircle.io',
    description: 'AI-powered CV creation platform',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVCircle.io',
    description: 'AI-powered CV creation platform',
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
        <ThemeProvider>
          <LoadingProvider>
            <SessionProvider>
              <SessionManagerProvider>
                {children}
              </SessionManagerProvider>
            </SessionProvider>
          </LoadingProvider>
        </ThemeProvider>
        <Analytics />
        <PerformanceMonitor />
      </body>
    </html>
  )
} 