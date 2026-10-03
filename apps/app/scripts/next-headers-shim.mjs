/**
 * `next/headers` shim for the standalone worker bundle.
 *
 * Why it is needed: the worker's module graph reaches Next.js request helpers indirectly —
 * `ai-api-helper` → `activityLogService` → (lazy) `@/lib/auth` → `unified-auth-service` → `next/headers`.
 * esbuild inlines the lazy import, so `next/headers` becomes a top-level specifier in `dist/worker.mjs`,
 * and plain Node cannot resolve it (`next` ships no `exports` map, so `next/headers` needs the `.js`
 * extension). Without this alias the worker dies at startup with ERR_MODULE_NOT_FOUND.
 *
 * Why throwing is the correct behaviour: these helpers only work inside a Next.js request scope. The
 * loops already ran in `instrumentation.register()`, i.e. *without* a request scope, so every call site
 * already encountered a throw there and handles it (the session lookup in `activityLogService` is
 * wrapped in `try/catch` and simply logs without a user). This shim keeps that behaviour and makes the
 * cause readable instead of a resolution crash.
 *
 * If a future code path genuinely needs request context in the worker, pass the values in explicitly —
 * do not try to reconstruct a request scope here.
 */

function unavailable(api) {
  return new Error(
    `next/headers.${api}() is not available in the standalone worker: there is no Next.js request scope. ` +
      'Pass the value in from the caller instead.'
  );
}

export function headers() {
  throw unavailable('headers');
}

export function cookies() {
  throw unavailable('cookies');
}

export function draftMode() {
  throw unavailable('draftMode');
}

export default { headers, cookies, draftMode };
