import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { EmailAccount } from '@/models/TrackerEmail';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || 'gmail';
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/dashboard?email_auth_error=denied', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard?email_auth_error=no_code', request.url));
    }

    const userId = session.user.id;

    if (state === 'outlook') {
      // Outlook OAuth callback
      if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
        return NextResponse.redirect(new URL('/dashboard?email_auth_error=config_missing', request.url));
      }

      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || tokenData.error) {
        return NextResponse.redirect(new URL('/dashboard?email_auth_error=token_failed', request.url));
      }

      // Get user profile
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileResponse.json();

      const encryptedRefreshToken = tokenData.refresh_token
        ? jwt.sign(tokenData.refresh_token, process.env.NEXTAUTH_SECRET || 'fallback-secret')
        : undefined;

      await EmailAccount.findOneAndUpdate(
        { userId, provider: 'outlook' },
        {
          userId,
          provider: 'outlook',
          emailAddress: profile.mail || profile.userPrincipalName || session.user.email || '',
          accessToken: tokenData.access_token,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
          syncStatus: 'connected',
          lastSyncAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return NextResponse.redirect(new URL('/dashboard?email_connected=true', request.url));
    }

    // Default: Gmail OAuth callback
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return NextResponse.redirect(new URL('/dashboard?email_auth_error=config_missing', request.url));
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/dashboard?email_auth_error=no_token', request.url));
    }

    // Get user profile
    const oauth2 = oauth2Client;
    oauth2Client.setCredentials(tokens);
    const oauth2WithCreds = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2WithCreds.setCredentials(tokens);

    const people = google.people({ version: 'v1', auth: oauth2WithCreds });
    const profileRes = await people.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses,names',
    });

    const emailAddress = profileRes.data.emailAddresses?.[0]?.value || session.user.email || '';

    const encryptedRefreshToken = tokens.refresh_token
      ? jwt.sign(tokens.refresh_token, process.env.NEXTAUTH_SECRET || 'fallback-secret')
      : undefined;

    await EmailAccount.findOneAndUpdate(
      { userId, provider: 'gmail' },
      {
        userId,
        provider: 'gmail',
        emailAddress,
        accessToken: tokens.access_token,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        syncStatus: 'connected',
        lastSyncAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(new URL('/dashboard?email_connected=true', request.url));
  } catch (error: any) {
    console.error('Email OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?email_auth_error=server_error', request.url));
  }
}
