/**
 * Single source of truth for the NextAuth session-cookie name and its `Secure`
 * flag.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 *
 * The session cookie name is `__Secure-next-auth.session-token` only when the
 * app is actually served over HTTPS. That decision was previously duplicated in
 * four places, and **two of them used a different condition**:
 *
 *   src/lib/auth/unified-auth-service.ts   NODE_ENV === 'production'
 *                                          && NEXTAUTH_URL.startsWith('https://')
 *   src/app/api/auth/create-session/route.ts   NODE_ENV === 'production'   ← alone
 *   src/app/api/auth/dev-bypass/route.ts       hardcoded 'next-auth.session-token'
 *   src/app/api/auth/signout/route.ts          both prefixes cleared (workaround)
 *
 * Whenever `NODE_ENV === 'production'` but `NEXTAUTH_URL` is unset or not https
 * — a container that never got the variable, or one sitting behind a proxy that
 * terminates TLS and forwards `http://` — those two conditions disagree:
 *
 *   create-session wrote  `__Secure-next-auth.session-token`
 *   getToken() read       `next-auth.session-token`
 *
 * A `Set-Cookie` under a name nobody reads means the browser *has* a session
 * cookie and the app never sees it. The failure mode is especially confusing
 * because everything upstream succeeds: the code verifies, the JWT is signed,
 * and the `LoginSession` row is written — so the database fills with perfectly
 * valid sessions while every sign-in bounces straight back to `/sign-in`.
 *
 * That is the whole bug. Do not re-derive the name anywhere; import it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE
 *
 * `secure` and the `__Secure-` prefix must always agree, and must match what
 * `next-auth`'s own `getToken()` will look for. `getToken()` decides using
 * `process.env.NEXTAUTH_URL?.startsWith('https://') ?? !!process.env.VERCEL`,
 * so we mirror exactly that and add the `NODE_ENV` guard so a local HTTP dev
 * server never emits a `Secure` cookie (which browsers drop over plain HTTP).
 */

/** The insecure cookie name — what NextAuth uses when not on HTTPS. */
export const INSECURE_SESSION_COOKIE = 'next-auth.session-token';

/** The `__Secure-` prefixed name — only valid together with `Secure`. */
export const SECURE_SESSION_COOKIE = `__Secure-${INSECURE_SESSION_COOKIE}`;

/**
 * Is this deployment serving over HTTPS?
 *
 * Mirrors next-auth's own `getToken()` default so the writer and the reader can
 * never disagree. `AUTH_URL` is accepted as an alias because newer next-auth
 * versions prefer it over `NEXTAUTH_URL`.
 */
export function isSecureSessionCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  const url = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
  return url.startsWith('https://');
}

/** The cookie name to write and to read. */
export function getSessionCookieName(): string {
  return isSecureSessionCookie() ? SECURE_SESSION_COOKIE : INSECURE_SESSION_COOKIE;
}

/**
 * Attributes for the session cookie.
 *
 * `httpOnly` + `sameSite: 'lax'` + `path: '/'` match the NextAuth config in
 * `unified-auth-service.ts`; keep them in step or the cookie NextAuth overwrites
 * will differ from the one we set.
 */
export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: isSecureSessionCookie(),
    maxAge: maxAgeSeconds,
  };
}

let warnedAboutMissingUrl = false;

/**
 * Warn loudly, once per process, when production is missing an HTTPS
 * `NEXTAUTH_URL`.
 *
 * Two things break in that state and neither is obvious from the symptom:
 *
 *   1. OAuth. NextAuth builds the provider `redirect_uri` from `NEXTAUTH_URL`,
 *      so an unset value becomes `http://localhost:3000/api/auth/callback/google`
 *      and the provider rejects the sign-in with `redirect_uri_mismatch`.
 *   2. The cookie name above, which is why sign-in can appear to work and then
 *      bounce to `/sign-in`.
 *
 * Safe to call on any auth request path; it only logs.
 */
export function warnIfAuthUrlUnusable(): void {
  if (warnedAboutMissingUrl) return;
  if (process.env.NODE_ENV !== 'production') return;

  const url = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (url && url.startsWith('https://')) return;

  warnedAboutMissingUrl = true;
  console.error(
    '[auth] NEXTAUTH_URL is missing or not https in production. ' +
      'OAuth callbacks will be built against the wrong origin (redirect_uri_mismatch) ' +
      `and the session cookie will be named "${getSessionCookieName()}". ` +
      'Set NEXTAUTH_URL to the public https origin, e.g. https://buildairesume.com'
  );
}
