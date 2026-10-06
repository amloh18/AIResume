/**
 * Cron request authentication.
 *
 * `/api/cron/*` is machine-to-machine: the scheduler sends `Authorization: Bearer <CRON_SECRET>` and no
 * session cookie. Two layers use this:
 *
 *   1. `src/proxy.ts` — the proxy used to reject every one of these routes with 401 before the handler's
 *      own check could run, so no external scheduler could trigger anything. It now authenticates the
 *      request itself.
 *   2. the route handlers — their existing `CRON_SECRET` check stays as defence in depth.
 *
 * These routes only ever *read* a header, so this module has no Next.js or Node imports and can be
 * unit-tested directly.
 */

/** Header-like surface — satisfied by both `Headers` and `NextRequest['headers']`. */
export interface HeaderReader {
  get(name: string): string | null;
}

/**
 * The accepted secrets.
 *
 * `CRON_API_KEY` is included because `/api/cron/webhook-retry` already accepts it; treating the alias as
 * an unrecognised token would have made that endpoint unreachable.
 */
export function getCronSecrets(): string[] {
  return [process.env.CRON_SECRET, process.env.CRON_API_KEY].filter(
    (secret): secret is string => typeof secret === 'string' && secret.length > 0
  );
}

/**
 * Length-checked, constant-time string comparison.
 * Deliberately free of `node:crypto` so it works under both the Node and Edge proxy runtimes.
 */
export function tokensMatch(presented: string, expected: string): boolean {
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i++) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * True when the request carries a valid cron credential.
 *
 * Two header forms are accepted, both compared in constant time against every configured secret:
 *
 *   Authorization: Bearer <secret>   — the form the proxy authenticates (src/proxy.ts);
 *   X-Api-Key: <secret>              — the form `/api/cron/billing` and `/api/cron/sessions/cleanup`
 *                                      used historically. Kept as an alias so migrating those routes
 *                                      to this shared check does not break an existing scheduler entry
 *                                      that only sets the header.
 *
 * Returns false when no secret is configured. That is not an accident: the proxy rejected these routes
 * unconditionally before this module existed, and failing closed means a missing `CRON_SECRET` can never
 * silently turn every cron endpoint into a public one.
 */
export function isAuthorizedCronRequest(headers: HeaderReader): boolean {
  const secrets = getCronSecrets();
  if (secrets.length === 0) return false;

  const header = (headers.get('authorization') || '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) {
    const presented = match[1].trim();
    return secrets.some((secret) => tokensMatch(presented, secret));
  }

  const apiKey = (headers.get('x-api-key') || '').trim();
  if (apiKey) {
    return secrets.some((secret) => tokensMatch(apiKey, secret));
  }

  return false;
}
