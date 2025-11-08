import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import notificationQueueWorker from '@/lib/services/notificationQueueWorker';

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
  }
}

