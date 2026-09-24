import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import membershipNotificationService from '@/lib/services/membershipNotificationService';

export async function POST(request: NextRequest) {
  // Overlap guard: a second concurrent check would enqueue the same membership reminders again.
  return runCron('notifications:membership-check', request, async () => {
    try {
      await getConnection();

      const result = await membershipNotificationService.checkAndEnqueue();

      return NextResponse.json({
        success: true,
        message: 'Membership check completed',
        enqueued: result.enqueued,
      });
    } catch (error: any) {
      log.error('Error in membership check cron:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}

