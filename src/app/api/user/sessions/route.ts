import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // For now, return current session as active session
    // In a real application, you would track multiple sessions
    const activeSessions = [
      {
        id: '1',
        device: 'Chrome on Windows 10',
        location: 'Current Location',
        lastActive: user.updatedAt?.toISOString() || new Date().toISOString(),
        current: true,
      }
    ];

    return NextResponse.json({
      success: true,
      sessions: activeSessions
    });

  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // In a real application, you would invalidate the specific session
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (error) {
    console.error('Error terminating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
