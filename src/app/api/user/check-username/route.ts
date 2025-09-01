import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username can only contain letters, numbers, hyphens, and underscores',
          available: false 
        },
        { status: 400 }
      );
    }

    // Check username length
    if (username.length < 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username must be at least 3 characters long',
          available: false 
        },
        { status: 400 }
      );
    }

    if (username.length > 30) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username cannot exceed 30 characters',
          available: false 
        },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      email: { $ne: session.user.email } // Exclude current user
    });

    const isAvailable = !existingUser;

    return NextResponse.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    });

  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
