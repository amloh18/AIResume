import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
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
      await getConnection();
      const email = String(session.user.email).toLowerCase();
      
      // Check User collection first
      let dbUser = await User.findOne({ email });
      
      // If not found in User collection, check AdminAuth collection
      if (!dbUser) {
        const AdminAuth = (await import('@/models/AdminAuth')).default;
        const adminUser = await AdminAuth.findOne({ email }).lean().exec() as any;
        
        if (adminUser) {
          // Map AdminAuth user to the expected user format
          dbUser = {
            ...adminUser,
            _id: adminUser._id,
            firstName: 'Admin',
            lastName: 'User',
            role: adminUser.role || 'admin',
          } as any;
          
          return {
            user: dbUser,
            userEmail: dbUser.email,
            userId: dbUser._id.toString(),
          };
        }
      }
      
      if (dbUser) {
        return {
          user: JSON.parse(JSON.stringify(dbUser)),
          userEmail: dbUser.email,
          userId: dbUser._id.toString(),
        };
      }
      
      const fullName = typeof session.user.name === 'string' ? session.user.name.trim() : '';
      const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
      const fallbackFirstName = email.split('@')[0] || 'User';
      const firstName = nameParts[0] || fallbackFirstName;
      const lastName = nameParts.slice(1).join(' ') || 'User';
      const authProviderId = String((session.user as any).id || email);

      dbUser = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            email,
            firstName,
            lastName,
            authProvider: 'nextauth',
            authProviderId,
            isEmailVerified: true,
            avatar: (session.user as any).image || null
          }
        },
        { new: true, upsert: true }
      );

      if (!dbUser) return null;

      return {
        user: JSON.parse(JSON.stringify(dbUser)),
        userEmail: dbUser.email,
        userId: dbUser._id.toString(),
      };
    }

    // Check for anonymous user session
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const anonymousToken = cookieStore.get('buildairesume_anonymous_token')?.value;
      
      if (anonymousToken) {
        console.log('👤 Auth - Anonymous token found:', anonymousToken.substring(0, 8));
        await getConnection();
        
        const anonUser = await User.findOne({ 
          anonymousToken, 
          isAnonymous: true 
        });
        
        if (anonUser) {
          return {
            user: anonUser,
            userEmail: anonUser.email,
            userId: anonUser._id.toString(),
          };
        }
      }
    } catch (cookieError) {
      // Ignore errors in environments where cookies are not available (e.g. some build scripts)
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
