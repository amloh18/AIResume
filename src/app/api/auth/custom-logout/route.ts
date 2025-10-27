import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/custom-auth'

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    })

    clearAuthCookie(response)
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
