import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encryptToken, decryptToken } from '@/lib/auth/token-encryption';

/**
 * GET /api/integrations/naukri/session
 * Returns the user's Naukri connection status and preferences (no raw cookies exposed).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const user: any = await User.findById(auth.userId).select('naukriIntegration email').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const integration = (user as any).naukriIntegration || {
      enabled: false,
      sessionStatus: 'disconnected',
      preferences: {
        targetTitles: [],
        targetLocations: ['Bangalore', 'Remote', 'Mumbai', 'Hyderabad', 'Pune'],
        minCtcLakhs: 0,
        experienceYears: 2,
        maxNoticePeriodDays: 30,
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
      preferences: integration.preferences || {},
      stats: integration.stats || { totalFetched: 0, totalApplied: 0 },
    });
  } catch (error: any) {
    console.error('Error fetching Naukri integration status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/naukri/session
 * Saves / syncs Naukri session cookies and auto-apply preferences.
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

    let encryptedCookieJar = user.naukriIntegration?.encryptedCookieJar;
    let sessionStatus = user.naukriIntegration?.sessionStatus || 'disconnected';

    if (cookies) {
      const cookiePayload = typeof cookies === 'string' ? cookies : JSON.stringify(cookies);
      encryptedCookieJar = encryptToken(cookiePayload);
      sessionStatus = 'active';
    }

    const updatedPreferences = {
      targetTitles: preferences?.targetTitles ?? user.naukriIntegration?.preferences?.targetTitles ?? [],
      targetLocations: preferences?.targetLocations ?? user.naukriIntegration?.preferences?.targetLocations ?? ['Bangalore', 'Remote', 'Mumbai', 'Hyderabad', 'Pune'],
      minCtcLakhs: preferences?.minCtcLakhs ?? user.naukriIntegration?.preferences?.minCtcLakhs ?? 0,
      experienceYears: preferences?.experienceYears ?? user.naukriIntegration?.preferences?.experienceYears ?? 2,
      maxNoticePeriodDays: preferences?.maxNoticePeriodDays ?? user.naukriIntegration?.preferences?.maxNoticePeriodDays ?? 30,
      dailyLimit: Math.min(Math.max(preferences?.dailyLimit ?? user.naukriIntegration?.preferences?.dailyLimit ?? 25, 1), 50),
      autoApplyEnabled: preferences?.autoApplyEnabled ?? user.naukriIntegration?.preferences?.autoApplyEnabled ?? false,
    };

    user.naukriIntegration = {
      enabled: sessionStatus === 'active',
      connectedAt: user.naukriIntegration?.connectedAt || new Date(),
      lastSyncedAt: new Date(),
      sessionStatus,
      userEmail: userEmail || user.naukriIntegration?.userEmail || user.email,
      encryptedCookieJar,
      preferences: updatedPreferences,
      stats: user.naukriIntegration?.stats || {
        totalFetched: 0,
        totalApplied: 0,
      },
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Naukri integration updated successfully',
      connected: sessionStatus === 'active',
      sessionStatus,
      preferences: updatedPreferences,
      stats: user.naukriIntegration.stats,
    });
  } catch (error: any) {
    console.error('Error updating Naukri session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update Naukri integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/naukri/session
 * Disconnects the user's Naukri account and removes stored session credentials.
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

    if (user.naukriIntegration) {
      user.naukriIntegration.enabled = false;
      user.naukriIntegration.sessionStatus = 'disconnected';
      user.naukriIntegration.encryptedCookieJar = undefined;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Naukri integration disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting Naukri integration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
