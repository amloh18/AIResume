import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Define route categories
    const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/cv-onboarding'];
    const protectedRoutes = ['/dashboard', '/studio'];
    const apiRoutes = [
      '/api/auth',
      '/api/parse-job',
      '/api/jobs/parsed',
      '/api/templates',
      '/api/snippets',
      '/api/health',
      '/api/cv/parse',
      '/api/test-file-upload',
      '/api/test-parsing'
    ];

    // Allow all API routes
    if (apiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Allow static assets
    if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
      return NextResponse.next();
    }

    // Handle authenticated users trying to access landing page
    if (token && pathname === '/') {
      // Redirect authenticated users away from landing page
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Handle unauthenticated users trying to access protected routes
    if (!token && protectedRoutes.some(route => pathname.startsWith(route))) {
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Define route categories
        const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/cv-onboarding'];
        const protectedRoutes = ['/dashboard', '/studio'];
        const apiRoutes = [
          '/api/auth',
          '/api/parse-job',
          '/api/jobs/parsed',
          '/api/templates',
          '/api/snippets',
          '/api/health',
          '/api/cv/parse',
          '/api/test-file-upload',
          '/api/test-parsing'
        ];

        // Allow all API routes
        if (apiRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // Allow static assets
        if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
          return true;
        }

        // Allow public routes
        if (publicRoutes.includes(pathname) || publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // Require authentication for protected routes
        if (protectedRoutes.some(route => pathname.startsWith(route))) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};