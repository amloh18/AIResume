import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import followUpNotificationService from '@/lib/services/followUpNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same follow-ups again.
  return runCron('notifications:followup-check', request, async () => {
    try {
      await getConnection();

      const result = await followUpNotificationService.checkAndEnqueue();

      return NextResponse.json({
        success: true,
        message: 'Follow-up check completed',
        enqueued: result.enqueued,
      });
    } catch (error: any) {
      log.error('Error in follow-up check cron:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}

