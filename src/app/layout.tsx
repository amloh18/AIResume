import type { Metadata, Viewport } from 'next'
import './globals.css'
import React from 'react'
import ClientProviders from '@/components/providers/ClientProviders'
import ResourceHints from '@/components/ResourceHints'
import DeferredAnalytics from '@/components/DeferredAnalytics'
import ViewportMeta from '@/components/ViewportMeta'
import GlobalCommandBar from '@/components/ui/GlobalCommandBar'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth-config'

// Allow Next.js to determine rendering strategy (SSG vs SSR) automatically
export const dynamic = 'auto'
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
    default: 'CVCIRCLE - Job Application tracker and AI based ATS Editor',
    template: '%s | CVCIRCLE'
  },
  description: 'CVCircle (CV Circle) - Create ATS-optimized CVs with AI assistance. Free AI career guide, professional templates, resume analysis, career coaching, interview coaching,and real-time analytics. Build your perfect resume in minutes and land your dream job.',
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
    'CV Circle resume builder',
    // Advanced & Trending Keywords
    'AI resume writer',
    'automated cover letter generator',
    'job application tracker',
    'AI interview coach',
    'LinkedIn profile optimizer',
    'career gap analysis',
    'resume scoring',
    'job match technology',
    'smart job search',
    'ATS compliance',
    'career copilot',
    'resume parser',
    'job tracking system',
    'application management',
    'AI career insights'
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
    other: {
      'msvalidate.01': ['C0E623844C2A0ACD1B0528453501DDAE'],
    },
  },
   icons: {
      icon: [
        { url: '/images/favicon.png', sizes: 'any' },
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
  // Fetch session on the server to prevent auth race conditions and flashes
  // This initializes the ClientProviders (SessionProvider) with the correct state immediately
  const session = await getServerSession(authConfig);

  return (
    <html lang="en">
      <head>
        <meta name="impact-site-verification" {...{ value: "044e0d11-071e-4480-aa4e-7fae5e6da834" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@300;400;500;600;700;800;900&display=swap"
        />
      </head>
      <body>
        <ViewportMeta />
        <ResourceHints />
        <React.Suspense fallback={
          <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#f3f2ee] dark:bg-[#141810] overflow-hidden">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Concentric Rotating Rings */}
              <div className="absolute inset-0 border-[3px] border-transparent border-t-[#81ff00] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-2 border-[2px] border-transparent border-b-[#81ff00]/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
              
              {/* Center "CV" Text */}
              <div className="relative z-10 flex items-center justify-center">
                <span className="text-2xl font-black text-black dark:text-white tracking-tighter">CV</span>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em] animate-pulse">Initializing</h3>
            </div>
          </div>
        }>
          <ClientProviders session={session}>
            {children}
            <GlobalCommandBar />
          </ClientProviders>
        </React.Suspense>
        {/* Load analytics after page is interactive */}
        <DeferredAnalytics />
      </body>
    </html>
  )
}
