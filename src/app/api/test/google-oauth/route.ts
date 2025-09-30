import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check Google OAuth configuration
    const config = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    };

    // Expected callback URL
    const expectedCallbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;

    return NextResponse.json({
      success: true,
      message: 'Google OAuth Configuration Check',
      config,
      expectedCallbackUrl,
      instructions: [
        'In Google Console, go to APIs & Services > Credentials',
        'Select your OAuth 2.0 Client ID',
        'Add this URL to Authorized redirect URIs:',
        expectedCallbackUrl,
        'Also add:',
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}