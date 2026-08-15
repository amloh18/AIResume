import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'

/**
 * Session check endpoint using NextAuth
 * Replaces the old custom-auth session endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id || '',
        email: session.user.email || '',
        name: session.user.name || '',
        image: session.user.image || null,
        type: (session.user as any).type || 'user',
        role: (session.user as any).role || 'user',
      }
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
