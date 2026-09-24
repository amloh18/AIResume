import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { getConnection } from '@/lib/database';
import jobStatusNotificationService from '@/lib/services/jobStatusNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same status notifications again.
  const lock = acquireCronLock('notifications:job-status-check');
  if (!lock) return cronBusyResponse('notifications:job-status-check');

  try {
    // Fail closed, and accept CRON_API_KEY as well as CRON_SECRET so this cannot disagree with the proxy.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    await getConnection();

    const result = await jobStatusNotificationService.checkAndEnqueue();

    return NextResponse.json({
      success: true,
      message: 'Job status check completed',
      enqueued: result.enqueued,
    });
  } catch (error: any) {
    console.error('Error in job status check cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}

