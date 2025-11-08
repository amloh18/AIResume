import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import followUpNotificationService from '@/lib/services/followUpNotificationService';

const verifyCronSecret = (request: NextRequest): boolean => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return cronSecret ? authHeader === `Bearer ${cronSecret}` : false;
};

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  }
}

