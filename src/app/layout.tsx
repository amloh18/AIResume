import type { Metadata, Viewport } from 'next'
import './globals.css'
import React from 'react'
import ClientProviders from '@/components/providers/ClientProviders'
import ResourceHints from '@/components/ResourceHints'
import DeferredAnalytics from '@/components/DeferredAnalytics'
import ViewportMeta from '@/components/ViewportMeta'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth-config'

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a230f' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'CVCircle - AI-Powered CV Builder & ATS Resume Optimizer | CV Circle',
    template: '%s | CVCircle'
  },
  description: 'CVCircle (CV Circle) - Create ATS-optimized CVs with AI assistance. Free AI career guide, professional templates, resume analysis, and real-time analytics. Build your perfect resume in minutes and land your dream job.',
  keywords: [
    'CV builder',
    'resume builder',
    'AI CV builder',
    'ATS optimization',
    'ATS resume checker',
    'professional CV',
    'CV templates',
    'resume templates',
    'career tools',
    'job application',
    'CV maker',
    'resume maker',
    'AI career guide',
    'resume analyzer',
    'CV analyzer',
    'ATS resume optimizer',
    'free resume builder',
    'online CV builder',
    'CV Circle',
    'cv circle',
    'CV Circle.io',
    'cv circle io',
    'CV Circle platform',
    'CV Circle app',
    'CVCircle',
    'cvcircle',
    'cv circle builder',
    'CV Circle resume builder'
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
    url: 'https://cvcircle.io',
    title: 'CVCircle (CV Circle) - AI-Powered CV Builder & ATS Resume Optimizer',
    description: 'CVCircle (CV Circle) - Create ATS-optimized CVs with AI assistance. Free AI career guide, professional templates, resume analysis, and real-time analytics. Build your perfect resume in minutes.',
    siteName: 'CVCircle (CV Circle)',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CVCircle - AI-Powered CV Builder & ATS Resume Optimizer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVCircle (CV Circle) - AI-Powered CV Builder & ATS Resume Optimizer',
    description: 'CVCircle (CV Circle) - Create ATS-optimized CVs with AI assistance. Free AI career guide, professional templates, and resume analysis.',
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
      { url: '/images/favicon.png', sizes: '128x128', type: 'image/png' },
    ],
    shortcut: '/images/favicon.png',
    apple: [
      { url: '/images/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/images/favicon.png',
        color: '#81ff00',
      },
    ],
  },
  manifest: '/site.webmanifest',
  category: 'technology',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch the session on the server - wrap in try-catch to prevent crashes
  let session = null;
  try {
    session = await getServerSession(authConfig);
  } catch (error) {
    // Log error but don't crash the app
    console.error('Error fetching session in RootLayout:', error);
    // Continue with null session - app will work without session
  }

  return (
    <html lang="en">
      <body>
        <ViewportMeta />
        <ResourceHints />
        <React.Suspense fallback={null}>
          <ClientProviders session={session}>
            {children}
          </ClientProviders>
        </React.Suspense>
        {/* Load analytics after page is interactive */}
        <DeferredAnalytics />
      </body>
    </html>
  )
}
