/**
 * Route-handler guard for `/api/cron/*`.
 *
 * Thin `NextResponse` wrapper around `./cronAuth` — that module stays free of Next.js imports so it can
 * be unit-tested directly; this one is the single call site every cron route uses.
 *
 * ## Why this exists
 *
 * Every cron route used to carry its own hand-rolled check, and most of them read:
 *
 *     const cronSecret = process.env.CRON_SECRET;
 *     if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { …401… }
 *
 * That guard is **fail-open**: when `CRON_SECRET` is unset the condition short-circuits on the first
 * term and the route runs for anyone who asks. `CRON_SECRET` being unset is exactly the situation on a
 * fresh deployment, so the failure mode is "the protection silently disappears" rather than "the
 * endpoint stops working" — the version nobody notices.
 *
 * A second variant was just as bad in a different way: comparing against
 * `` `Bearer ${process.env.CRON_SECRET}` `` with no secret set compares against the literal string
 * `"Bearer undefined"`, and one route fell back to a hard-coded `'dev-secret'`.
 *
 * `isAuthorizedCronRequest` returns false when no secret is configured, so this module **fails closed**.
 * A misconfigured deployment now gets a loud, distinguishable `503` instead of an open door.
 */

import { NextResponse } from 'next/server';
import { getCronSecrets, isAuthorizedCronRequest, type HeaderReader } from './cronAuth';

/**
 * Returns a response to send when the request is not an authorised cron call, or `null` when it is.
 *
 * Usage — the early return is what makes it impossible to forget:
 *
 *     const denied = cronAuthFailure(request.headers);
 *     if (denied) return denied;
 */
export function cronAuthFailure(headers: HeaderReader): NextResponse | null {
  if (isAuthorizedCronRequest(headers)) return null;

  /*
    Distinguish "no secret configured" from "wrong secret". Both refuse the request, but only the first
    is an operator error, and it needs to be visible in monitoring rather than looking like a bad token.
  */
  if (getCronSecrets().length === 0) {
    console.error(
      '[cron-guard] Rejected a cron request because neither CRON_SECRET nor CRON_API_KEY is set. ' +
        'Cron endpoints fail closed; configure one of them to re-enable scheduled work.'
    );
    return NextResponse.json(
      {
        error: 'Cron authentication is not configured on this deployment',
        code: 'CRON_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: 'Unauthorized', code: 'CRON_UNAUTHORIZED' },
    { status: 401 }
  );
}
