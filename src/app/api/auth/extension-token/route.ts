import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Extension Token API - Generating JWT token');
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('❌ Extension Token - No valid session found');
      return NextResponse.json(
        { success: false, message: 'No valid session found' },
        { status: 401 }
      );
    }
    
    console.log('✅ Extension Token - Session found for user:', session.user.id);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' } // Token valid for 7 days
    );
    
    console.log('✅ Extension Token - JWT token generated');
    
    return NextResponse.json({
      success: true,
      message: 'Token generated successfully',
      token: token,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      }
    });
    
  } catch (error) {
    console.error('❌ Extension Token - Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET(request: NextRequest) {
  return POST(request);
}
