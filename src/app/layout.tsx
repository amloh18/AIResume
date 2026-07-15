import type { Metadata, Viewport } from 'next'
import './globals.css'
import React from 'react'
import ClientProviders from '@/components/providers/ClientProviders'
import ResourceHints from '@/components/ResourceHints'
import DeferredAnalytics from '@/components/DeferredAnalytics'
import ViewportMeta from '@/components/ViewportMeta'
import GlobalCommandBar from '@/components/ui/GlobalCommandBar'
import ErrorSuppressor from '@/components/ErrorSuppressor'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth-config'
import { geistFont } from '@/lib/fonts'
import { headers } from 'next/headers'

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
  // This initializes the ClientProviders (SessionProvider) with the correct state immediately.
  // Skip this heavy session lookup for public routes so the landing page does not
  // block SSR on JWT/DB work when no session is needed.
  const headersList = await headers();
  const pathname = headersList.get('x-middleware-path') || '/';
  const isPublicRoute = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/onboarding');

  const session = isPublicRoute ? null : await getServerSession(authConfig);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = false;
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    isDark = true;
                  } else if (theme === 'system') {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <meta name="impact-site-verification" {...{ value: "044e0d11-071e-4480-aa4e-7fae5e6da834" }} />
        <ErrorSuppressor />
      </head>
      <body className={`${geistFont.variable} geist-ui font-sans`}>
        <ViewportMeta />
        <ResourceHints />
        <React.Suspense fallback={null}>
          <ClientProviders session={session}>
            {children}
            <GlobalCommandBar />
            {/* Load analytics after page is interactive */}
            <DeferredAnalytics />
          </ClientProviders>
        </React.Suspense>
      </body>
    </html>
  )
}
