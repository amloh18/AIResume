import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'gmail';

    if (provider === 'outlook') {
      if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
        return NextResponse.json(
          { success: false, error: 'Microsoft OAuth configuration missing from environment variables' },
          { status: 500 }
        );
      }

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${
        process.env.MICROSOFT_CLIENT_ID
      }&response_type=code&redirect_uri=${encodeURIComponent(
        process.env.MICROSOFT_REDIRECT_URI
      )}&response_mode=query&scope=offline_access%20https%3A%2F%2Fgraph.microsoft.com%2FMail.Read%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read&state=outlook`;

      return NextResponse.json({
        success: true,
        authUrl,
      });
    }

    // Default: Gmail (Google)
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return NextResponse.json(
        { success: false, error: 'Google OAuth configuration missing from environment variables' },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: 'gmail',
      prompt: 'consent',
    });

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

