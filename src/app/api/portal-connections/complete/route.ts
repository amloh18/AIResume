import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';
import { PortalConnectionCompleteRequest } from '@/lib/portals/types';

/**
 * POST /api/portal-connections/complete
 * Verifies and securely stores authorized portal connection
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PortalConnectionCompleteRequest = await request.json();

    if (!body.provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const result = await PortalConnectionService.completeConnection(auth.userId, body);

    return NextResponse.json({
      success: true,
      connection: {
        id: result.connection._id,
        provider: result.connection.provider,
        status: result.connection.status,
        authMethod: result.connection.authMethod,
        account: result.connection.account,
        capabilities: result.connection.capabilities,
      },
      validation: result.validation,
    });
  } catch (error: any) {
    console.error('[API] POST /api/portal-connections/complete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete portal connection' },
      { status: 500 }
    );
  }
}
