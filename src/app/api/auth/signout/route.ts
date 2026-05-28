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
    // Get session to invalidate cache and log logout
    const session = await getServerSession(authConfig);
    
    // Log logout activity before invalidating cache
    if (session?.user?.id) {
      try {
        const { ActivityLogService } = await import('@/lib/services/activityLogService');
        const user = session.user as any;
        const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';
        
        if (isAdmin) {
          await ActivityLogService.logAdminAction({
            adminUserId: session.user.id as string,
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
            userId: session.user.id as string,
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
      
      await UnifiedAuthService.invalidateUserCache(session.user.id as string);

      // Track sign-out server-side
      try {
        const { getPostHogClient } = await import('@/lib/posthog-server');
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: session.user.id as string,
          event: 'user_signed_out',
          properties: {
            email: session.user.email ?? undefined,
          },
        });
      } catch (phError) {
        console.error('PostHog capture error (user_signed_out):', phError);
      }
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
      // Clear cookie with standard path
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        httpOnly: true,
        secure: isProduction,
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

