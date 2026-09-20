/**
 * Local-development-only login bypass.
 *
 * The bypass exists so you can sign in as a seeded user or admin without going
 * through 2FA, OAuth or a real password. It is intentionally hard to enable in a
 * deployed environment, because it is a full authentication bypass.
 *
 * Two independent gates, both of which must pass:
 *
 *   1. Environment. Enabled when `NODE_ENV !== 'production'`, OR when
 *      `ENABLE_DEV_BYPASS=true` is set explicitly. The second form exists because
 *      `next build && next start` — and a local Docker run — both report
 *      `NODE_ENV=production`, which otherwise hides the bypass while you are still
 *      working on your own machine.
 *
 *   2. Origin (server-side only). The request must come from localhost. So even if
 *      `ENABLE_DEV_BYPASS=true` is accidentally left set on a real deployment, the
 *      bypass only answers requests made from the machine itself.
 *
 * The client-side flag is a cosmetic hint used to decide whether to render the
 * buttons. It is NOT a security boundary — the route re-checks on every request.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/** Is the bypass switched on for this process? */
export function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_DEV_BYPASS === 'true'
  );
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
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_BYPASS === 'true';
