import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Extension token request received');
    
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    console.log('✅ Valid session found for:', session.user.email);
    
    await getConnection();
    
    // Find the user in the database
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ User found in database:', user._id);
    
    // Create a JWT token for the extension
    const extensionToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        type: 'extension'
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '30d' } // Token valid for 30 days
    );
    
    console.log('✅ Extension token created');
    
    return NextResponse.json({
      success: true,
      token: extensionToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
      }
    });
    
  } catch (error: any) {
    console.error('❌ Extension token error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create extension token' },
      { status: 500 }
    );
  }
}