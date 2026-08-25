import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { log } from '@/lib/edge-logger';

const protectedRoutes = [
  '/dashboard',
  '/studio',
  '/profile',
];

const adminRoutes = [
  '/admin',
];

const publicRoutes = [
  '/',
  '/sign-in',
  '/admin/login',
  '/admin/unauthorized',
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
];

const isProtectedRoute = (req: NextRequest) => {
  return protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
};

const isAdminRoute = (req: NextRequest) => {
  return adminRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
};

const isPublicRoute = (req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  return publicRoutes.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });
};

export default async function proxy(req: NextRequest) {
  const startTime = Date.now();
  const pathname = req.nextUrl.pathname;
  const method = req.method;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isAdminHost = host.startsWith('admin.') || host.includes('admin.localhost');

  // Skip static assets and internal Next.js assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Fail closed if the JWT secret is missing
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    log.error('NEXTAUTH_SECRET is not set; denying request', undefined, { pathname, method });
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Handle Admin Subdomain Rewriting (admin.buildairesume.com / admin.localhost)
  if (isAdminHost) {
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      return NextResponse.rewrite(url);
    }
    if (pathname === '/login') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.rewrite(url);
    }
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = `/admin/${pathname.replace(/^\//, '')}`;
      return NextResponse.rewrite(url);
    }
  }

  if (pathname.startsWith('/studio')) {
    return NextResponse.next();
  }

  if (isPublicRoute(req)) {
    log.debug('Public route accessed', { pathname, method });
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });
  const isAuth = !!token;
  const isUserAdmin = token?.type === 'admin' || token?.role === 'admin' || token?.role === 'superadmin';

  // API Routes Protection
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) {
      log.debug('Auth API route accessed', { pathname, method });
      return NextResponse.next();
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

    if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
      log.debug('Public API route accessed', { pathname, method });
      return NextResponse.next();
    }

    if (pathname.startsWith('/api/admin/')) {
      if (!isAuth) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Please sign in to access this resource' },
          { status: 401 }
        );
      }

      if (!isUserAdmin) {
        log.warn('Unauthorized admin API access attempt', { pathname, method, userId: token.id });
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    if (!isAuth) {
      log.warn('Unauthorized API access attempt', {
        pathname,
        method,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }

    log.debug('Authenticated API access', {
      pathname,
      method,
      userId: token.id,
      role: token.role,
    });
    return NextResponse.next();
  }

  // Admin Web Pages Protection
  if (isAdminRoute(req)) {
    if (!isAuth) {
      log.warn('Unauthenticated admin access attempt', {
        pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!isUserAdmin) {
      log.warn('Insufficient permissions for admin access', {
        pathname,
        userId: token.id,
        role: token.role,
        type: token.type || 'none',
      });
      return NextResponse.redirect(new URL('/admin/unauthorized', req.url));
    }

    log.debug('Admin access granted', {
      pathname,
      userId: token.id,
      role: token.role,
    });
    return NextResponse.next();
  }

  // Protected User Routes
  if (isProtectedRoute(req)) {
    if (!isAuth) {
      log.debug('Unauthenticated access to protected route, redirecting to login', { pathname });
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/settings')) {
      const expiredParam = req.nextUrl.searchParams.get('expired');
      if (expiredParam === 'true') {
        return NextResponse.redirect(new URL('/dashboard/settings?tab=membership&expired=true', req.url));
      }
    }

    log.debug('Protected route accessed', {
      pathname,
      userId: token.id,
      role: token.role,
    });
    return NextResponse.next();
  }

  const duration = Date.now() - startTime;
  if (duration > 100) {
    log.performance('proxy', duration, { pathname, method });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
};
