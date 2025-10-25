import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

export interface UnifiedAuthResult {
  user: any;
  userEmail: string;
  userId: string;
  isNextAuth: boolean;
  isFirebase: boolean;
}

/**
 * Unified authentication helper that handles both NextAuth and Firebase authentication
 * Returns user information regardless of authentication method
 */
export async function getUnifiedAuth(request: NextRequest): Promise<UnifiedAuthResult | null> {
  try {
    // First, try NextAuth session
    const session = await getServerSession(authOptions);
    
    if (session?.user?.email) {
      console.log('✅ Unified Auth - NextAuth session found:', session.user.email);
      return {
        user: session.user,
        userEmail: session.user.email,
        userId: session.user.id || session.user.email,
        isNextAuth: true,
        isFirebase: false
      };
    }

    // If no NextAuth session, try Firebase authentication
    const authHeader = request.headers.get('authorization');
    const firebaseUserId = request.headers.get('x-firebase-user-id');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const firebaseToken = authHeader.substring(7);
      try {
        const decodedToken = await verifyFirebaseToken(firebaseToken);
        if (decodedToken) {
          console.log('✅ Unified Auth - Firebase token verified:', decodedToken.uid);
          
          // Get user from database
          await connectDB();
          const firebaseUser = await User.findOne({ firebaseUid: decodedToken.uid });
          
          if (firebaseUser) {
            return {
              user: firebaseUser,
              userEmail: firebaseUser.email,
              userId: firebaseUser._id.toString(),
              isNextAuth: false,
              isFirebase: true
            };
          }
        }
      } catch (error) {
        console.log('❌ Unified Auth - Firebase token verification failed:', error);
      }
    }

    // Try Firebase user ID from headers
    if (firebaseUserId) {
      console.log('✅ Unified Auth - Firebase user ID found in headers:', firebaseUserId);
      
      await connectDB();
      const firebaseUser = await User.findOne({ firebaseUid: firebaseUserId });
      
      if (firebaseUser) {
        return {
          user: firebaseUser,
          userEmail: firebaseUser.email,
          userId: firebaseUser._id.toString(),
          isNextAuth: false,
          isFirebase: true
        };
      }
    }

    console.log('❌ Unified Auth - No valid authentication found');
    return null;

  } catch (error) {
    console.error('❌ Unified Auth - Error during authentication:', error);
    return null;
  }
}

/**
 * Middleware helper to check authentication and return appropriate response
 */
export async function requireAuth(request: NextRequest): Promise<UnifiedAuthResult | Response> {
  const authResult = await getUnifiedAuth(request);
  
  if (!authResult) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return authResult;
}
