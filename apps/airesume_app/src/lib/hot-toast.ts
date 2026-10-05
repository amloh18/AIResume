'use client';

/**
 * Route-aware wrapper around `react-hot-toast`.
 *
 * ## Why this file exists
 *
 * Toasts were previously suppressed by reassigning `toast` on the object returned
 * by `import('react-hot-toast')`. That throws:
 *
 *     TypeError: Cannot set property toast of #<Object> which has only a getter
 *
 * because a module namespace object is immutable by spec — its properties are
 * getters with no setter — and `react-hot-toast` ships a real ESM build
 * (`dist/index.mjs`) that the bundler resolves to. No amount of casting fixes it;
 * the namespace can never be written to.
 *
 * ## What it does instead
 *
 * Gate at the **call boundary**, mirroring what `src/hooks/use-toast.ts` already
 * does for the shadcn-style toaster: on a public page the display-producing calls
 * become no-ops. Nothing is monkey-patched.
 *
 * `dismiss` / `dismissAll` / `remove` / `removeAll` deliberately pass through —
 * they are how the store gets drained, and gating them would strand toasts.
 *
 * Import this instead of `react-hot-toast`. Everything else (notably `<Toaster/>`)
 * is re-exported unchanged.
 */

import { toast as rawToast } from 'react-hot-toast';
import { isToastSuppressed } from '@/lib/utils/toast-suppression';

export * from 'react-hot-toast';

/** What a real toast call returns, so suppressed callers can still `.dismiss()`. */
const suppressedToast = () => ({ id: 'suppressed', dismiss() {}, unmount() {} });

/** Wrap a display-producing method so it no-ops while suppressed. */
const gate = <T extends (...args: never[]) => unknown>(fn: T): T =>
  ((...args: Parameters<T>) => (isToastSuppressed() ? suppressedToast() : fn(...args))) as T;

const gated = ((...args: Parameters<typeof rawToast>) =>
  isToastSuppressed() ? suppressedToast() : rawToast(...args)) as typeof rawToast;

// Start from the real implementation so every method is present (including any
// added by a future version), then override the calls that would render something.
Object.assign(gated, rawToast);

gated.error = gate(rawToast.error);
gated.success = gate(rawToast.success);
gated.loading = gate(rawToast.loading);
gated.custom = gate(rawToast.custom);

// `promise` is not simply no-op'd: callers await it for the resolved value, so it
// must still settle. While suppressed we return the promise untouched, creating no
// loading/success/error toast at all.
type PromiseArgs = Parameters<typeof rawToast.promise>;
gated.promise = (<T>(...args: PromiseArgs) => {
  const [promise] = args;
  const resolved = typeof promise === 'function' ? (promise as () => Promise<T>)() : promise;
  return isToastSuppressed() ? resolved : (rawToast.promise(...args) as Promise<T>);
}) as typeof rawToast.promise;

export const toast = gated;
export default gated;
