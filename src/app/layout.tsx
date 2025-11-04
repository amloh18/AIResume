import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import ClientProviders from '@/components/providers/ClientProviders'

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: {
    default: 'CVCircle - AI-Powered CV Builder',
    template: '%s | CVCircle'
  },
  description: 'Create stunning CVs with AI assistance. Professional templates, ATS optimization, and real-time analytics. Build your perfect resume in minutes.',
  keywords: [
    'CV builder',
    'resume builder',
    'AI CV',
    'ATS optimization',
    'professional CV',
    'CV templates',
    'resume templates',
    'career tools',
    'job application',
    'CV maker'
  ],
  authors: [{ name: 'CVCircle Team' }],
  creator: 'CVCircle',
  publisher: 'CVCircle',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://cvcircle.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'CVCircle - AI-Powered CV Builder',
    description: 'Create stunning CVs with AI assistance. Professional templates, ATS optimization, and real-time analytics.',
    siteName: 'CVCircle',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CVCircle - AI-Powered CV Builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVCircle - AI-Powered CV Builder',
    description: 'Create stunning CVs with AI assistance. Professional templates, ATS optimization, and real-time analytics.',
    images: ['/images/twitter-image.png'],
    creator: '@cvcircle',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/images/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/images/favicon.png',
    apple: [
      { url: '/images/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/images/favicon.png',
        color: '#5bbad5',
      },
    ],
  },
  manifest: '/site.webmanifest',
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
