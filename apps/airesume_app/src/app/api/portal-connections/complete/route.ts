import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { PortalConnectionService } from '@/lib/services/portal-connection-service';
import { PortalConnectionCompleteRequest } from '@/lib/portals/types';

/**
 * Keys that must never reach this endpoint.
 *
 * ⚠️ The web client used to POST the user's Indeed / Naukri / LinkedIn password
 * here as `sessionPayload.password`, and the adapter encrypted and stored it.
 * That is a credential-harvesting pattern regardless of the encryption, and it is
 * now refused at the boundary — a frontend fix alone would leave the endpoint
 * open to any client, including a stale cached bundle.
 *
 * Nothing legitimate needs these. Session capture, when it lands, supplies opaque
 * session material (cookies / tokens), not a password.
 */
const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'pass',
  'secret',
  'clientsecret',
  'passwordhash',
  'credentials',
  'pin',
  'otp',
  'totp',
  'cvv',
]);

/** Depth-bounded search for a forbidden key anywhere in the payload. */
function findCredentialKey(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCredentialKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_CREDENTIAL_KEYS.has(key.toLowerCase())) return key;
    const found = findCredentialKey(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * POST /api/portal-connections/complete
 *
 * Records a connected account. Accepts identifying data and preferences only.
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

    // Refuse before anything is persisted. Log the provider and the offending key
    // name only — never the value, and never the surrounding payload.
    const credentialKey = findCredentialKey(body);
    if (credentialKey) {
      console.warn(
        `[API] POST /api/portal-connections/complete rejected: credential field "${credentialKey}" for provider "${body.provider}"`
      );
      return NextResponse.json(
        {
          error:
            'This request included a credential. BuildAIResume never asks for or stores your job-site password.',
        },
        { status: 400 }
      );
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
        connectedAt: result.connection.connectedAt,
      },
      validation: result.validation,
    });
  } catch (error: any) {
    console.error('[API] POST /api/portal-connections/complete error:', error);
    return NextResponse.json({ error: 'Failed to complete portal connection' }, { status: 500 });
  }
}
