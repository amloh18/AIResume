import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';
import { PortalProvider } from '@/models/PortalConnection';

/**
 * GET /api/portal-connections
 * Lists all connected and available job portals for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await PortalConnectionService.getUserPortalConnections(auth.userId);

    return NextResponse.json({
      success: true,
      connections,
    });
  } catch (error: any) {
    console.error('[API] GET /api/portal-connections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch portal connections' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portal-connections?id=... or ?provider=...
 * Disconnects a portal connection safely
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
      return NextResponse.json(
        { error: 'Connection ID or provider required' },
        { status: 400 }
      );
    }

    await PortalConnectionService.disconnectPortalConnection(auth.userId, connectionId);

    return NextResponse.json({
      success: true,
      message: 'Portal connection disconnected successfully',
    });
  } catch (error: any) {
    console.error('[API] DELETE /api/portal-connections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect portal connection' },
      { status: 500 }
    );
  }
}
