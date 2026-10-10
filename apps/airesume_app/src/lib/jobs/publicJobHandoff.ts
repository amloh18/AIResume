/**
 * Public → authenticated handoff.
 *
 * When an anonymous visitor clicks "Apply with AIResume" on a public job we must
 * send them through the *existing* sign-in/registration flow while preserving the
 * job they chose, and then land them in Journey → Analysis for that job.
 *
 * Two things make this safe:
 *
 *   1. **The destination is a validated internal path.** `isSafeInternalPath`
 *      rejects absolute URLs, protocol-relative URLs (`//evil.com`), backslash
 *      tricks and encoded schemes. The server-side NextAuth `redirect` callback
 *      enforces the same rule, but the client also assigns `window.location`
 *      directly in places, so the check has to exist on both sides.
 *   2. **The job is identified by its canonical id, never by an application id.**
 *      The canonical id is a content hash of the listing, so it is stable across
 *      sessions and cannot be used to address another user's application.
 *
 * Nothing here creates an application or consumes quota — that only happens
 * *after* authentication, inside the authenticated Jobs Hub.
 */

/** Query flag marking a `jobId` deep link as "came from a public job page". */
export const PUBLIC_HANDOFF_FLAG = 'fromPublic';

/** Hard cap on the canonical id we will echo into a URL. */
const MAX_ID_LENGTH = 128;

/** Only these characters may appear in the job identifier we put in a URL. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

/**
 * True when `path` is a safe, internal, relative destination.
 *
 * Rejects (all of which have been used to build open redirects):
 *   - absolute URLs      `https://evil.com`
 *   - protocol-relative  `//evil.com`
 *   - backslash escapes  `/\evil.com`
 *   - scheme-ish strings `javascript:...`
 */
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  const trimmed = path.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  // Must be a single leading slash, and the next char must not be another slash
  // or a backslash (which browsers normalise to a slash).
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return false;
  // A colon before any slash means a scheme is present.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

/**
 * The authenticated destination for a job chosen on a public page.
 *
 * Points at the Jobs Hub with `jobId` + the public-handoff flag. The Hub already
 * understands `?tab=applications&jobId=...`; the flag tells it to *provision* a
 * saved application from the canonical listing when none exists yet (deduped by
 * the existing `checkForDuplicate`), rather than assuming the id is an
 * application id.
 *
 * Returns `null` for an unusable id so callers fall back to the plain Jobs Hub
 * instead of emitting a broken link.
 */
export function buildPublicJobReturnTo(canonicalId: string): string | null {
  const id = (canonicalId || '').trim();
  if (!id || id.length > MAX_ID_LENGTH || !SAFE_ID.test(id)) return null;
  return `/dashboard/jobs?tab=applications&jobId=${encodeURIComponent(id)}&${PUBLIC_HANDOFF_FLAG}=1`;
}

/**
 * The sign-in URL for "Apply with AIResume" on a public job.
 *
 * Falls back to a bare `/sign-in` when the id is unusable — a visitor can always
 * still register; they just lose the deep link back to this specific job.
 */
export function buildPublicApplyHref(canonicalId: string): string {
  const returnTo = buildPublicJobReturnTo(canonicalId);
  if (!returnTo) return '/sign-in';
  return `/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`;
}

/** Same, but for the registration page. */
export function buildPublicSignUpHref(canonicalId: string): string {
  const returnTo = buildPublicJobReturnTo(canonicalId);
  if (!returnTo) return '/sign-up';
  return `/sign-up?callbackUrl=${encodeURIComponent(returnTo)}`;
}
