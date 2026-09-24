import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import jobStatusNotificationService from '@/lib/services/jobStatusNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same status notifications again.
  return runCron('notifications:job-status-check', request, async () => {
    try {
      await getConnection();

      const result = await jobStatusNotificationService.checkAndEnqueue();

      return NextResponse.json({
        success: true,
        message: 'Job status check completed',
        enqueued: result.enqueued,
      });
    } catch (error: any) {
      log.error('Error in job status check cron:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}

