/**
 * Edge Runtime logger — now a **re-export**, not a fourth logger.
 *
 * `src/proxy.ts` runs in the edge runtime, where `node:async_hooks` (and therefore the correlation
 * AsyncLocalStorage) is unavailable, so it historically got its own `log` object with its own output
 * shape. The formatting, level gating and JSON shape now all come from the one structured logger,
 * which is edge-safe by construction (it guards every `process.env` access).
 *
 * The only thing edge code loses is *ambient* correlation context — the proxy therefore passes its
 * correlation id explicitly in the `context` argument of the calls it makes.
 */

export { log } from '@/lib/structured-logger';
