/**
 * Correlation ID primitives — **edge-safe** (no `node:*` imports).
 *
 * The ID is minted in `src/proxy.ts` (edge runtime) and travels two ways:
 *   - as the `x-correlation-id` response header, so a browser/CDN log line can be matched to ours;
 *   - as a forwarded request header, so route handlers can pick it up.
 *
 * It is then persisted on queue documents (`ApplicationQueue.correlationId`,
 * `ApplicationEmailQueue.correlationId`) so a *background* worker — which has no request at all —
 * can re-open the same trace when it eventually runs. That chain is the whole point:
 *
 *     request → route → queue document → worker → logs
 *
 * The async-context half (AsyncLocalStorage) lives in `./correlation.ts`, which is Node-only and must
 * never be imported from edge code.
 */

export const CORRELATION_HEADER = 'x-correlation-id';

/** Bounded, printable, log-safe: this value ends up inside log lines we do not control. */
export function sanitizeIncomingCorrelationId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 128) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) return null;
  return value;
}

/**
 * Mint a new id. Uses `crypto.randomUUID()` where available (all supported runtimes) and falls back
 * to a time+random pair so an exotic runtime still produces a usable, unique-enough id.
 */
export function newCorrelationId(): string {
  try {
    const cryptoRef = (globalThis as any).crypto;
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  } catch {
    /* fall through */
  }
  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Reuse the caller's id when it is sane, otherwise mint one. */
export function resolveCorrelationId(raw: string | null | undefined): string {
  return sanitizeIncomingCorrelationId(raw) || newCorrelationId();
}
