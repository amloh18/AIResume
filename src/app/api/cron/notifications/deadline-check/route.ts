import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { getConnection } from '@/lib/database';
import deadlineNotificationService from '@/lib/services/deadlineNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same deadline reminders again.
  const lock = acquireCronLock('notifications:deadline-check');
  if (!lock) return cronBusyResponse('notifications:deadline-check');

  try {
    // Fail closed, and accept CRON_API_KEY as well as CRON_SECRET so this cannot disagree with the proxy.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    await getConnection();

    const result = await deadlineNotificationService.checkAndEnqueue();

    return NextResponse.json({
      success: true,
      message: 'Deadline check completed',
      enqueued: result.enqueued,
    });
  } catch (error: any) {
    console.error('Error in deadline check cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}

