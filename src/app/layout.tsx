import type { Metadata, Viewport } from 'next'
import './globals.css'
import React from 'react'
import ClientProviders from '@/components/providers/ClientProviders'
import ResourceHints from '@/components/ResourceHints'
import DeferredAnalytics from '@/components/DeferredAnalytics'
import ViewportMeta from '@/components/ViewportMeta'
import GlobalCommandBar from '@/components/ui/GlobalCommandBar'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { geistFont } from '@/lib/fonts'

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

const APP_URL = process.env.NEXTAUTH_URL || 'https://buildairesume.com';

export const metadata: Metadata = {
  title: {
    default: 'AI Resume Builder | Build an ATS-Friendly Resume with AI',
    template: '%s | AIResume'
  },
  description: 'Build, optimize, and tailor an ATS-friendly resume with AI. Create professional resumes, improve your content, and prepare every application faster.',
  keywords: [
    'AI resume builder',
    'AI resume writer',
    'resume builder',
    'resume maker',
    'ATS resume builder',
    'ATS-friendly resume',
    'resume optimizer',
    'AI CV builder',
    'CV builder',
    'resume templates',
    'professional resume builder',
    'job-specific resume',
    'tailored resume',
    'resume checker',
    'resume score',
    'AI cover letter generator',
    'job application tracker',
    'CV templates',
    'professional resume',
    'free resume builder',
    'online resume builder',
    'résumé builder',
    'international CV',
    'AI career tools'
  ],
  authors: [{ name: 'AIResume Team' }],
  creator: 'AIResume by Morigrid Labs',
  publisher: 'Morigrid Labs',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'Build a Better Resume With AI',
    description: 'Create an ATS-friendly resume, tailor it to every job, and apply with confidence using AI-powered resume tools.',
    siteName: 'AIResume',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AIResume - Build a Better Resume With AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Build a Better Resume With AI',
    description: 'Create an ATS-friendly resume, tailor it to every job, and apply with confidence using AI-powered resume tools.',
    images: ['/images/twitter-image.png'],
    creator: '@buildairesume',
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
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/images/favicon.svg', type: 'image/svg+xml' },
        { url: '/images/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/images/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/images/favicon.png', sizes: 'any', type: 'image/png' },
      ],
      shortcut: '/favicon.svg',
      apple: [
        { url: '/images/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
      other: [
        {
          rel: 'mask-icon',
          url: '/images/favicon.svg',
          color: '#013f2e',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="impact-site-verification" {...{ value: "044e0d11-071e-4480-aa4e-7fae5e6da834" }} />
        {/* Suppress third-party Chrome Extension wallet injection errors (e.g. Rabby Wallet evmAsk.js) */}
        <script
          id="suppress-wallet-errors"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `
          (function() {
            window.addEventListener('error', function(e) {
              if (e.message && (e.message.indexOf('ethereum') !== -1 || e.message.indexOf('evmAsk') !== -1 || (e.filename && e.filename.indexOf('evmAsk') !== -1))) {
                e.stopImmediatePropagation();
              }
            }, true);
            window.addEventListener('unhandledrejection', function(e) {
              if (e.reason && (e.reason.message && e.reason.message.indexOf('ethereum') !== -1 || (e.reason.stack && e.reason.stack.indexOf('evmAsk') !== -1))) {
                e.preventDefault();
              }
            }, true);
          })();
        `}} />
      </head>
      <body className={`${geistFont.variable} geist-ui font-sans`}>
        <ViewportMeta />
        <ResourceHints />
        <React.Suspense fallback={
          <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#f3f2ee] dark:bg-[#141810] overflow-hidden">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Concentric Rotating Rings */}
              <div className="absolute inset-0 border-[3px] border-transparent border-t-[#013f2e] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-2 border-[2px] border-transparent border-b-[#013f2e]/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
              
              {/* Center Logo SVG Fill (No text) */}
              <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                <img
                  src="/images/logo.svg"
                  alt="Loading"
                  className="w-10 h-10 object-contain drop-shadow-sm"
                />
              </div>
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
