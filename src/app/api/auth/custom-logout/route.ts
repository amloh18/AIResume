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
export async function POST() {
  try {
    // Get session to invalidate cache
    const session = await getServerSession(authConfig)
    
    // Invalidate user cache if session exists
    if (session?.user?.id) {
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
