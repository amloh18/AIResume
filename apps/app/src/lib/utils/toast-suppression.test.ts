import { describe, it, expect, beforeEach } from 'vitest';
import {
  isToastSuppressedPath,
  setToastSuppression,
  isToastSuppressed,
  resetToastSuppression,
} from './toast-suppression';

/**
 * Regression guard for the shared toast-suppression policy.
 *
 * Both toast systems consult this module — the shadcn-style one in
 * `src/hooks/use-toast.ts` and the react-hot-toast wrapper in
 * `src/lib/hot-toast.ts`. The route lists used to be duplicated in two files, so
 * this suite pins the behaviour of the single shared copy.
 *
 * The bug that motivated the wrapper: suppression was previously attempted by
 * reassigning `toast` on the `import('react-hot-toast')` namespace, which throws
 * `Cannot set property toast of #<Object> which has only a getter` because module
 * namespace objects are immutable. Suppression now happens at the call boundary
 * via `isToastSuppressed()`.
 */

const PUBLIC_EXACT = ['/', '/features', '/templates', '/privacy-policy', '/terms', '/legal', '/editor'];
const PUBLIC_PREFIXED = [
  '/sign-in',
  '/sign-up',
  '/auth/callback',
  '/onboarding/step-2',
  '/welcome',
  '/admin/login',
  '/admin/unauthorized',
  '/force-logout',
];
const PRIVATE = ['/dashboard', '/dashboard/jobs', '/dashboard/settings', '/admin/dashboard', '/profile/amloh'];

describe('isToastSuppressedPath', () => {
  it('suppresses every public route for an unauthenticated visitor', () => {
    for (const path of [...PUBLIC_EXACT, ...PUBLIC_PREFIXED]) {
      expect(isToastSuppressedPath(path, false), `expected ${path} to be suppressed`).toBe(true);
    }
  });

  it('never suppresses for an authenticated user, even on a public route', () => {
    for (const path of [...PUBLIC_EXACT, ...PUBLIC_PREFIXED, ...PRIVATE]) {
      expect(isToastSuppressedPath(path, true), `expected ${path} to be allowed`).toBe(false);
    }
  });

  it('never suppresses on private routes for an unauthenticated visitor', () => {
    for (const path of PRIVATE) {
      expect(isToastSuppressedPath(path, false), `expected ${path} to be allowed`).toBe(false);
    }
  });

  it('allows toasts before the route is known', () => {
    expect(isToastSuppressedPath(null, false)).toBe(false);
    expect(isToastSuppressedPath(undefined, false)).toBe(false);
  });

  it('matches exact routes exactly, not as prefixes', () => {
    // '/editor' is in the exact list; a sibling route must not inherit suppression
    // from it (this is the difference between the exact and prefix lists).
    expect(isToastSuppressedPath('/editor', false)).toBe(true);
    expect(isToastSuppressedPath('/editor-notes', false)).toBe(false);
    expect(isToastSuppressedPath('/termsofservice', false)).toBe(false);
  });

  it('matches prefixed routes by prefix', () => {
    expect(isToastSuppressedPath('/sign-in/verify', false)).toBe(true);
    expect(isToastSuppressedPath('/auth/reset-password/token', false)).toBe(true);
    expect(isToastSuppressedPath('/onboarding', false)).toBe(true);
  });
});

describe('current-route state', () => {
  beforeEach(() => resetToastSuppression());

  it('starts unsuppressed so early calls are not silently dropped', () => {
    expect(isToastSuppressed()).toBe(false);
  });

  it('follows setToastSuppression for a public route', () => {
    setToastSuppression('/', false);
    expect(isToastSuppressed()).toBe(true);
  });

  it('flips back once the visitor is authenticated or leaves the public route', () => {
    setToastSuppression('/', false);
    expect(isToastSuppressed()).toBe(true);

    setToastSuppression('/dashboard', false);
    expect(isToastSuppressed()).toBe(false);

    setToastSuppression('/', true);
    expect(isToastSuppressed()).toBe(false);
  });
});
