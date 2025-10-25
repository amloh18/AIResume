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
  '/auth/verify-email',
  '/auth/error',
  '/auth/reset-password',
  '/master-cv-onboarding',
  '/onboarding',
  '/onboarding-universal',
  '/privacy-policy',
  '/terms',
  '/cookie-policy',
  '/force-logout',
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
    console.log('✅ Middleware - Public route, allowing access:', req.nextUrl.pathname)
    return NextResponse.next()
  }

  // Allow static assets
  if (req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.startsWith('/public')) {
    console.log('✅ Middleware - Static asset, allowing access:', req.nextUrl.pathname)
    return NextResponse.next()
  }

  // Check API routes for authentication
  if (req.nextUrl.pathname.startsWith('/api/')) {
    console.log('🔍 Middleware - API route detected, checking authentication:', req.nextUrl.pathname)
    
    // Allow onboarding API routes without authentication (they handle auth internally)
    if (req.nextUrl.pathname.startsWith('/api/cvs/onboarding') || 
        req.nextUrl.pathname.startsWith('/api/auth/')) {
      console.log('✅ Middleware - Allowing onboarding/auth API route without token check')
      return NextResponse.next()
    }
    
    // Check for NextAuth session token first
    const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (nextAuthToken) {
      console.log('✅ Middleware - NextAuth token found, allowing access')
      return NextResponse.next()
    }
    
    // Check for Firebase user ID in headers (for client-side requests)
    const firebaseUserId = req.headers.get('x-firebase-user-id')
    if (firebaseUserId) {
      console.log('✅ Middleware - Firebase user ID found in headers, allowing access')
      return NextResponse.next()
    }
    
    // Check for Firebase authorization header (basic check without verification in middleware)
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('✅ Middleware - Firebase token found in headers, allowing access (verification will be done in API routes)')
      return NextResponse.next()
    }
    
    console.log('❌ Middleware - No valid authentication found for API route, returning 401')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    console.log('🔍 Middleware - Protected route detected, checking authentication:', req.nextUrl.pathname)

    // Check for NextAuth session token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      console.log('❌ Middleware - No session token found, redirecting to sign-in')
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    console.log('✅ Middleware - Session token found, allowing access to protected route')
  }

  console.log('✅ Middleware - Allowing access to:', req.nextUrl.pathname)
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
