import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { log } from '@/lib/edge-logger'

// Proxy automatically runs on Edge Runtime - no runtime export needed

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
  '/admin/login',
  '/custom-signin',
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
  '/editor',
]

const isProtectedRoute = (req: NextRequest) => {
  return protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
}

const isAdminRoute = (req: NextRequest) => {
  return adminRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
}

const isPublicRoute = (req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  return publicRoutes.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });
}

export default async function proxy(req: NextRequest) {
  const startTime = Date.now();
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  // CRITICAL: Fail closed if the JWT secret is missing. Never fall back to a
  // hardcoded value — a known signing secret would let anyone forge admin tokens.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    log.error('NEXTAUTH_SECRET is not set; denying request', undefined, { pathname, method });
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (pathname.startsWith('/studio')) {
    return NextResponse.next()
  }

  if (isPublicRoute(req)) {
    log.debug('Public route accessed', { pathname, method });
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret });
  const isAuth = !!token;

  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) {
      log.debug('Auth API route accessed', { pathname, method });
      return NextResponse.next()
    }

    const publicApiRoutes = [
      '/api/cvs/onboarding',
      '/api/public',
      '/api/webhooks',
      '/api/health',
      '/api/user/onboarding',
      '/api/cv/parse',
      '/api/cv-draft/save',
      '/api/cv-draft/load',
      '/api/cvs',
      '/api/cv/analysis-snapshot',
      '/api/pricing-plans',
      '/api/pricing',
      '/api/activity-log',
      '/api/user/subscription',
      '/api/check-email',
      '/api/testimonials',
    ];

    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      log.debug('Public API route accessed', { pathname, method });
      return NextResponse.next()
    }

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

  if (isAdminRoute(req)) {
    if (!isAuth) {
      log.warn('Unauthenticated admin access attempt', {
        pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

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

  if (isProtectedRoute(req)) {
    if (!isAuth) {
      log.debug('Unauthenticated access to protected route, redirecting to login', { pathname });
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    const isUserAdmin = token.type === 'admin' || token.role === 'admin' || token.role === 'superadmin';
    // Admin users are allowed to access consumer routes if they want to
    // They will have a "Switch to Admin" button in their navigation

    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/settings')) {
      const expiredParam = req.nextUrl.searchParams.get('expired');
      if (expiredParam === 'true') {
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

  const duration = Date.now() - startTime;
  if (duration > 100) {
    log.performance('proxy', duration, { pathname, method });
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
}
