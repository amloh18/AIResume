import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { User } from '@/models';
import connectDB from '@/lib/database';
import type { MyJwtPayload } from '@/types/jwt-payload';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Extension Auth Verify API - Verifying JWT token');
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Extension Auth - No Bearer token provided');
      return NextResponse.json(
        { success: false, message: 'No Bearer token provided' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    let decoded: MyJwtPayload;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      console.log('❌ Extension Auth - Invalid JWT token:', jwtError);
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    if (!decoded || !decoded.userId) {
      console.log('❌ Extension Auth - Invalid token payload');
      return NextResponse.json(
        { success: false, message: 'Invalid token payload' },
        { status: 401 }
      );
    }
    
    console.log('✅ Extension Auth - JWT token verified for user:', decoded.userId);
    
    // Connect to database
    await connectDB();
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ Extension Auth - User not found in database');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Extension Auth - User verified:', user.email);
    
    // Return user data (without sensitive information)
    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    return NextResponse.json({
      success: true,
      message: 'Token verified successfully',
      user: userData
    });
    
  } catch (error) {
    console.error('❌ Extension Auth - Error:', error);
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
