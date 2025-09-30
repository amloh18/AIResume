import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test NextAuth API endpoints availability
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    
    const endpoints = {
      providers: `${baseUrl}/api/auth/providers`,
      session: `${baseUrl}/api/auth/session`,
      csrf: `${baseUrl}/api/auth/csrf`,
      googleCallback: `${baseUrl}/api/auth/callback/google`,
    };

    const testResults = {};

    // Test each endpoint
    for (const [name, url] of Object.entries(endpoints)) {
      try {
        const response = await fetch(url);
        testResults[name] = {
          url,
          status: response.status,
          accessible: response.status < 500
        };
      } catch (error) {
        testResults[name] = {
          url,
          error: error.message,
          accessible: false
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'NextAuth endpoints test',
      baseUrl,
      endpoints: testResults,
      googleOAuthSetup: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        requiredRedirectUri: `${baseUrl}/api/auth/callback/google`,
        note: 'Make sure this redirect URI is added to your Google OAuth app'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}