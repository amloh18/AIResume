import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCalendarSyncService } from '@/lib/services/unifiedCalendarSync';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Job from '@/models/Job';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import UserSettings from '@/models/UserSettings';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let calendarProvider: 'google' | 'outlook' = 'google';

    try {
      const body = await request.json();
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
      calendarProvider = body.provider || calendarProvider;
    } catch {
      // Body may be empty, which is fine since we fallback to database settings
    }

    await getConnection();
    const userId = session.user.id;

    if (!accessToken) {
      const userSettings = await UserSettings.findOne({ userId });
      const calendar = userSettings?.advanced?.integrations?.calendar;
      if (calendar?.connected && calendar?.accessToken) {
        accessToken = calendar.accessToken;
        refreshToken = calendar.refreshToken;
        calendarProvider = calendar.provider === 'outlook' ? 'outlook' : 'google';
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const userSettings = await UserSettings.findOne({ userId });
    const syncSettings = userSettings?.advanced?.integrations?.calendar?.syncSettings || {};
    const includeCreated = syncSettings.includeCreated === true;

    const query: any = { userId };
    if (!includeCreated) {
      query.status = { $ne: 'created' };
    }

    const jobs = await Job.find(query).sort({ updatedAt: -1 });

    const jobApplications = jobs.map(job => ({
      jobId: job._id.toString(),
      jobTitle: job.jobTitle,
      company: job.company,
      status: job.status,
      applicationDate: job.applicationDate,
      deadline: job.deadline,
      interviews: job.interviews || [],
      followUps: job.followUps || [],
    }));

    const syncService = new UnifiedCalendarSyncService(accessToken, refreshToken, calendarProvider);
    const result = await syncService.syncEvents(jobApplications as any);

    return NextResponse.json({
      success: result.success,
      ...(result.success ? {} : { error: result.errors.join(', ') }),
      provider: result.provider,
      syncedCount: jobApplications.length,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error syncing to calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync to calendar' },
      { status: 500 }
    );
  }
}

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
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const syncService = new UnifiedCalendarSyncService(accessToken);
    const result = await syncService.syncEvents([]);

    return NextResponse.json({
      success: true,
      events: [],
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
