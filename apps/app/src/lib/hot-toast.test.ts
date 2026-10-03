import { describe, it, expect, beforeEach } from 'vitest';
import { toast, Toaster, useToaster } from '@/lib/hot-toast';
import { setToastSuppression, resetToastSuppression } from '@/lib/utils/toast-suppression';

/**
 * Regression guard for the toast-suppression crash.
 *
 * The original implementation did:
 *
 *     const mod = await import('react-hot-toast');
 *     mod.toast = Object.assign(noop, mod.toast);   // 💥
 *
 * which throws `TypeError: Cannot set property toast of #<Object> which has only a
 * getter` — a module namespace object is immutable by spec, and react-hot-toast
 * ships a real ESM build (`dist/index.mjs`) that the bundler resolves to.
 *
 * The fix gates at the call boundary instead. These tests assert the gate works
 * and, crucially, that gating did not break call-site semantics.
 */

const PUBLIC = ['/', '/editor', '/sign-in'];
const PRIVATE = ['/dashboard', '/dashboard/jobs'];

beforeEach(() => resetToastSuppression());

describe('react-hot-toast wrapper: re-exports', () => {
  it('still exposes the rest of the package', () => {
    // Guards the `export * from 'react-hot-toast'` line: if it were dropped, the
    // <Toaster/> that paints every toast would be undefined.
    expect(Toaster).toBeDefined();
    expect(typeof useToaster).toBe('function');
  });

  it('exposes the full toast API, including the cleanup methods', () => {
    for (const method of ['error', 'success', 'loading', 'custom', 'promise'] as const) {
      expect(typeof toast[method], `toast.${method}`).toBe('function');
    }
    // Pass-through methods — gating these would strand toasts in the store.
    for (const method of ['dismiss', 'dismissAll', 'remove', 'removeAll'] as const) {
      expect(typeof toast[method], `toast.${method}`).toBe('function');
    }
  });
});

describe('react-hot-toast wrapper: suppression', () => {
  it('no-ops every display-producing call on a public route', () => {
    setToastSuppression(PUBLIC[0], false);

    expect(toast('plain')).toEqual(expect.objectContaining({ id: 'suppressed' }));
    expect(toast.success('ok')).toEqual(expect.objectContaining({ id: 'suppressed' }));
    expect(toast.error('bad')).toEqual(expect.objectContaining({ id: 'suppressed' }));
    expect(toast.loading('wait')).toEqual(expect.objectContaining({ id: 'suppressed' }));
    expect(toast.custom(() => null as any)).toEqual(expect.objectContaining({ id: 'suppressed' }));
  });

  it('lets the same calls through on a private route', () => {
    setToastSuppression(PRIVATE[0], false);

    const id = toast.success('ok');
    expect(id).not.toBe('suppressed');
    expect(typeof id).toBe('string');

    // leave the store clean for other suites
    toast.removeAll();
  });

  it('does not gate the cleanup calls, so the store can always be drained', () => {
    setToastSuppression(PUBLIC[0], false);

    // These must be no-throw and must not return the suppressed stub.
    expect(() => toast.dismiss()).not.toThrow();
    expect(() => toast.removeAll()).not.toThrow();
    expect(toast.dismiss()).toBeUndefined();
  });
});

describe('react-hot-toast wrapper: promise semantics', () => {
  it('still resolves with the awaited value while suppressed', async () => {
    setToastSuppression(PUBLIC[0], false);

    const result = await toast.promise(Promise.resolve(42), { loading: 'l', success: 's' });
    expect(result).toBe(42);
  });

  it('still resolves with the awaited value when not suppressed', async () => {
    setToastSuppression(PRIVATE[0], false);

    const result = await toast.promise(Promise.resolve('done'), { loading: 'l', success: 's' });
    expect(result).toBe('done');

    toast.removeAll();
  });

  it('accepts a thunk, matching the underlying API', async () => {
    setToastSuppression(PUBLIC[0], false);

    const result = await toast.promise(async () => 'thunked', { loading: 'l' });
    expect(result).toBe('thunked');
  });
});
