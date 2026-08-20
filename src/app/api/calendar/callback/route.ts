import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import { CalendarService } from '@/lib/services/calendarService';
import { EmailAccount } from '@/models/TrackerEmail';
import { google } from 'googleapis';

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
    const userId = session.user.id;

    if (state === 'gmail') {
      // Setup Google oauth client to fetch user's email address
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const emailAddress = userInfo.data.email || 'gmail-account';

      // Update or create EmailAccount in database
      await EmailAccount.findOneAndUpdate(
        { userId, provider: 'gmail' },
        {
          $set: {
            emailAddress,
            oauthAccessToken: tokens.accessToken,
            oauthRefreshToken: tokens.refreshToken,
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
              <p style="font-size: 13px; color: #8a8a8f; margin: 0 0 24px 0; line-height: 1.5;">Your Gmail account <b>${emailAddress}</b> was linked successfully. We're closing this window now.</p>
              <div style="font-size: 11px; color: #5a5a5f;">AI Resume Secure Auth Flow</div>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'email-sync-success',
                  provider: 'gmail',
                  emailAddress: '${emailAddress}'
                }, '*');
              }
              setTimeout(() => { window.close(); }, 1800);
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // Default: Google Calendar integration
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

      // Return a premium closing HTML screen for Calendar
      return new NextResponse(
        `<html>
          <body style="background: #0d0d0d; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; text-align: center;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 40px; border-radius: 32px; max-width: 380px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; color: #3b82f6; font-size: 28px;">✓</div>
              <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.01em;">Calendar Linked!</h1>
              <p style="font-size: 13px; color: #8a8a8f; margin: 0 0 24px 0; line-height: 1.5;">Your Google Calendar is successfully configured and active. We're closing this window now.</p>
              <div style="font-size: 11px; color: #5a5a5f;">AI Resume Secure Auth Flow</div>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'calendar-sync-success',
                  provider: 'google',
                  emailAddress: 'Google Calendar'
                }, '*');
              }
              setTimeout(() => { window.close(); }, 1800);
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error: any) {
    console.error('Error handling calendar callback:', error);
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
