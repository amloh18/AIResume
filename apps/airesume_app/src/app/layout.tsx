import type { Metadata, Viewport } from 'next'
import './globals.css'
import React from 'react'
import Script from 'next/script'
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
  // ⚠️ Deliberately NO `alternates.canonical` here.
  //
  // Metadata is inherited by every child route, so a canonical declared on the root layout applies to
  // every page that does not override it. Setting it to '/' therefore told search engines that
  // /interview-coach, /linkedin-enhancer, /legal/* and the policy pages were all duplicates of the
  // homepage — they would not be indexed in their own right. Each page declares its own canonical,
  // and the homepage declares its own in `app/page.tsx`.
  //
  // The OG and Twitter images are deliberately not set here either: `app/opengraph-image.tsx`
  // supplies a card for every route. The paths previously listed here (`/images/og-image.png`,
  // `/images/twitter-image.png`) are not in `public/images/`, so every shared link rendered with no
  // preview image at all. If you set `images` on an individual page, the file must actually exist —
  // `grep -rn "images: \[" apps/airesume_app/src/app` finds them.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'Build. Match. Apply. Get hired. | BuildAIResume',
    description: 'Create once. Tailor for every job. Apply manually or let AI automate your applications.',
    siteName: 'AIResume',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Build. Match. Apply. Get hired. | BuildAIResume',
    description: 'Create once. Tailor for every job. Apply manually or let AI automate your applications.',
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
    // Bing's token is instance-specific, so it is read from the environment exactly like the Google
    // one. The literal that used to sit here was this deployment's real token — it does not belong
    // in a public repository, and every fork would have inherited a verification that fails.
    // Set BING_SITE_VERIFICATION to restore the tag.
    other: process.env.BING_SITE_VERIFICATION
      ? { 'msvalidate.01': [process.env.BING_SITE_VERIFICATION] }
      : {},
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
        {/* Instance-specific verification token, read from the environment so the public repository
            carries no deployment identifiers. Impact's snippet uses `value=`, not `content=` —
            that is intentional, do not "fix" it.

            ⚠️ The spread is load-bearing, not decoration. `value` is not a valid attribute of
            `<meta>` in React's types (`MetaHTMLAttributes` has no `value`), so the direct form
            `value={...}` is a **build-breaking** TS2322. Spreading an object literal bypasses the
            excess-property check while still emitting `value="…"` in the HTML — which is what
            impact.com's verifier looks for. Do not simplify this to `value={...}`, and do not
            "correct" it to `content={...}`. */}
        {process.env.IMPACT_SITE_VERIFICATION ? (
          <meta
            name="impact-site-verification"
            {...{ value: process.env.IMPACT_SITE_VERIFICATION }}
          />
        ) : null}
        {/*
          Both scripts are loaded through `next/script`, not rendered as inline <script> elements.
          A component-rendered script tag is not managed by React: on the client React has to create it
          detached (logging "Encountered a script tag while rendering React component"), and any
          server/client difference in that subtree breaks hydration. `next/script` hands execution to
          Next's bootstrap, which runs beforeInteractive scripts before hydration, in document order.
        */}

        {/* Suppress third-party Chrome Extension wallet injection errors (e.g. Rabby Wallet evmAsk.js) */}
        <Script
          id="suppress-wallet-errors"
          src="/wallet-error-suppressor.js"
          strategy="beforeInteractive"
        />

        {/* Theme initialization: Default to system theme with manual override */}
        <Script
          id="theme-initializer"
          src="/theme-init.js"
          strategy="beforeInteractive"
        />
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
