import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth-config';

/**
 * NextAuth API Route Handler
 * 
 * This is the catch-all route for NextAuth.js authentication.
 * All authentication requests are handled by this route, including:
 * - /api/auth/callback/credentials
 * - /api/auth/callback/passwordless
 * - /api/auth/callback/google
 * - /api/auth/session
 * - /api/auth/csrf
 * - /api/auth/providers
 * - And all other NextAuth endpoints
 * 
 * Configuration is centralized in @/lib/auth-config.ts
 * 
 * Note: NextAuth v4.24.13 with Next.js 16 App Router requires both GET and POST exports
 * to handle all authentication flows including callbacks.
 * 
 * The catch-all pattern [...nextauth] matches all routes under /api/auth/*
 */
const handler = NextAuth(authConfig);

// Export handlers for all HTTP methods that NextAuth supports
// This is the correct pattern for Next.js 16 App Router with NextAuth v4
export { handler as GET, handler as POST };
