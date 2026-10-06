import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { log } from '@/lib/edge-logger';
import { isAuthorizedCronRequest } from '@/lib/auth/cronAuth';
import { CORRELATION_HEADER, resolveCorrelationId } from '@/lib/observability/correlation-id';

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
  '/legal',
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

/**
 * True only for a real static file request. API routes are never treated as static files, even when a
 * path segment contains a dot, so they always fall through to the authentication checks below.
 */
const isStaticAssetPath = (pathname: string): boolean => {
  if (pathname.startsWith('/api/')) return false;
  if (protectedRoutes.some((r) => pathname.startsWith(r))) return false;
  if (adminRoutes.some((r) => pathname.startsWith(r))) return false;
  return STATIC_EXTENSION.test(pathname);
};

// ── Cron authentication ────────────────────────────────────────────────────
//
// `/api/cron/*` is machine-to-machine and carries no session cookie, so the normal `!isAuth` branch
// rejected every trigger with 401 *before* the route handler's own CRON_SECRET check could run. The
// request is authenticated instead of the user; route handlers keep their own check as defence in depth.
// See `src/lib/auth/cronAuth.ts`. If no secret is configured the request is still rejected, which is
// exactly the previous behaviour — the only change is that a correct token now gets through.
const cronApiRoutes = ['/api/cron'];

/**
 * Extensions that are genuinely static files. Matching on an explicit list (rather than "contains a
 * dot") is what closes the bypass: `/api/some.route.json` is a route, not a file.
 */
const STATIC_EXTENSION =
  /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|txt|xml|pdf|mp4|webm|mp3|wav)$/;

function getPublicOrigin(req: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      const url = envUrl.startsWith('http://') || envUrl.startsWith('https://')
        ? envUrl
        : `https://${envUrl}`;
      return new URL(url).origin;
    } catch {
      // Fallback if NEXTAUTH_URL is malformed
    }
  }
  return req.nextUrl.origin;
}

export default async function proxy(req: NextRequest) {
  const startTime = Date.now();
  const pathname = req.nextUrl.pathname;
  const method = req.method;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isAdminHost = host.startsWith('admin.') || host.includes('admin.localhost');

  /*
    Correlation ID — the entry point of the request → queue → worker trace.

    A sane inbound `x-correlation-id` (e.g. minted by the CDN or a load test) is reused, otherwise a
    fresh one is minted here. Every response below is tagged with it, the header is also forwarded
    downstream so route handlers can persist it on the queue documents they write, and it is included
    in the security log lines so a rejected request can be joined to the request that followed it.

    The proxy runs in the edge runtime, so it cannot open an AsyncLocalStorage context — that is what
    `lib/observability/correlation.ts` does on the Node side. Here, explicit passing is the mechanism.
  */
  const correlationId = resolveCorrelationId(req.headers.get(CORRELATION_HEADER));
  const downstreamHeaders = new Headers(req.headers);
  downstreamHeaders.set(CORRELATION_HEADER, correlationId);

  const tag = <T extends NextResponse>(res: T): T => {
    res.headers.set(CORRELATION_HEADER, correlationId);
    return res;
  };
  const pass = () => tag(NextResponse.next({ request: { headers: downstreamHeaders } }));
  const json = (body: any, init?: ResponseInit) => tag(NextResponse.json(body, init));
  const redirect = (url: URL) => tag(NextResponse.redirect(url));
  const rewrite = (url: URL) => tag(NextResponse.rewrite(url));
  const ctx = (extra: Record<string, any> = {}) => ({ correlationId, ...extra });

  // Skip static assets and internal Next.js assets.
  //
  // This used to be a blanket `pathname.includes('.')`, which meant *any* URL containing a dot skipped
  // every check below it — `/dashboard.foo.json`, `/api/cvs/x.json`, `/admin/export.csv` all bypassed
  // authentication entirely. A dot is now only honoured on the final path segment, never on an API or
  // protected route, and only for a known static file extension.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    isStaticAssetPath(pathname)
  ) {
    return pass();
  }

  // Fail closed if the JWT secret is missing
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    log.error('NEXTAUTH_SECRET is not set; denying request', undefined, { pathname, method });
    return json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Handle Admin Subdomain Rewriting (admin.buildairesume.com / admin.localhost)
  if (isAdminHost) {
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      return rewrite(url);
    }
    if (pathname === '/login') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return rewrite(url);
    }
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = `/admin/${pathname.replace(/^\//, '')}`;
      return rewrite(url);
    }
  }

  // `/studio` used to have a blanket `startsWith` bypass here, before every auth check. It was
  // redundant — `/studio` is already in `publicRoutes`, which is checked just below — and it would
  // have made any future `/studio/*` API route public by construction. Removed rather than kept "just
  // in case": there is no `src/app/studio` route today, so nothing relied on it.

  if (isPublicRoute(req)) {
    log.debug('Public route accessed', { pathname, method });
    return pass();
  }

  const token = await getToken({ req, secret });
  const isAuth = !!token;
  const isUserAdmin = token?.type === 'admin' || token?.role === 'admin' || token?.role === 'superadmin';

  // API Routes Protection
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) {
      log.debug('Auth API route accessed', { pathname, method });
      return pass();
    }

    const publicApiRoutes = [
      // Public because these are called before sign-in (or are genuinely public surfaces).
      '/api/cvs/onboarding',
      '/api/public',
      '/api/webhooks',          // Stripe/Razorpay verify their own signatures
      '/api/health',
      '/api/cv/parse',
      '/api/cv-draft/save',     // guest draft autosave (anonymous session id)
      '/api/cv-draft/load',
      '/api/cv/analysis-snapshot',
      '/api/pricing-plans',
      '/api/pricing',
      '/api/check-email',
      '/api/testimonials',
      // REMOVED from the public list — every handler resolves the user itself and would otherwise be
      // reachable with no session at all:
      //   '/api/cvs'                (bare prefix covered all 15 CV routes, two of which trusted a
      //                              caller-supplied userId — see the metadata/surgeon-analysis fixes)
      //   '/api/user/onboarding'    (self-checks via getAuthenticatedUser)
      //   '/api/user/subscription'  (billing data; self-checks)
      //   '/api/activity-log'       (self-checks via getServerSession)
    ];

    if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
      log.debug('Public API route accessed', { pathname, method });
      return pass();
    }

    if (cronApiRoutes.some((route) => pathname.startsWith(route))) {
      if (isAuthorizedCronRequest(req.headers)) {
        log.debug('Authorised cron API access', { pathname, method });
        return pass();
      }

      log.warn('Rejected cron API request with invalid credentials', ctx({
        pathname,
        method,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      }));
      return json(
        { error: 'UNAUTHORIZED', message: 'Invalid or missing cron credentials' },
        { status: 401 }
      );
    }

    if (pathname.startsWith('/api/admin/')) {
      if (!isAuth) {
        return json(
          { error: 'UNAUTHORIZED', message: 'Please sign in to access this resource' },
          { status: 401 }
        );
      }

      if (!isUserAdmin) {
        log.warn('Unauthorized admin API access attempt', ctx({ pathname, method, userId: token.id }));
        return json(
          { error: 'FORBIDDEN', message: 'Admin access required' },
          { status: 403 }
        );
      }
      return pass();
    }

    if (!isAuth) {
      log.warn('Unauthorized API access attempt', ctx({
        pathname,
        method,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      }));
      return json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }

    log.debug('Authenticated API access', ctx({
      pathname,
      method,
      userId: token.id,
      role: token.role,
    }));
    return pass();
  }

  // Admin Web Pages Protection
  if (isAdminRoute(req)) {
    if (!isAuth) {
      log.warn('Unauthenticated admin access attempt', ctx({
        pathname,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      }));
      const origin = getPublicOrigin(req);
      const loginUrl = new URL('/admin/login', origin);
      const callbackUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, origin).toString();
      loginUrl.searchParams.set('callbackUrl', callbackUrl);
      return redirect(loginUrl);
    }

    if (!isUserAdmin) {
      log.warn('Insufficient permissions for admin access', ctx({
        pathname,
        userId: token.id,
        role: token.role,
        type: token.type || 'none',
      }));
      const origin = getPublicOrigin(req);
      return redirect(new URL('/admin/unauthorized', origin));
    }

    log.debug('Admin access granted', {
      pathname,
      userId: token.id,
      role: token.role,
    });
    return pass();
  }

  // Protected User Routes
  if (isProtectedRoute(req)) {
    if (!isAuth) {
      log.debug('Unauthenticated access to protected route, redirecting to login', { pathname });
      const origin = getPublicOrigin(req);
      return redirect(new URL('/sign-in', origin));
    }

    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const origin = getPublicOrigin(req);
      return redirect(new URL('/dashboard/jobs', origin));
    }

    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/settings')) {
      const expiredParam = req.nextUrl.searchParams.get('expired');
      if (expiredParam === 'true') {
        const origin = getPublicOrigin(req);
        return redirect(new URL('/dashboard/settings?tab=membership&expired=true', origin));
      }
    }

    log.debug('Protected route accessed', {
      pathname,
      userId: token.id,
      role: token.role,
    });
    return pass();
  }

  const duration = Date.now() - startTime;
  if (duration > 100) {
    log.performance('proxy', duration, { pathname, method });
  }

  return pass();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
};
