import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/custom-auth'

export async function GET(request: NextRequest) {
  try {
    const result = await getAuthenticatedUser(request)

    if (!result || !result.success) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
