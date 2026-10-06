/**
 * Unified NextAuth Configuration — lazily resolved.
 *
 * This file uses UnifiedAuthService for all authentication operations.
 * The UnifiedAuthService provides:
 * - Minimal JWT payload (only id, email) to prevent 431 errors
 * - Redis caching for user data (5-minute TTL)
 * - Fresh data fetch on each session check
 * - No localStorage usage (security improvement)
 * - HTTP-only cookies exclusively
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A PROXY (do not "simplify" back to a plain object)
 *
 * `UnifiedAuthService.getAuthConfig()` throws when `NEXTAUTH_SECRET` is absent.
 * Calling it at module scope made the *build* require a *runtime* secret:
 * Next.js imports every route module during the "Collecting page data" phase,
 * so `next build` inside Docker died with
 *
 *     Error: Failed to collect page data for /api/admin/analytics/subscriptions
 *     [cause]: Error: NEXTAUTH_SECRET environment variable is required
 *
 * It only ever passed locally because `.env.local` supplied the secret, and
 * `.dockerignore` excludes `.env*` from the build context. A production build
 * must never depend on runtime secrets, so resolution is deferred to first
 * property access — i.e. request time. The guard itself is unchanged: a
 * genuinely misconfigured runtime still fails loudly, just later and once.
 *
 * The trap set is deliberate:
 *   get / set
 *     next-auth both reads `options.secret` and *writes it back*
 *     (`options.secret ??= process.env.NEXTAUTH_SECRET` in
 *     next-auth/next/index.js, in both the route and the API handler).
 *   ownKeys + getOwnPropertyDescriptor
 *     `getServerSession()` does `Object.assign({}, options, { providers: [] })`,
 *     which walks own keys *and* their descriptors. Descriptors must be
 *     reported `configurable: true`, otherwise the assignment trips a Proxy
 *     invariant and throws a TypeError at runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NextAuthOptions } from 'next-auth';
import { UnifiedAuthService } from './auth/unified-auth-service';

/** Resolved once, on first property access. */
let resolvedConfig: NextAuthOptions | null = null;

function resolveAuthConfig(): NextAuthOptions {
  if (!resolvedConfig) {
    resolvedConfig = UnifiedAuthService.getAuthConfig();
  }
  return resolvedConfig;
}

/**
 * The resolved config viewed as an indexable record, so the traps below can use
 * a dynamic `prop`. `AuthOptions` has no index signature, hence the double
 * assertion — a single `as` is rejected by the compiler.
 */
function configRecord(): Record<PropertyKey, unknown> {
  return resolveAuthConfig() as unknown as Record<PropertyKey, unknown>;
}

export const authConfig: NextAuthOptions = new Proxy({} as NextAuthOptions, {
  get(_target, prop) {
    return configRecord()[prop];
  },

  set(_target, prop, value) {
    configRecord()[prop] = value;
    return true;
  },

  has(_target, prop) {
    return prop in resolveAuthConfig();
  },

  ownKeys() {
    return Reflect.ownKeys(resolveAuthConfig());
  },

  getOwnPropertyDescriptor(_target, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(resolveAuthConfig(), prop);
    if (!descriptor) return undefined;
    // `configurable: true` is required — the proxy target is an empty object,
    // so reporting a non-configurable descriptor for a property the target does
    // not own violates the Proxy invariants and throws.
    return { ...descriptor, configurable: true };
  },

  deleteProperty(_target, prop) {
    delete configRecord()[prop];
    return true;
  },
});

export default authConfig;
