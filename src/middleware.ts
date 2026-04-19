import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
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
  '/editor', // Allow guest access to editor for onboarding
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
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuth = !!token;

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
      '/api/public',
      '/api/webhooks',
      '/api/health',
    ];
    
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      log.debug('Public API route accessed', { pathname, method });
      return NextResponse.next()
    }

    // Explicitly protect all /api/admin routes
    if (pathname.startsWith('/api/admin/')) {
      if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized', message: 'Please sign in to access this resource' }, { status: 401 })
      }
      
      const isUserAdmin = token.type === 'admin' || token.role === 'admin' || token.role === 'superadmin';
      if (!isUserAdmin) {
        log.warn('Unauthorized admin API access attempt', { pathname, method, userId: token.id });
        return NextResponse.json({ error: 'Forbidden', message: 'Admin access required' }, { status: 403 })
      }
      return NextResponse.next();
    }
    
    // Check authentication for other protected API routes
    if (!isAuth) {
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
      userId: token.id,
      role: token.role
    });
    return NextResponse.next()
  }

  // Protect admin routes with special authorization
  if (isAdminRoute(req)) {
    if (!isAuth) {
      log.warn('Unauthorized admin access attempt', { 
        pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      // Pass through so the client-side AuthGuard can pop up the modal
      return NextResponse.next();
    }

    // Check if user has admin role
    const isUserAdmin = token.type === 'admin' || token.role === 'admin' || token.role === 'superadmin';
    if (!isUserAdmin) {
      log.warn('Insufficient permissions for admin access', { 
        pathname, 
        userId: token.id,
        role: token.role,
        type: token.type || 'none',
      });
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    log.debug('Admin access granted', { 
      pathname, 
      userId: token.id,
      role: token.role
    });
    return NextResponse.next()
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    if (!isAuth) {
      log.debug('Unauthenticated access to protected route, passing to client Auth Modal', { pathname });
      // Pass through to let client-side Auth Modal handle it
      return NextResponse.next()
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
      userId: token.id,
      role: token.role
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

/**
 * Middleware Configuration
 * 
 * IMPORTANT: By explicitly setting the matcher, the middleware will ONLY run
 * on these paths.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - public (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
}
