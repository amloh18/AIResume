/**
 * Single source of truth for "should toasts be suppressed on this route?".
 *
 * The app has two independent toast systems — the shadcn-style one in
 * `src/hooks/use-toast.ts` and `react-hot-toast` (wrapped by `src/lib/hot-toast.ts`)
 * — and both must agree on which routes are public. Those route lists used to be
 * duplicated in two files and could silently drift apart, so they live here now.
 *
 * Suppression applies only to *unauthenticated* visitors: a signed-in user on
 * `/editor` still gets toasts.
 */

/** Route prefixes that never show toasts (matched with `startsWith`). */
const SUPPRESSED_ROUTE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/auth/',
  '/onboarding',
  '/welcome',
  '/admin/login',
  '/admin/unauthorized',
  '/force-logout',
] as const;

/** Public marketing/legal routes that never show toasts (matched exactly). */
const SUPPRESSED_ROUTE_EXACT = new Set<string>([
  '/',
  '/features',
  '/templates',
  '/privacy-policy',
  '/terms',
  '/legal',
  '/editor',
]);

/**
 * Pure predicate — safe to call during render and on the server.
 *
 * `pathname` is expected to be `usePathname()` output, i.e. without the query
 * string, so `/editor?cvId=…` arrives as `/editor`.
 */
export function isToastSuppressedPath(
  pathname: string | null | undefined,
  isAuthenticated: boolean
): boolean {
  if (!pathname) return false;
  if (isAuthenticated) return false;
  if (SUPPRESSED_ROUTE_EXACT.has(pathname)) return true;
  return SUPPRESSED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

// ── Current route state, readable from non-React code ────────────────────────
// `toast()` is called from event handlers and services, not components, so the
// suppression decision cannot come from a hook. ToastSuppressionGate pushes the
// current route here on every change.

let currentPathname: string | null = null;
let currentIsAuthenticated = false;

/** Called by `ToastSuppressionGate` on every route/auth change. */
export function setToastSuppression(pathname: string | null, isAuthenticated: boolean): void {
  currentPathname = pathname;
  currentIsAuthenticated = isAuthenticated;
}

/** Whether a toast fired *right now* should be dropped. */
export function isToastSuppressed(): boolean {
  return isToastSuppressedPath(currentPathname, currentIsAuthenticated);
}

/** Test/reset helper — clears the module-level route state. */
export function resetToastSuppression(): void {
  currentPathname = null;
  currentIsAuthenticated = false;
}
