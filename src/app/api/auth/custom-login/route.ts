import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, setAuthCookie } from '@/lib/custom-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await authenticateUser(email, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: 'Login successful'
    })

    if (result.token) {
      setAuthCookie(response, result.token)
    }

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
