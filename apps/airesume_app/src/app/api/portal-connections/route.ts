import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';

/**
 * GET /api/portal-connections
 *
 * The single canonical read for job-source connection state. Both Settings and
 * onboarding consume this — there is no onboarding-specific variant, because two
 * endpoints is how the two surfaces drifted apart in the first place.
 *
 * Returns AIResume's own network plus the three external account sources.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await PortalConnectionService.getUserPortalConnections(auth.userId);

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[API] GET /api/portal-connections error:', error);
    return NextResponse.json({ error: 'Failed to fetch job source connections' }, { status: 500 });
  }
}

/**
 * DELETE /api/portal-connections?id=... or ?provider=...
 *
 * Deactivates a connection. Jobs, applications, CVs, matches and journey history
 * are not touched — only the connection record and its stored session.
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('id') || searchParams.get('provider');

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID or provider required' }, { status: 400 });
    }

    // Ownership is resolved inside the service, as part of the lookup — a caller
    // passing another user's connection id gets the same answer as passing a
    // non-existent one.
    await PortalConnectionService.disconnectPortalConnection(auth.userId, connectionId);

    return NextResponse.json({
      success: true,
      message: 'Portal connection disconnected successfully',
    });
  } catch (error: any) {
    console.error('[API] DELETE /api/portal-connections error:', error);
    return NextResponse.json({ error: 'Failed to disconnect portal connection' }, { status: 500 });
  }
}
