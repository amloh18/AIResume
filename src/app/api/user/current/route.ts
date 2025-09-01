import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Try to get user from NextAuth session first
    const session = await getServerSession(authOptions);
    
    if (session?.user?.email) {
      console.log('🔍 /api/user/current - Found NextAuth session for email:', session.user.email);
      
      // Find user by email
      const user = await User.findOne({ email: session.user.email });
      if (user) {
        console.log('✅ /api/user/current - Found user via NextAuth session');
        return NextResponse.json({
          success: true,
          user: {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role
          }
        });
      }
    }
    
    // If no NextAuth session, try to get user from Firebase auth header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔍 /api/user/current - Checking Firebase token');
      
      try {
        // For now, we'll try to find the user by checking if they have a Firebase UID
        // In a production app, you'd verify the Firebase token here
        const user = await User.findOne({ firebaseUid: token });
        if (user) {
          console.log('✅ /api/user/current - Found user via Firebase UID');
          return NextResponse.json({
            success: true,
            user: {
              id: user._id.toString(),
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              role: user.role
            }
          });
        }
      } catch (firebaseError) {
        console.error('❌ /api/user/current - Firebase token verification failed:', firebaseError);
      }
    }
    
    // If no session or Firebase token, try to get user from query parameter (for development)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      console.log('🔍 /api/user/current - Checking user ID from query param:', userId);
      
      try {
        // Validate if it's a MongoDB ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(userId)) {
          const user = await User.findById(userId);
          if (user) {
            console.log('✅ /api/user/current - Found user via ObjectId');
            return NextResponse.json({
              success: true,
              user: {
                id: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role
              }
            });
          }
        }
      } catch (objectIdError) {
        console.error('❌ /api/user/current - ObjectId validation failed:', objectIdError);
      }
    }
    
    console.log('❌ /api/user/current - No valid authentication found');
    return NextResponse.json(
      { success: false, error: 'No valid authentication found' },
      { status: 401 }
    );

  } catch (error) {
    console.error('❌ /api/user/current - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
