import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import ClientProviders from '@/components/providers/ClientProviders'

const inter = Inter({ subsets: ['latin'] })

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic'
export const dynamicParams = true

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
        <ClientProviders>
          {children}
        </ClientProviders>
        <Analytics />
      </body>
    </html>
  )
}
