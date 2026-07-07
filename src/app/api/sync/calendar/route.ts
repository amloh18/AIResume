import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import UserSettings from '@/models/UserSettings';
import Job from '@/models/Job';
import { UnifiedCalendarSyncService } from '@/lib/services/unifiedCalendarSync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync/calendar
 * Syncs job applications to connected calendar (Google or Outlook)
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userSettings = await UserSettings.findOne({ userId });
    const calendarSettings = userSettings?.advanced?.integrations?.calendar;

    if (!calendarSettings?.connected || !calendarSettings?.accessToken) {
      return NextResponse.json({ success: false, error: 'Calendar not connected' }, { status: 400 });
    }

    const provider = calendarSettings.provider || 'google';
    const accessToken = calendarSettings.accessToken;
    const refreshToken = calendarSettings.refreshToken;
    const syncSettings = calendarSettings.syncSettings || {};

    // Fetch jobs for this user
    const query: any = { userId };
    if (!syncSettings.includeCreated) query.status = { $ne: 'created' };

    const jobs = await Job.find(query);
    const now = new Date();

    const events = jobs
      .filter(job => {
        if (job.status === 'draft') return false;
        if (job.status === 'created' && !syncSettings.includeCreated) return false;
        if (syncSettings.includeDeadlines && job.deadline && new Date(job.deadline) < now) return false;
        return true;
      })
      .map(job => {
        const eventDate = job.applicationDate
          ? new Date(job.applicationDate)
          : job.deadline
            ? new Date(job.deadline)
            : new Date(job.createdAt || Date.now());

        const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

        return {
          jobId: job._id.toString(),
          title: `${getStatusEmoji(job.status)} Job Application: ${job.jobTitle} at ${job.company}`,
          company: job.company,
          status: job.status,
          start: eventDate,
          end: endDate,
          location: job.company,
          colorId: getColorIdForStatus(job.status),
          reminders: syncSettings.reminderMinutes
            ? [{ method: 'popup' as const, minutes: syncSettings.reminderMinutes }]
            : undefined,
          description: buildEventDescription(job),
        };
      });

    const syncService = new UnifiedCalendarSyncService(
      accessToken,
      refreshToken,
      provider === 'outlook' ? 'outlook' : 'google',
      calendarSettings.tokenExpiresAt ? new Date(calendarSettings.tokenExpiresAt) : undefined
    );

    const syncResult = await syncService.syncEvents(events);

    if (syncResult.success) {
      await UserSettings.findOneAndUpdate(
        { userId },
        { $set: { 'advanced.integrations.calendar.lastSync': new Date() } }
      );
    }

    return NextResponse.json({
      success: syncResult.success,
      provider,
      syncedCount: events.length,
      created: syncResult.created,
      updated: syncResult.updated,
      deleted: syncResult.deleted,
      errors: syncResult.errors,
    });
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userSettings = await UserSettings.findOne({ userId });
    const calendarSettings = userSettings?.advanced?.integrations?.calendar;

    return NextResponse.json({
      success: true,
      connected: calendarSettings?.connected || false,
      provider: calendarSettings?.provider || 'google',
      lastSync: calendarSettings?.lastSync || null,
      syncEnabled: calendarSettings?.syncEnabled || false,
      syncSettings: calendarSettings?.syncSettings || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await UserSettings.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          'advanced.integrations.calendar.connected': false,
          'advanced.integrations.calendar.accessToken': undefined,
          'advanced.integrations.calendar.refreshToken': undefined,
          'advanced.integrations.calendar.syncEnabled': false,
          'advanced.integrations.calendar.lastSync': undefined,
        },
      }
    );

    return NextResponse.json({ success: true, message: 'Calendar disconnected' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function getStatusEmoji(status: string): string {
  const emojiMap: Record<string, string> = {
    created: '📝',
    applied: '📤',
    screening: '🔍',
    interview: '💼',
    offer: '🎉',
    rejected: '❌',
    accepted: '✅',
    withdrawn: '↩️',
  };
  return emojiMap[status] || '📝';
}

function getColorIdForStatus(status: string): string {
  const colorMap: Record<string, string> = {
    created: '1',
    applied: '2',
    screening: '3',
    interview: '4',
    offer: '5',
    rejected: '6',
    accepted: '7',
    withdrawn: '8',
  };
  return colorMap[status] || '1';
}

function buildEventDescription(job: any): string {
  let desc = `CVCircle Job Application\n`;
  desc += `Job ID: ${job._id}\n`;
  desc += `Status: ${job.status}\n`;
  desc += `Company: ${job.company}\n`;
  desc += `Job Title: ${job.jobTitle || job.title || 'N/A'}\n`;

  if (job.applicationDate) {
    desc += `Application Date: ${new Date(job.applicationDate).toLocaleDateString()}\n`;
  }
  if (job.deadline) {
    desc += `Deadline: ${new Date(job.deadline).toLocaleDateString()}\n`;
  }
  if (job.location) {
    desc += `Location: ${job.location}\n`;
  }
  if (job.jobUrl) {
    desc += `Job URL: ${job.jobUrl}\n`;
  }
  if (job.contactDetails?.email) {
    desc += `Contact: ${job.contactDetails.email}\n`;
  }
  if (job.interviews?.length > 0) {
    desc += `\nInterviews:\n`;
    job.interviews.forEach((interview: any, index: number) => {
      desc += `${index + 1}. ${interview.type} - ${new Date(interview.date).toLocaleDateString()}`;
      if (interview.interviewer) desc += ` (${interview.interviewer})`;
      desc += '\n';
    });
  }
  if (job.followUps?.length > 0) {
    desc += `\nFollow-ups:\n`;
    job.followUps.forEach((followUp: any, index: number) => {
      desc += `${index + 1}. ${followUp.type} - ${new Date(followUp.date).toLocaleDateString()}: ${followUp.description}\n`;
    });
  }

  desc += `\nSynced via CVCircle on ${new Date().toISOString()}`;
  return desc;
}
