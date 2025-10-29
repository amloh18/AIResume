import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import User from '@/models/User'
import connectDB from '@/lib/database'

const JWT_SECRET = process.env.JWT_SECRET || '12626db0bdab7694da7152d2c76b07c1c9acc71571f1134ca832085d3dce5b11'

export interface User {
  id: string
  email: string
  name: string
  type: 'user' | 'admin'
  role?: string
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  error?: string
}

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    await connectDB()

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .lean()

    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Check if user has a password
    if (!user.password) {
      return {
        success: false,
        error: 'Please sign in with Google'
      }
    }

    // Verify password
    const userDoc = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!userDoc) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    const isPasswordValid = await userDoc.comparePassword(password)

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return {
        success: false,
        error: 'Please verify your email before signing in'
      }
    }

    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email, 
        name: `${user.firstName} ${user.lastName}`,
        type: user.role === 'admin' || user.role === 'superadmin' ? 'admin' : 'user', 
        role: user.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        type: user.role === 'admin' || user.role === 'superadmin' ? 'admin' : 'user',
        role: user.role || 'user'
      },
      token
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

export async function verifyToken(token: string): Promise<AuthResult> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    await connectDB()
    
    const user = await User.findById(decoded.id).lean()
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        type: user.role === 'admin' || user.role === 'superadmin' ? 'admin' : 'user',
        role: user.role || 'user'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid token'
    }
  }
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult | null> {
  try {
    // Check for token in Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      return await verifyToken(token)
    }

    // Check for token in cookies
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      return await verifyToken(token)
    }

    return null
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  })
  return response
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0
  })
  return response
}
