import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { getConnection } from '@/lib/database';
import notificationQueueWorker from '@/lib/services/notificationQueueWorker';

export async function POST(request: NextRequest) {
  // Overlap guard: two concurrent drains of the same notification queue would double-send.
  const lock = acquireCronLock('notifications:process-queue');
  if (!lock) return cronBusyResponse('notifications:process-queue');

  try {
    // Fail closed, and accept CRON_API_KEY as well as CRON_SECRET so this cannot disagree with the proxy.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    await getConnection();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await notificationQueueWorker.processQueue(limit);

    return NextResponse.json({
      success: true,
      message: 'Queue processing completed',
      ...result,
    });
  } catch (error: any) {
    console.error('Error processing notification queue:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  } finally {
    lock.release();
  }
}

