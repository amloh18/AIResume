import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: authResult.userEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // For now, return default connected apps
    // In a real application, you would query an integrations collection
    const connectedApps = [
      {
        id: '1',
        name: 'Google',
        provider: 'google',
        connected: !!user.firebaseUid, // Check if user has Firebase UID (Google auth)
        lastSynced: user.updatedAt?.toISOString(),
        scopes: ['profile', 'email'],
      },
      {
        id: '2',
        name: 'Microsoft',
        provider: 'microsoft',
        connected: false,
        scopes: ['profile', 'email', 'calendar'],
      },
      {
        id: '3',
        name: 'Slack',
        provider: 'slack',
        connected: false,
        scopes: ['channels:read', 'chat:write'],
      },
    ];

    return NextResponse.json({
      success: true,
      apps: connectedApps
    });

  } catch (error) {
    console.error('Error fetching connected apps:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
