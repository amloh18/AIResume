import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth-config'
import { UnifiedAuthService } from '@/lib/auth/unified-auth-service'

/**
 * Logout endpoint using NextAuth
 * Replaces the old custom-auth logout endpoint
 * 
 * Note: NextAuth also has a built-in /api/auth/signout endpoint,
 * but this endpoint is kept for backward compatibility with clients
 * that may be calling /api/auth/custom-logout
 */
export async function POST(request: Request) {
  try {
    // Get session to invalidate cache
    const session = await getServerSession(authConfig)
    
    // Invalidate user cache and log if session exists
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
            metadata: { logoutMethod: 'api' }
          });
        } else {
          await ActivityLogService.logUserAction({
            userId: session.user.id as string,
            userEmail: session.user.email || undefined,
            action: 'user_logout',
            status: 'success',
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
            metadata: { logoutMethod: 'api' }
          });
        }
      } catch (logError) {
        console.error('Failed to log logout activity:', logError);
      }

      try {
        const { getPostHogClient } = await import('@/lib/posthog-server');
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: session.user.id as string,
          event: 'user_signed_out',
          properties: { email: session.user.email ?? undefined },
        });
      } catch (phError) {
        console.error('PostHog capture error (user_signed_out):', phError);
      }

      await UnifiedAuthService.invalidateUserCache(session.user.id as string)
    }

    // NextAuth handles cookie clearing automatically through its signout endpoint
    // This endpoint just returns success - actual logout should use NextAuth's signOut
    return NextResponse.json({
      success: true,
      message: 'Logout successful. Please use NextAuth signOut for complete logout.'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
