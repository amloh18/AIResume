import { NextRequest, NextResponse } from 'next/server';
import { CalendarService } from '@/lib/services/calendarService';

export async function GET(request: NextRequest) {
  try {
    const authUrl = CalendarService.getAuthUrl();
    
    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error generating calendar auth URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const tokens = await CalendarService.getTokensFromCode(code);
    
    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch (error) {
    console.error('Error exchanging auth code for tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to exchange authorization code' },
      { status: 500 }
    );
  }
}
