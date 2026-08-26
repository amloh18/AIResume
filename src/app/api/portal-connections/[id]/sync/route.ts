import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';

/**
 * POST /api/portal-connections/[id]/sync
 * Triggers an immediate background sync for a portal connection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const portalConnectionId = resolvedParams.id;

    if (!portalConnectionId) {
      return NextResponse.json({ error: 'Portal Connection ID is required' }, { status: 400 });
    }

    const syncResult = await PortalConnectionService.syncPortalJobs(
      auth.userId,
      portalConnectionId,
      'manual'
    );

    return NextResponse.json({
      ...syncResult,
    });
  } catch (error: any) {
    console.error('[API] POST /api/portal-connections/[id]/sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to synchronize portal jobs' },
      { status: 500 }
    );
  }
}
