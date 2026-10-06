import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { Communication } from '@/models/Communication';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      const count = await Communication.countDocuments({
        userId,
        jobId,
        isRead: false,
        direction: 'inbound',
      });
      return NextResponse.json({ success: true, data: { count } });
    }

    const pipeline = [
      { $match: { userId, isRead: false, direction: 'inbound' } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ];

    const results = await Communication.aggregate(pipeline);

    const counts: Record<string, number> = {};
    for (const result of results) {
      if (result._id) {
        counts[result._id.toString()] = result.count;
      }
    }

    return NextResponse.json({ success: true, counts, data: { counts } });
  } catch (error: any) {
    console.error('Unread count GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
