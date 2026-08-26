import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';
import { PortalProvider } from '@/models/PortalConnection';

/**
 * POST /api/portal-connections/start
 * Generates short-lived connection attempt for user
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider as PortalProvider;

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to start portal connection attempt' },
      { status: 500 }
    );
  }
}
