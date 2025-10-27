import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// import { getToken } from 'next-auth/jwt' // Temporarily disabled due to Edge Runtime compatibility

const protectedRoutes = [
  '/dashboard',
  '/studio',
  '/profile',
]

const adminRoutes = [
  '/admin',
]

const publicRoutes = [
  '/',
  '/sign-in',
  '/custom-signin', // Custom sign-in page
  '/sign-up',
  '/admin/signin', // Allow access to admin sign-in page
  '/auth/verify-email',
  '/auth/error',
  '/auth/reset-password',
  '/ai-career-report',
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

const isAdminRoute = (req: NextRequest) => {
  return adminRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
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
    
    // Allow auth API routes without authentication (they handle auth internally)
    if (req.nextUrl.pathname.startsWith('/api/auth/')) {
      console.log('✅ Middleware - Allowing auth API route without token check')
      return NextResponse.next()
    }

    // Allow public API routes
    const publicApiRoutes = [
      '/api/cvs/onboarding',
      '/api/public',
      '/api/webhooks',
      '/api/health',
      '/api/ai/career-analysis',
    ];
    
    if (publicApiRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
      console.log('✅ Middleware - Allowing public API route without token check')
      return NextResponse.next()
    }
    
    // Temporarily disable JWT token checks due to Edge Runtime compatibility
    // TODO: Implement alternative authentication check for Edge Runtime
    console.log('⚠️ Middleware - JWT token checks temporarily disabled')
    return NextResponse.next()
  }

  // Protect admin routes with special authorization
  if (isAdminRoute(req)) {
    console.log('🔍 Middleware - Admin route detected, checking admin authentication:', req.nextUrl.pathname)

    // Temporarily disable JWT token checks due to Edge Runtime compatibility
    // TODO: Implement alternative authentication check for Edge Runtime
    console.log('⚠️ Middleware - Admin JWT token checks temporarily disabled')
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    console.log('🔍 Middleware - Protected route detected, checking authentication:', req.nextUrl.pathname)

    // Temporarily disable JWT token checks due to Edge Runtime compatibility
    // TODO: Implement alternative authentication check for Edge Runtime
    console.log('⚠️ Middleware - Protected route JWT token checks temporarily disabled')
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
