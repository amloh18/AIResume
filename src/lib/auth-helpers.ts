import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

/**
 * Authentication result interface
 * Simplified to only support NextAuth authentication
 */
export interface AuthResult {
  user: any;
  userEmail: string;
  userId: string;
}

/**
 * Get authenticated user from NextAuth session
 * 
 * This replaces the old unified auth system that supported both Firebase and NextAuth.
 * Now only NextAuth is supported for authentication.
 * 
 * @param request - NextRequest object (optional, for future use)
 * @returns AuthResult | null
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<AuthResult | null> {
  try {
    // Get NextAuth session - getServerSession works automatically with cookies in App Router
    // The request parameter is optional but we log if it's missing
    const session = await getServerSession(authConfig);
    
    if (session?.user?.email) {
      console.log('✅ Auth - NextAuth session found:', session.user.email);
      
      // Get full user data from database if needed
      // Note: connectDB is idempotent, safe to call multiple times
      await getConnection();
      const dbUser = await User.findOne({ email: session.user.email });
      
      if (dbUser) {
        return {
          user: dbUser,
          userEmail: dbUser.email,
          userId: dbUser._id.toString(),
        };
      }
      
      // If user not in database yet (shouldn't happen), return session data
      console.warn('⚠️ Auth - User in session but not found in database:', session.user.email);
      return {
        user: session.user,
        userEmail: session.user.email,
        userId: session.user.id || session.user.email,
      };
    }

    console.log('❌ Auth - No valid authentication found');
    return null;

  } catch (error) {
    console.error('❌ Auth - Error during authentication:', error);
    if (error instanceof Error) {
      console.error('❌ Auth - Error message:', error.message);
      console.error('❌ Auth - Error stack:', error.stack);
    }
    return null;
  }
}


/**
 * Middleware helper to check authentication and return appropriate response
 * 
 * @param request - NextRequest object
 * @returns AuthResult if authenticated, or Response with 401 error
 */
export async function requireAuth(request?: NextRequest): Promise<AuthResult | Response> {
  const authResult = await getAuthenticatedUser(request);
  
  if (!authResult) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return authResult;
}
