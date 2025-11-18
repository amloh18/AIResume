import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { UnifiedAuthService } from '@/lib/auth/unified-auth-service';

/**
 * Custom signout endpoint that handles empty request bodies gracefully
 * 
 * This wraps NextAuth's signout functionality to prevent JSON parsing errors
 * when the client sends an empty body or no body at all.
 */
export async function POST(request: NextRequest) {
  try {
    // Get session to invalidate cache
    const session = await getServerSession(authConfig);
    
    // Invalidate user cache if session exists
    if (session?.user?.id) {
      await UnifiedAuthService.invalidateUserCache(session.user.id as string);
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Sign out successful'
    });

    // Explicitly clear all NextAuth cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieNames = [
      isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      isProduction ? '__Secure-next-auth.csrf-token' : 'next-auth.csrf-token',
      isProduction ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
    ];

    cookieNames.forEach(cookieName => {
      // Clear cookie with different domain/path combinations
      const domains = isProduction ? ['.cvcircle.io', 'cvcircle.io'] : [undefined];
      const paths = ['/', ''];

      domains.forEach(domain => {
        paths.forEach(path => {
          response.cookies.set(cookieName, '', {
            expires: new Date(0),
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: path || '/',
            ...(domain ? { domain } : {}),
          });
        });
      });
    });

    console.log('✅ Cleared NextAuth session cookies');

    return response;
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

