import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';
import { PortalProvider } from '@/models/PortalConnection';
import { portalAdapterRegistry } from '@/lib/portals/PortalAdapterRegistry';

/**
 * POST /api/portal-connections/start
 *
 * Issues a short-lived connection attempt. Stateless: it mints an id and a state
 * value and persists nothing, so a user who abandons the flow leaves no trace.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider as PortalProvider;

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    // Reject unknown providers instead of silently materialising one. The registry
    // falls back to a generic adapter for *any* string, so without this check an
    // arbitrary value would create a connection row that no surface can render.
    const supported = portalAdapterRegistry.getAllSupportedProviders();
    if (!supported.includes(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    const startResult = await PortalConnectionService.startConnectionAttempt(
      auth.userId,
      provider,
      {
        redirectUri: body.redirectUri,
        state: body.state,
      }
    );

    return NextResponse.json({
      success: true,
      ...startResult,
    });
  } catch (error: any) {
    console.error('[API] POST /api/portal-connections/start error:', error);
    return NextResponse.json({ error: 'Failed to start portal connection attempt' }, { status: 500 });
  }
}
