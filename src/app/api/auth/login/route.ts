import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Custom user authentication API (bypassing NextAuth)
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    // Simple user authentication (expand this with your user database)
    if (email === 'user@cvcircle.io' && password === 'user123') {
      // Create JWT token
      const token = jwt.sign(
        {
          id: 'user-1',
          email: 'user@cvcircle.io',
          name: 'Test User',
          role: 'user',
          type: 'user',
        },
        process.env.NEXTAUTH_SECRET || 'QrlFqkmclModrwr9PRNbSBS3UFt2re6fGooJEcF5FBs=',
        { expiresIn: '24h' }
      );

      // Set cookie
      const cookieStore = cookies();
      cookieStore.set('user-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      return NextResponse.json({
        success: true,
        user: {
          id: 'user-1',
          email: 'user@cvcircle.io',
          name: 'Test User',
          role: 'user',
          type: 'user',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });

  } catch (error) {
    console.error('User login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
