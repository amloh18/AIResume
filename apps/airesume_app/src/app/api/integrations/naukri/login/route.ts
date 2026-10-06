import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

/**
 * POST /api/integrations/naukri/login — RETIRED.
 *
 * ## Why this no longer accepts a login
 *
 * This route *did* call Naukri's central-login endpoint for real, but it treated failure as success. When
 * Naukri rejected the credentials — or when the request threw — it fell through to:
 *
 *     userSessionToken = `naukri_auth_${Buffer.from(`${email}:${Date.now()}`).toString('base64')}`;
 *
 * and went on to set `sessionStatus: 'active'` regardless. So a wrong password produced a "connected"
 * Naukri account holding a token that was a base64 of the email and a timestamp. Every downstream check
 * that trusted `sessionStatus` was reading a value that did not mean what it said.
 *
 * Two further problems, both shared with the Indeed equivalent:
 *
 *  1. It collected a job-site **password**. Passwords must never reach this server (see the account
 *     connection rules in `AGENTS.md`).
 *  2. It wrote to `User.naukriIntegration`, the **legacy** store. The canonical record is the
 *     `PortalConnection` collection, which is what Settings and onboarding read — so a connection written
 *     here never appeared in the product.
 *
 * ## Where connections go now
 *
 * `POST /api/portal-connections/complete` — the canonical endpoint. It validates the provider, rejects any
 * credential-shaped field server-side, and writes the one record the UI reads.
 *
 * The extension's cookie hand-off is unaffected: that is `POST /api/integrations/naukri/session`, which
 * this change deliberately leaves in place.
 */

const RETIRED = {
  error: {
    code: 'ENDPOINT_RETIRED',
    message:
      'Password-based account linking is no longer supported. Connect your Naukri account from Settings → Connected Job Accounts.',
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
