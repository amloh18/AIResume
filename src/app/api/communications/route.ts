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
    const applicationId = searchParams.get('applicationId');
    const direction = searchParams.get('direction') as 'inbound' | 'outbound' | null;
    const classification = searchParams.get('classification');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const sort = searchParams.get('sort') === 'asc' ? 1 : -1;

    const query: Record<string, any> = { userId };
    if (jobId) query.jobId = jobId;
    if (applicationId) query.applicationId = applicationId;
    if (direction) query.direction = direction;
    if (classification) query.classification = classification;
    if (status) query.status = status;

    const [communications, total, unreadCount] = await Promise.all([
      Communication.find(query)
        .sort({ receivedAt: sort })
        .skip(skip)
        .limit(limit)
        .lean(),
      Communication.countDocuments(query),
      Communication.countDocuments({ userId, isRead: false, direction: 'inbound' }),
    ]);

    return NextResponse.json({
      success: true,
      data: { communications, total, unreadCount },
    });
  } catch (error: any) {
    console.error('Communications GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
