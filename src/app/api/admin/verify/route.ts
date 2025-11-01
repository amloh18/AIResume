import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json({ success: false, error: 'No admin token found' }, { status: 401 });
    }

    try {
      // Verify the JWT token
      const decoded = jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
      
      return NextResponse.json({ 
        success: true, 
        user: { 
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          type: decoded.type
        } 
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 401 });
    }

  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}