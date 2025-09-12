import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User } from '@/models';

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const { idToken, user } = await request.json();

    if (!idToken || !user) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: user.email });

    if (existingUser) {
      // Update existing user with Firebase info
      existingUser.firebaseUid = user.uid;
      existingUser.avatar = user.photoURL || existingUser.avatar;
      existingUser.isEmailVerified = true;
      await existingUser.save();

      const userResponse = {
        success: true,
        user: {
          id: existingUser._id.toString(), // Convert ObjectId to string
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role,
          avatar: existingUser.avatar,
          firebaseUid: existingUser.firebaseUid
        }
      };
      
      console.log('🔍 Returning existing user:', userResponse);
      console.log('🔍 User ID type:', typeof existingUser._id);
      console.log('🔍 User ID value:', existingUser._id);
      console.log('🔍 User ID string:', existingUser._id.toString());
      console.log('🔍 User ID string length:', existingUser._id.toString().length);
      console.log('🔍 User ID is valid ObjectId:', /^[0-9a-fA-F]{24}$/.test(existingUser._id.toString()));
      
      return NextResponse.json(userResponse, { headers: corsHeaders });
    } else {
      // Create new user
      const newUser = new User({
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || 'User',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        avatar: user.photoURL,
        firebaseUid: user.uid,
        isEmailVerified: true,
        subscription: {
          plan: 'basic',
          status: 'active',
          startDate: new Date(),
          seats: 3,
          storageUsed: 0
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true
          }
        }
      });

      await newUser.save();

      const userResponse = {
        success: true,
        user: {
          id: newUser._id.toString(), // Convert ObjectId to string
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          avatar: newUser.avatar,
          firebaseUid: newUser.firebaseUid
        }
      };
      
      console.log('🔍 Returning new user:', userResponse);
      console.log('🔍 User ID type:', typeof newUser._id);
      console.log('🔍 User ID value:', newUser._id);
      console.log('🔍 User ID string:', newUser._id.toString());
      console.log('🔍 User ID string length:', newUser._id.toString().length);
      console.log('🔍 User ID is valid ObjectId:', /^[0-9a-fA-F]{24}$/.test(newUser._id.toString()));
      
      return NextResponse.json(userResponse, { headers: corsHeaders });
    }
  } catch (error) {
    console.error('Firebase auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}
