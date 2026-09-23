import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';

/**
 * POST /api/portal-connections/[id]/sync
 *
 * Attempts a job sync for a connected account.
 *
 * ⚠️ A `200` here does **not** mean jobs were found. The three consumer portals
 * have no implemented job source, so the honest answer is
 * `sourceUnavailable: true` with zero results — which the caller must surface as
 * "nothing to sync yet", not as a discovery count. The previous implementation
 * returned hard-coded sample roles from the adapters, so this endpoint always
 * looked like it worked while writing fabricated postings into the shared job
 * pool.
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

    return NextResponse.json(syncResult);
  } catch (error: any) {
    // The service throws a single opaque message for both "missing" and "not
    // yours", so a caller cannot probe for other users' connection ids.
    if (error?.message === 'Portal connection not found') {
      return NextResponse.json({ error: 'Portal connection not found' }, { status: 404 });
    }

    console.error('[API] POST /api/portal-connections/[id]/sync error:', error);
    return NextResponse.json({ error: 'Failed to synchronize portal jobs' }, { status: 500 });
  }
}
