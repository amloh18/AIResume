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
    const userId = session.user.id;

    // Update user settings with calendar integration
    const updateData: any = {
      'advanced.integrations.calendar.connected': true,
      'advanced.integrations.calendar.provider': 'google',
      'advanced.integrations.calendar.accessToken': tokens.accessToken,
      'advanced.integrations.calendar.refreshToken': tokens.refreshToken,
      'advanced.integrations.calendar.lastSync': new Date(),
      'advanced.integrations.calendar.syncEnabled': true,
    };

    const userSettings = await UserSettings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    );

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
