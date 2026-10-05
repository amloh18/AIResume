import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import deadlineNotificationService from '@/lib/services/deadlineNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same deadline reminders again.
  return runCron('notifications:deadline-check', request, async () => {
    try {
      await getConnection();

      const result = await deadlineNotificationService.checkAndEnqueue();

      return NextResponse.json({
        success: true,
        message: 'Deadline check completed',
        enqueued: result.enqueued,
      });
    } catch (error: any) {
      log.error('Error in deadline check cron:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}

