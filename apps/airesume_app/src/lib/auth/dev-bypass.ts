/**
 * Local-development-only login bypass.
 *
 * The bypass exists so you can sign in as a seeded user or admin without going
 * through 2FA, OAuth or a real password. It is intentionally impossible to enable in a
 * deployed environment, because it is a full authentication bypass.
 *
 * Two gates, both of which must pass:
 *
 *   1. Environment. Enabled only when `NODE_ENV !== 'production'`. The old escape
 *      hatch (`ENABLE_DEV_BYPASS=true`) is gone: `Host` is a client-controlled header, so
 *      anyone who can reach the origin directly — port 3001 is published on 0.0.0.0 and UFW
 *      is not enabled — could send `Host: localhost` and satisfy gate 2 while gate 1 was
 *      satisfied by a single stray env var. A production build can no longer be talked into
 *      switching this on. Use `next dev` locally instead; the hatch only ever existed to
 *      support `next start` locally, which is a far smaller loss than an auth bypass.
 *
 *   2. Origin (server-side only). The request must claim to come from localhost. This is a
 *      second gate, not a security boundary on its own — see above.
 *
 * Nothing in `src/` currently imports this module (there is no bypass login route); it is
 * kept hardened rather than deleted so wiring it up later cannot reintroduce the hole.
 *
 * The client-side flag is a cosmetic hint used to decide whether to render the
 * buttons. It is NOT a security boundary — the route re-checks on every request.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/** Is the bypass switched on for this process? Never true in a production build. */
export function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** Strip the port from a Host header value. */
function hostnameOf(host: string): string {
  const value = host.trim().toLowerCase();
  if (value.startsWith('[')) {
    // IPv6 literal, e.g. "[::1]:3000"
    const end = value.indexOf(']');
    return end === -1 ? value : value.slice(0, end + 1);
  }
  return value.split(':')[0];
}

/**
 * Server-side gate. Returns true only when the bypass is enabled AND the request
 * originated from this machine.
 */
export function isDevBypassRequestAllowed(host: string | null | undefined): boolean {
  if (!isDevBypassEnabled()) return false;
  if (!host) return false;
  return LOCAL_HOSTNAMES.has(hostnameOf(host));
}

/**
 * Client-side hint for rendering the bypass buttons.
 *
 * `process.env.NODE_ENV` and `NEXT_PUBLIC_*` are inlined at build time, so this
 * evaluates to a constant in the browser bundle.
 */
export const DEV_BYPASS_CLIENT_ENABLED: boolean =
  process.env.NODE_ENV !== 'production';
