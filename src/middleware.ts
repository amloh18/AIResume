import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const protectedRoutes = [
  '/dashboard',
  '/studio',
  '/profile',
  '/admin',
]

const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/master-cv-onboarding',
  '/onboarding',
  '/onboarding-universal',
  '/privacy-policy',
  '/terms',
  '/cookie-policy',
]

const isProtectedRoute = (req: NextRequest) => {
  return protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
}

const isPublicRoute = (req: NextRequest) => {
  return publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
}

export default async function middleware(req: NextRequest) {
  console.log('🚀 Middleware triggered for:', req.nextUrl.pathname)

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Allow API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow static assets
  if (req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.startsWith('/public')) {
    return NextResponse.next()
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    console.log('🔍 Middleware - Checking authentication for:', req.nextUrl.pathname)

    // Check for NextAuth session token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      console.log('❌ Middleware - No session token found, redirecting to sign-in')
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    console.log('✅ Middleware - Session token found, allowing access')

    // Check if user has a master CV
    try {
      const response = await fetch(`${req.nextUrl.origin}/api/user/current`)

      if (response.ok) {
        const userData = await response.json()

        // If user doesn't have a master CV, redirect to master CV onboarding
        if (!userData.user?.hasMasterCV) {
          console.log('🔍 Middleware - User has no master CV, redirecting to onboarding')
          const onboardingUrl = new URL('/master-cv-onboarding', req.url)
          return NextResponse.redirect(onboardingUrl)
        }
        
        console.log('✅ Middleware - User has master CV, allowing access')
      }
    } catch (error) {
      console.error('Middleware: Error checking master CV status:', error)
      // If we can't check master CV status, allow access to dashboard
      // The dashboard layout will handle the redirect
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
