import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Simple admin authentication without NextAuth
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Simple admin check
    if (email === 'admin@cvcircle.io' && password === 'admin123') {
      // Create a simple JWT token
      const token = jwt.sign(
        {
          id: 'admin-1',
          email: 'admin@cvcircle.io',
          name: 'Admin User',
          role: 'superadmin',
          type: 'admin',
        },
        process.env.NEXTAUTH_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      // Set cookie
      const cookieStore = cookies();
      cookieStore.set('admin-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      return NextResponse.json({
        success: true,
        user: {
          id: 'admin-1',
          email: 'admin@cvcircle.io',
          name: 'Admin User',
          role: 'superadmin',
          type: 'admin',
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
