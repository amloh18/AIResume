import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { UnifiedAuthService } from '@/lib/auth/unified-auth-service';
import { SessionService } from '@/lib/services/session-service';

/**
 * Custom signout endpoint that handles empty request bodies gracefully
 * 
 * This wraps NextAuth's signout functionality to prevent JSON parsing errors
 * when the client sends an empty body or no body at all.
 */
export async function POST(request: NextRequest) {
  try {
    // Get session to invalidate cache and log logout
    const session = await getServerSession(authConfig);
    
    // Best-effort logging/cache/telemetry. This work must NEVER delay or block
    // the cookie-clearing response below: if Mongo/PostHog/Redis is slow or
    // hangs, the client would never receive the Set-Cookie headers that end
    // the session, leaving the user signed in with a dead Sign Out button.
    if (session?.user?.id) {
      const sessionUserId = session.user.id as string;
      const sessionWork = (async () => {
      try {
        const { ActivityLogService } = await import('@/lib/services/activityLogService');
        const user = session.user as any;
        const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';
        
        if (isAdmin) {
          await ActivityLogService.logAdminAction({
            adminUserId: sessionUserId,
            adminEmail: session.user.email || undefined,
            action: 'admin_logout',
            actionType: 'authentication',
            status: 'success',
            metadata: {
              logoutMethod: 'api'
            }
          });
        } else {
          await ActivityLogService.logUserAction({
            userId: sessionUserId,
            userEmail: session.user.email || undefined,
            action: 'user_logout',
            status: 'success',
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      undefined,
            metadata: {
              logoutMethod: 'api'
            }
          });
        }
      } catch (logError) {
        // Don't fail signout if logging fails
        console.error('Failed to log logout activity:', logError);
      }
      
      await UnifiedAuthService.invalidateUserCache(sessionUserId);

      // Revoke the login session from MongoDB
      try {
        // Extract jti from the JWT token in the request cookie
        const cookieHeader = request.headers.get('cookie') || '';
        const tokenMatch = cookieHeader.match(/(?:__Secure-)?next-auth\.session-token=([^;]+)/);
        if (tokenMatch?.[1]) {
          const parts = tokenMatch[1].split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            if (payload.jti) {
              await SessionService.revokeSession(payload.jti);
            }
          }
        }
      } catch (sessionError) {
        // Don't fail signout if session revocation fails
        console.error('Failed to revoke session on signout:', sessionError);
      }

      // Track sign-out server-side
      try {
        const { getPostHogClient } = await import('@/lib/posthog-server');
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: sessionUserId,
          event: 'user_signed_out',
          properties: {
            email: session.user.email ?? undefined,
          },
        });
      } catch (phError) {
        console.error('PostHog capture error (user_signed_out):', phError);
      }
      })();

      // Cap the wait on side-effect work: respond with the cookie-clearing
      // headers even if logging/cache/telemetry is stuck.
      await Promise.race([
        sessionWork,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Sign out successful'
    });

    // Explicitly clear all NextAuth cookies.
    // IMPORTANT: cookie names must cover BOTH the secure-prefixed and
    // non-prefixed variants. The auth config names the session cookie
    // `__Secure-next-auth.session-token` only when NODE_ENV === 'production'
    // AND NEXTAUTH_URL starts with https:// — deriving the name from
    // NODE_ENV alone can mismatch the cookie actually set (e.g. production
    // running without an https NEXTAUTH_URL), leaving the user signed in.
    // Deleting a non-existent cookie is a harmless no-op, so we clear every
    // variant, including chunked session tokens (.0, .1, ...) which NextAuth
    // uses when the JWT exceeds the per-cookie size limit.
    const useSecureCookies =
      process.env.NODE_ENV === 'production' &&
      (process.env.NEXTAUTH_URL || '').startsWith('https://');
    const securePrefix = '__Secure-';
    const baseNames = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
    ];

    const cookieNames = new Set<string>();
    baseNames.forEach((base) => {
      cookieNames.add(base);
      cookieNames.add(`${securePrefix}${base}`);
      // Chunked session-token variants (NextAuth chunking)
      if (base.endsWith('.session-token')) {
        for (let i = 0; i < 4; i++) {
          cookieNames.add(`${base}.${i}`);
          cookieNames.add(`${securePrefix}${base}.${i}`);
        }
      }
    });

    const expires = new Date(0);
    cookieNames.forEach((cookieName) => {
      response.cookies.set(cookieName, '', {
        expires,
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: 'lax',
        path: '/',
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

