import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models';
import connectDB from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Auth Verify API - Verifying token');
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('❌ Auth Verify API - No valid session found');
      return NextResponse.json(
        { success: false, message: 'No valid session found' },
        { status: 401 }
      );
    }
    
    console.log('✅ Auth Verify API - Session found for user:', session.user.id);
    
    // Connect to database
    await connectDB();
    
    // Get user from database
    const user = await User.findById(session.user.id);
    
    if (!user) {
      console.log('❌ Auth Verify API - User not found in database');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Auth Verify API - User verified:', user.email);
    
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
    console.error('❌ Auth Verify API - Error:', error);
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
