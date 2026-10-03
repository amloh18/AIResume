import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encryptToken } from '@/lib/auth/token-encryption';

/**
 * GET /api/integrations/indeed/session
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const user: any = await User.findById(auth.userId).select('indeedIntegration email').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const integration = user.indeedIntegration || {
      enabled: false,
      sessionStatus: 'disconnected',
      preferences: {
        targetTitles: [],
        targetLocations: ['London', 'Remote', 'New York', 'Bangalore'],
        minSalary: 90000,
        salaryCurrency: 'USD',
        remoteOnly: false,
        dailyLimit: 25,
        autoApplyEnabled: false,
      },
      stats: {
        totalFetched: 0,
        totalApplied: 0,
      },
    };

    return NextResponse.json({
      connected: integration.sessionStatus === 'active',
      sessionStatus: integration.sessionStatus || 'disconnected',
      connectedAt: integration.connectedAt,
      lastSyncedAt: integration.lastSyncedAt,
      userEmail: integration.userEmail || user.email,
      preferences: integration.preferences,
      stats: integration.stats || { totalFetched: 0, totalApplied: 0 },
    });
  } catch (error: any) {
    console.error('Error fetching Indeed session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Indeed status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/indeed/session
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cookies, userEmail, preferences } = body;

    await getConnection();
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let encryptedCookieJar = user.indeedIntegration?.encryptedCookieJar;
    let sessionStatus = user.indeedIntegration?.sessionStatus || 'disconnected';

    if (cookies) {
      const cookiePayload = typeof cookies === 'string' ? cookies : JSON.stringify(cookies);
      encryptedCookieJar = encryptToken(cookiePayload);
      sessionStatus = 'active';
    }

    const updatedPreferences = {
      targetTitles: preferences?.targetTitles ?? user.indeedIntegration?.preferences?.targetTitles ?? [],
      targetLocations: preferences?.targetLocations ?? user.indeedIntegration?.preferences?.targetLocations ?? ['London', 'Remote', 'New York', 'Bangalore'],
      minSalary: preferences?.minSalary ?? user.indeedIntegration?.preferences?.minSalary ?? 90000,
      salaryCurrency: preferences?.salaryCurrency ?? user.indeedIntegration?.preferences?.salaryCurrency ?? 'USD',
      remoteOnly: preferences?.remoteOnly ?? user.indeedIntegration?.preferences?.remoteOnly ?? false,
      dailyLimit: Math.min(Math.max(preferences?.dailyLimit ?? user.indeedIntegration?.preferences?.dailyLimit ?? 25, 1), 50),
      autoApplyEnabled: preferences?.autoApplyEnabled ?? user.indeedIntegration?.preferences?.autoApplyEnabled ?? false,
    };

    user.indeedIntegration = {
      enabled: sessionStatus === 'active',
      connectedAt: user.indeedIntegration?.connectedAt || new Date(),
      lastSyncedAt: new Date(),
      sessionStatus,
      userEmail: userEmail || user.indeedIntegration?.userEmail || user.email,
      encryptedCookieJar,
      preferences: updatedPreferences,
      stats: user.indeedIntegration?.stats || {
        totalFetched: 0,
        totalApplied: 0,
      },
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Indeed integration updated successfully',
      connected: sessionStatus === 'active',
      sessionStatus,
      preferences: updatedPreferences,
      stats: user.indeedIntegration.stats,
    });
  } catch (error: any) {
    console.error('Error updating Indeed session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update Indeed integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/indeed/session
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.indeedIntegration = {
      enabled: false,
      sessionStatus: 'disconnected',
      preferences: user.indeedIntegration?.preferences || {
        targetTitles: [],
        targetLocations: ['London', 'Remote', 'New York', 'Bangalore'],
        minSalary: 90000,
        salaryCurrency: 'USD',
        remoteOnly: false,
        dailyLimit: 25,
        autoApplyEnabled: false,
      },
      stats: user.indeedIntegration?.stats || {
        totalFetched: 0,
        totalApplied: 0,
      },
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Indeed account disconnected',
      connected: false,
      sessionStatus: 'disconnected',
    });
  } catch (error: any) {
    console.error('Error disconnecting Indeed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Indeed' },
      { status: 500 }
    );
  }
}
