import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import notificationQueueWorker from '@/lib/services/notificationQueueWorker';

export async function POST(request: NextRequest) {
  // Overlap guard: two concurrent drains of the same notification queue would double-send.
  return runCron('notifications:process-queue', request, async () => {
    try {
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
      log.error('Error processing notification queue:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}

