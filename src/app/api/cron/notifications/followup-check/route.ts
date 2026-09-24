import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { getConnection } from '@/lib/database';
import followUpNotificationService from '@/lib/services/followUpNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same follow-ups again.
  const lock = acquireCronLock('notifications:followup-check');
  if (!lock) return cronBusyResponse('notifications:followup-check');

  try {
    // Fail closed, and accept CRON_API_KEY as well as CRON_SECRET so this cannot disagree with the proxy.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    await getConnection();

    const result = await followUpNotificationService.checkAndEnqueue();

    return NextResponse.json({
      success: true,
      message: 'Follow-up check completed',
      enqueued: result.enqueued,
    });
  } catch (error: any) {
    console.error('Error in follow-up check cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}

