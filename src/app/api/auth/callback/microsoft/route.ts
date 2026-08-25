import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { EmailAccount } from '@/models/TrackerEmail';

export const dynamic = 'force-dynamic';

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
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
      return NextResponse.json(
        { success: false, error: 'Microsoft OAuth configuration missing from environment variables' },
        { status: 500 }
      );
    }

    await getConnection();
    const userId = session.user.id;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Microsoft token exchange error response:', errText);
      throw new Error(`Microsoft token exchange failed with status ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Fetch user profile info from Microsoft Graph
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errText = await profileResponse.text();
      console.error('Microsoft Graph profile fetch error response:', errText);
      throw new Error(`Microsoft Graph profile fetch failed with status ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    const emailAddress = profileData.mail || profileData.userPrincipalName || 'outlook-account';

    // Update or create EmailAccount in database
    await EmailAccount.findOneAndUpdate(
      { userId, provider: 'outlook' },
      {
        $set: {
          emailAddress,
          oauthAccessToken: accessToken,
          oauthRefreshToken: refreshToken,
          syncStatus: 'connected',
          lastSyncedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Return a premium closing HTML screen
    return new NextResponse(
      `<html>
        <body style="background: #0d0d0d; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; text-align: center;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 40px; border-radius: 32px; max-width: 380px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(128,255,0,0.1); border: 1px solid rgba(128,255,0,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; color: #80FF00; font-size: 28px;">✓</div>
            <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.01em;">Inbox Connected!</h1>
            <p style="font-size: 13px; color: #8a8a8f; margin: 0 0 24px 0; line-height: 1.5;">Your Outlook account <b>${emailAddress}</b> was linked successfully. We're closing this window now.</p>
            <div style="font-size: 11px; color: #5a5a5f;">AIResume Secure Auth Flow</div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'email-sync-success',
                provider: 'outlook',
                emailAddress: '${emailAddress}'
              }, '*');
            }
            setTimeout(() => { window.close(); }, 1800);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    console.error('Error handling microsoft callback:', error);
    return new NextResponse(
      `<html>
        <body style="background: #0d0d0d; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; text-align: center;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(220,38,38,0.2); padding: 40px; border-radius: 32px; max-width: 380px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; color: #dc2626; font-size: 28px;">!</div>
            <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">Connection Failed</h1>
            <p style="font-size: 13px; color: #8a8a8f; margin: 0 0 24px 0; line-height: 1.5;">${error.message || 'Verification failed. Please try again.'}</p>
            <button onclick="window.close()" style="background: #ffffff; color: #000000; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 12px;">Close Window</button>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
