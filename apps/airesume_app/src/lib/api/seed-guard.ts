import { NextRequest, NextResponse } from 'next/server';

/**
 * Production gate for development / demo seeding endpoints.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 *
 * A handful of routes in this app write **synthetic** data: fabricated ATS
 * scores, demo users with known passwords, active subscriptions that were never
 * paid for, mockup job applications. They are development and demo aids, and in
 * production they are a liability in three separate ways:
 *
 *   1. **Fabricated scores are indistinguishable from real ones.** Once seeded
 *      data is in a production database, every score-reading surface lies and
 *      there is no way to tell which rows are fiction.
 *   2. **A seeded account with a known password is a free account for anyone who
 *      reads this repository** — and this repository is public. `password123`
 *      and the seed endpoints' paths are not secrets.
 *   3. **They are reachable by any authenticated user.** `src/proxy.ts` gates
 *      `/api/*` deny-by-default, so these are not open to the internet — but
 *      "requires a session" is not the same as "operator only", and a free-tier
 *      signup is a session. `/api/add-mockup-jobs` granted an *active pro
 *      subscription* to any signed-in caller.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GATE
 *
 *   1. In production, refuse with **404** unless `<PREFIX>_ENABLED === 'true'`.
 *      404 rather than 403 deliberately: the endpoint should not be
 *      *discoverable* in production, and a 403 confirms that it exists.
 *   2. When explicitly enabled, additionally require an `x-seed-secret` header
 *      matching `<PREFIX>_SECRET`. Turning a seed endpoint on must not be the
 *      same act as opening it — the secret is what makes it operator-only.
 *
 * It fails **closed**: forgetting to set the variable disables the endpoint
 * rather than exposing it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 *
 *     export async function POST(request: NextRequest) {
 *       const blocked = seedGateFailure(request, 'SEED_DASHBOARD');
 *       if (blocked) return blocked;
 *       …
 *     }
 *
 * `<PREFIX>` reads `<PREFIX>_ENABLED` and `<PREFIX>_SECRET` from the
 * environment. Both are documented in `.env.example`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ONE FUNCTION RATHER THAN A COPY PER ROUTE
 *
 * `seed-dashboard` carried its own private copy of this logic. The second route
 * that needed it did not have one at all, and shipped for months granting a pro
 * plan to any signed-in caller. That is the failure mode of a per-route guard:
 * the rule lives in whoever remembered to write it. The gate is stated once, and
 * a new seed route has one obvious thing to call.
 */

/**
 * @param request   the incoming request — the `x-seed-secret` header is read from it
 * @param envPrefix the environment-variable prefix, e.g. `'SEED_DASHBOARD'` reads
 *                  `SEED_DASHBOARD_ENABLED` and `SEED_DASHBOARD_SECRET`
 * @returns a response to return immediately when the call must be refused,
 *          or `null` when the caller may proceed
 */
export function seedGateFailure(request: NextRequest, envPrefix: string): NextResponse | null {
  const isProduction = process.env.NODE_ENV === 'production';
  const explicitlyEnabled = process.env[`${envPrefix}_ENABLED`] === 'true';

  if (isProduction && !explicitlyEnabled) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  if (explicitlyEnabled) {
    const expected = process.env[`${envPrefix}_SECRET`];
    const provided = request.headers.get('x-seed-secret');

    if (!expected || provided !== expected) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  return null;
}
