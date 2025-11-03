import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import { CalendarService } from '@/lib/services/calendarService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    await getConnection();
    
    // Exchange code for tokens
    const tokens = await CalendarService.getTokensFromCode(code);
    
    // Get user identifier
    const userIdentifier = session.user.firebaseUid 
      ? { type: 'firebase', id: session.user.firebaseUid }
      : { type: 'userId', id: session.user.id };

    // Update user settings with calendar integration
    const updateData: any = {
      'advanced.integrations.calendar.connected': true,
      'advanced.integrations.calendar.provider': 'google',
      'advanced.integrations.calendar.accessToken': tokens.accessToken,
      'advanced.integrations.calendar.refreshToken': tokens.refreshToken,
      'advanced.integrations.calendar.lastSync': new Date(),
      'advanced.integrations.calendar.syncEnabled': true,
    };

    let userSettings;
    if (userIdentifier.type === 'firebase') {
      userSettings = await UserSettings.findOneAndUpdate(
        { firebaseUid: userIdentifier.id },
        { $set: updateData },
        { upsert: true, new: true }
      );
    } else {
      userSettings = await UserSettings.findOneAndUpdate(
        { userId: userIdentifier.id },
        { $set: updateData },
        { upsert: true, new: true }
      );
    }

    if (!userSettings) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar connected successfully',
    });
  } catch (error) {
    console.error('Error handling calendar callback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect calendar' },
      { status: 500 }
    );
  }
}
