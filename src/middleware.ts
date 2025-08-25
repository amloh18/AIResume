import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Define route categories
  const publicRoutes = ['/', '/auth/signin', '/auth/signup'];
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

  // Allow public routes
  if (publicRoutes.includes(pathname) || publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      
      if (!token) {
        const callbackUrl = encodeURIComponent(pathname);
        return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
    }
  }

  return NextResponse.next();
}

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