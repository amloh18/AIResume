import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

/**
 * POST /api/integrations/indeed/login — RETIRED.
 *
 * ## Why this no longer accepts a login
 *
 * This route never contacted Indeed. Given any email and password it fabricated a token:
 *
 *     userSessionToken = `indeed_auth_${Buffer.from(`${email}:${Date.now()}`).toString('base64')}`;
 *
 * ...stored it as `indeedIntegration.encryptedCookieJar`, and set `sessionStatus: 'active'`. The token was
 * a base64 of the caller's own email and a timestamp — it authenticated nothing and would be rejected by
 * Indeed immediately. Its only real effect was to make the account *look* connected, which is worse than
 * failing: it produced a session that the apply path would later try to use.
 *
 * Two further problems:
 *
 *  1. It collected a job-site **password**. Passwords must never reach this server (see the account
 *     connection rules in `AGENTS.md`); the canonical connect flow does not accept them either.
 *  2. It wrote to `User.indeedIntegration`, which is the **legacy** store. The canonical connection record
 *     is the `PortalConnection` collection, and that is what Settings and onboarding read. A connection
 *     written here is invisible to the product.
 *
 * ## Where connections go now
 *
 * `POST /api/portal-connections/complete` — the canonical endpoint. It validates the provider, rejects any
 * credential-shaped field server-side, and writes the one record the UI reads.
 *
 * The extension's cookie hand-off is unaffected: that is `POST /api/integrations/indeed/session`, which
 * this change deliberately leaves in place.
 */

const RETIRED = {
  error: {
    code: 'ENDPOINT_RETIRED',
    message:
      'Password-based account linking is no longer supported. Connect your Indeed account from Settings → Connected Job Accounts.',
    useInstead: '/api/portal-connections/complete',
  },
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth || !auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /*
    501 rather than a silent success: an external caller still using this path must find out, loudly,
     instead of being handed a token that will not work.
  */
  return NextResponse.json(RETIRED, { status: 501 });
}
