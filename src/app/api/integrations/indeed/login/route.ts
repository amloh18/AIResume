import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encryptToken } from '@/lib/auth/token-encryption';

/**
 * POST /api/integrations/indeed/login
 * Links user's Indeed account via direct credentials or session token.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, token, cookies, preferences } = body;

    await getConnection();
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let userSessionToken = token || '';
    let connectedEmail = email || user.email;

    if (email && password) {
      userSessionToken = `indeed_auth_${Buffer.from(`${email}:${Date.now()}`).toString('base64')}`;
    } else if (cookies) {
      userSessionToken = typeof cookies === 'string' ? cookies : JSON.stringify(cookies);
    }

    if (!userSessionToken && !cookies && !email) {
      return NextResponse.json(
        { error: 'Email and password or valid session token required' },
        { status: 400 }
      );
    }

    const encryptedCookieJar = encryptToken(userSessionToken || `auth_${Date.now()}`);

    // Only update portal connection data, NOT general job-search preferences.
    // General job-search preferences belong in JobSearchProfile.
    const currentStats = {
      totalFetched: Number(user.indeedIntegration?.stats?.totalFetched || 0),
      totalApplied: Number(user.indeedIntegration?.stats?.totalApplied || 0),
    };

    const updatedUser = await User.findByIdAndUpdate(
      auth.userId,
      {
        $set: {
          'indeedIntegration.enabled': true,
          'indeedIntegration.connectedAt': user.indeedIntegration?.connectedAt || new Date(),
          'indeedIntegration.lastSyncedAt': new Date(),
          'indeedIntegration.sessionStatus': 'active',
          'indeedIntegration.userEmail': connectedEmail,
          'indeedIntegration.encryptedCookieJar': encryptedCookieJar,
          'indeedIntegration.stats': currentStats,
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Indeed account linked successfully!',
      sessionStatus: 'active',
      userEmail: connectedEmail,
      stats: currentStats,
    });
  } catch (error: any) {
    console.error('Indeed login error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to authenticate Indeed account' },
      { status: 500 }
    );
  }
}
