import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, isAdmin, isAuthenticated, getUserId, getUserRole } from '@/lib/edge-auth'
import { log } from '@/lib/edge-logger'

// Middleware automatically runs on Edge Runtime - no runtime export needed

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
  const startTime = Date.now();
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  // Early return for /studio routes
  // The studio page handles its own authentication via RouteGuard
  if (pathname.startsWith('/studio')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (isPublicRoute(req)) {
    log.debug('Public route accessed', { pathname, method });
    return NextResponse.next()
  }

  // Allow static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next()
  }

  // Get and verify the token from the request
  const token = verifyToken(req)

  // Check API routes for authentication
  if (pathname.startsWith('/api/')) {
    // Allow auth API routes without authentication (they handle auth internally)
    if (pathname.startsWith('/api/auth/')) {
      log.debug('Auth API route accessed', { pathname, method });
      return NextResponse.next()
    }

    // Allow public API routes
    const publicApiRoutes = [
      '/api/cvs/onboarding',
      '/api/cv/parse',
      '/api/public',
      '/api/webhooks',
      '/api/health',
      '/api/ai/career-analysis',
    ];
    
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      log.debug('Public API route accessed', { pathname, method });
      return NextResponse.next()
    }
    
    // Check authentication for protected API routes
    if (!isAuthenticated(token)) {
      log.warn('Unauthorized API access attempt', { 
        pathname, 
        method,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please sign in to access this resource'
      }, { status: 401 })
    }
    
    log.debug('Authenticated API access', { 
      pathname, 
      method, 
      userId: getUserId(token),
      role: getUserRole(token)
    });
    return NextResponse.next()
  }

  // Protect admin routes with special authorization
  if (isAdminRoute(req)) {
    if (!isAuthenticated(token)) {
      log.warn('Unauthorized admin access attempt', { 
        pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      return NextResponse.redirect(new URL('/admin/signin', req.url))
    }

    // Check if user has admin role
    if (!isAdmin(token)) {
      log.warn('Insufficient permissions for admin access', { 
        pathname, 
        userId: getUserId(token),
        role: getUserRole(token)
      });
      return NextResponse.redirect(new URL('/admin/signin', req.url))
    }

    log.debug('Admin access granted', { 
      pathname, 
      userId: getUserId(token),
      role: getUserRole(token)
    });
    return NextResponse.next()
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    if (!isAuthenticated(token)) {
      log.debug('Redirecting to sign-in', { pathname });
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }

    // For dashboard routes, check for expired subscription context
    // Note: Full time-based access check happens at API/resource level
    // This is just a lightweight check to redirect users with expired subscriptions
    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/settings')) {
      // Check if there's an expired subscription context in the URL
      const expiredParam = req.nextUrl.searchParams.get('expired');
      if (expiredParam === 'true') {
        // Redirect to membership settings with expired context
        return NextResponse.redirect(new URL('/dashboard/settings?tab=membership&expired=true', req.url));
      }
    }

    log.debug('Protected route accessed', { 
      pathname, 
      userId: getUserId(token),
      role: getUserRole(token)
    });
    return NextResponse.next()
  }

  // Log performance for non-static requests
  const duration = Date.now() - startTime;
  if (duration > 100) { // Only log slow requests
    log.performance('middleware', duration, { pathname, method });
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only run for specific API routes that need authentication
        // Explicitly exclude /studio and other page routes from middleware
    '/api/dashboard/(.*)',
    '/api/profile/(.*)',
    '/api/cv/create',
    '/api/cv/update',
    '/api/cv/delete',
    '/api/cv/list',
    '/api/jobs/(.*)',
    '/api/cover-letters/(.*)',
  ],
}
