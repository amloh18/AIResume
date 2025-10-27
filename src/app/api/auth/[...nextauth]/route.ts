import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth-config';

/**
 * NextAuth API Route Handler
 * 
 * This is the catch-all route for NextAuth.js authentication.
 * All authentication requests are handled by this route.
 * 
 * Configuration is centralized in @/lib/auth-config.ts
 */
const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
