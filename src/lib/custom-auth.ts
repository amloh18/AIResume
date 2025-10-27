import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

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

// Simple user database (in production, this would be in MongoDB)
const users = [
  {
    id: 'user-1',
    email: 'user@cvcircle.io',
    password: 'user123', // In production, this would be hashed
    name: 'Test User',
    type: 'user' as const,
    role: 'user'
  },
  {
    id: 'admin-1',
    email: 'admin@cvcircle.io',
    password: 'admin123', // In production, this would be hashed
    name: 'Admin User',
    type: 'admin' as const,
    role: 'superadmin'
  }
]

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    const user = users.find(u => u.email === email && u.password === password)
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        type: user.type, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type,
        role: user.role
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
    
    const user = users.find(u => u.id === decoded.id)
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type,
        role: user.role
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
