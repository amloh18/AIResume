/**
 * Correlation context for **Node** code (route handlers, workers, crons).
 *
 * `AsyncLocalStorage` is what lets a log written deep inside `processApplication` — several awaits
 * removed from anything request-shaped — still carry the id minted when the user clicked "Apply".
 * Edge runtimes have no `node:async_hooks`, which is why the id primitives live in the sibling
 * `correlation-id.ts` and only this Node module imports them.
 *
 * Importing this module also wires the structured logger: the provider registered below is what
 * makes every `log.*` call emit `correlationId` automatically inside a tracked context.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { setLogContextProvider } from '@/lib/structured-logger';
import {
  CORRELATION_HEADER,
  newCorrelationId,
  resolveCorrelationId,
  sanitizeIncomingCorrelationId,
} from './correlation-id';

export { CORRELATION_HEADER, newCorrelationId, resolveCorrelationId, sanitizeIncomingCorrelationId };

export interface CorrelationContext {
  correlationId: string;
  userId?: string;
  applicationId?: string;
  queueItemId?: string;
  jobId?: string;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

/** Run `fn` with `ctx` as the ambient correlation context for everything it awaits. */
export function runWithCorrelation<T>(
  ctx: Partial<CorrelationContext>,
  fn: () => T
): T {
  const correlationId = ctx.correlationId || newCorrelationId();
  return storage.run({ ...ctx, correlationId } as CorrelationContext, fn);
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/**
 * Enrich the *current* context (e.g. once the queue item is known). No-ops outside a context —
 * correlation is observability, never a precondition for logic.
 */
export function setCorrelationFields(fields: Omit<Partial<CorrelationContext>, 'correlationId'>): void {
  const store = storage.getStore();
  if (store) Object.assign(store, fields);
}

// Auto-registration: any Node code that touches correlation gets correlation-tagged logs for free,
// with no per-entrypoint setup step to forget.
setLogContextProvider(() => getCorrelationContext());
