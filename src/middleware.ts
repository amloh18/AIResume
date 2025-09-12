import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(req: NextRequest) {
  console.log('🚀 Middleware triggered for:', req.nextUrl.pathname);
  const { pathname } = req.nextUrl;
  
  // Define route categories
  const publicRoutes = [
    '/',
    '/auth',
    '/auth/signin',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/callback',
    '/auth/error',
    '/privacy-policy',
    '/terms',
    '/cookie-policy'
  ];
  
  const protectedRoutes = [
    '/dashboard',
    '/studio',
    '/profile',
    '/onboarding',
    '/onboarding-universal',
    '/admin'
  ];
  
  const apiRoutes = [
    '/api/auth',
    '/api/parse-job',
    '/api/jobs/parsed',
    '/api/templates',
    '/api/snippets',
    '/api/health',
    '/api/cv/parse',
    '/api/test-file-upload',
    '/api/test-parsing',
    '/api/user',
    '/api/checkout',
    '/api/ai',
    '/api/ats',
    '/api/admin',
    '/api/billing'
  ];

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/public') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('.') // Allow files with extensions
  ) {
    console.log('✅ Middleware - Allowing static asset:', pathname);
    return NextResponse.next();
  }

  // Allow all API routes (they handle their own auth)
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    console.log('✅ Middleware - Allowing API route:', pathname);
    return NextResponse.next();
  }

  // Check if this is a public route first
  if (publicRoutes.includes(pathname) || publicRoutes.some(route => pathname.startsWith(route))) {
    console.log('✅ Middleware - Allowing public route:', pathname);
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    console.log('🔍 Middleware - Checking authentication for protected route:', pathname);
    
    try {
      // Check for NextAuth JWT token (Firebase-based authentication)
      const nextAuthToken = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
      });
      
      if (nextAuthToken && nextAuthToken.email) {
        console.log('✅ Middleware - NextAuth authentication successful for:', nextAuthToken.email);
        
        // Check if user is admin and redirect to admin dashboard
        if (nextAuthToken.role === 'admin' && pathname === '/dashboard') {
          console.log('🔄 Middleware - Admin user detected, redirecting to admin dashboard');
          return NextResponse.redirect(new URL('/admin', req.url));
        }
        
        return NextResponse.next();
      }
      
      // If no valid authentication found, redirect to sign in
      console.log('❌ Middleware - No valid authentication found, redirecting to sign in');
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
      
    } catch (error) {
      console.error('❌ Middleware - Auth verification error:', error);
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
    }
  }

  // Allow all other routes (fallback)
  console.log('✅ Middleware - Allowing other route:', pathname);
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