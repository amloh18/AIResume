import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for the 2FA sign-in failure.
 *
 * The sign-in flow called POST /api/auth/two-factor/verify and then
 * POST /api/auth/complete-two-factor-signin with the same sessionId. The first call
 * consumed the single-use code, so the second always failed with
 * "Invalid or expired session. Please sign in again." and nobody with 2FA enabled
 * could sign in.
 *
 * The fix splits the two operations: `consume: false` peeks (and must not burn an
 * attempt), `consume: true` burns the code exactly once.
 *
 * The statics on VerificationToken are plain functions attached to the schema, so they
 * can be exercised against an in-memory fake that implements the same query surface.
 * That keeps this a real test of the session logic without needing MongoDB.
 */

interface FakeDoc {
  _id: string;
  token: string;
  userId: string;
  email: string;
  code: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
}

/** Minimal stand-in for the Mongoose model surface the statics use. */
function makeFakeModel(doc: FakeDoc | null) {
  let current: FakeDoc | null = doc ? { ...doc } : null;

  const model = {
    _get: () => current,
    findOne: vi.fn(async (filter: any) => {
      if (!current) return null;
      if (filter.token && current.token !== filter.token) return null;
      if (filter.type && filter.type !== 'two-factor') return null;
      return { ...current };
    }),
    findOneAndUpdate: vi.fn(async (_filter: any, update: any) => {
      if (!current) return null;
      current = { ...current, attempts: current.attempts + (update.$inc?.attempts ?? 0) };
      return { ...current };
    }),
    findOneAndDelete: vi.fn(async (_filter: any) => {
      if (!current) return null;
      const deleted = { ...current };
      current = null;
      return deleted;
    }),
    deleteOne: vi.fn(async (_filter: any) => {
      current = null;
      return { deletedCount: 1 };
    }),
  };

  return model;
}

const baseDoc = (over: Partial<FakeDoc> = {}): FakeDoc => ({
  _id: 'doc1',
  token: 'session-abc',
  userId: 'user1',
  email: 'a@example.com',
  code: '428193',
  attempts: 0,
  maxAttempts: 3,
  expiresAt: new Date(Date.now() + 60_000),
  ...over,
});

describe('2FA session verification', () => {
  let VerificationToken: any;

  beforeEach(async () => {
    vi.resetModules();
    ({ default: VerificationToken } = await import('@/models/VerificationToken'));
  });

  const verify = (model: any, sessionId: string, code: string, options?: any) =>
    VerificationToken.verifyTwoFactorSession.call(model, sessionId, code, options);

  it('a peek (consume: false) must NOT destroy the session', async () => {
    const model = makeFakeModel(baseDoc());

    const result = await verify(model, 'session-abc', '428193', { consume: false });

    expect(result.valid).toBe(true);
    expect(result.userId).toBe('user1');
    // The session must still be there for the follow-up "complete sign-in" call.
    expect(model._get()).not.toBeNull();
    expect(model.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('peek-then-consume succeeds — the exact sequence that used to fail', async () => {
    const model = makeFakeModel(baseDoc());

    const peeked = await verify(model, 'session-abc', '428193', { consume: false });
    const completed = await verify(model, 'session-abc', '428193', { consume: true });

    expect(peeked.valid).toBe(true);
    expect(completed.valid).toBe(true);
    expect(completed.userId).toBe('user1');
  });

  it('a correct code does not burn an attempt in either mode', async () => {
    const model = makeFakeModel(baseDoc());

    await verify(model, 'session-abc', '428193', { consume: false });
    expect(model._get()?.attempts).toBe(0);

    await verify(model, 'session-abc', '428193', { consume: true });
    // Consumed, so the doc is gone; the point is it was never incremented first.
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('consumes exactly once — a replay of the same code fails', async () => {
    const model = makeFakeModel(baseDoc());

    const first = await verify(model, 'session-abc', '428193', { consume: true });
    const replay = await verify(model, 'session-abc', '428193', { consume: true });

    expect(first.valid).toBe(true);
    expect(replay.valid).toBe(false);
    expect(replay.error).toContain('Invalid or expired session');
  });

  it('defaults to consuming, preserving the existing callers', async () => {
    const model = makeFakeModel(baseDoc());

    const result = await verify(model, 'session-abc', '428193');

    expect(result.valid).toBe(true);
    expect(model._get()).toBeNull();
  });

  it('counts a wrong code and reports the remaining attempts', async () => {
    const model = makeFakeModel(baseDoc());

    const result = await verify(model, 'session-abc', '000000', { consume: false });

    expect(result.valid).toBe(false);
    expect(result.attemptsRemaining).toBe(2);
    expect(model._get()?.attempts).toBe(1);
  });

  it('locks out and destroys the session after maxAttempts wrong codes', async () => {
    const model = makeFakeModel(baseDoc({ attempts: 2 }));

    const result = await verify(model, 'session-abc', '000000', { consume: false });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Too many failed attempts');
    expect(model._get()).toBeNull();
  });

  it('rejects an already-exhausted session even if the code is correct', async () => {
    const model = makeFakeModel(baseDoc({ attempts: 3 }));

    const result = await verify(model, 'session-abc', '428193', { consume: true });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Too many failed attempts');
  });

  it('rejects an unknown session', async () => {
    const model = makeFakeModel(null);

    const result = await verify(model, 'nope', '428193', { consume: true });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid or expired session');
  });

  it('honours a per-session attempt ceiling', async () => {
    const model = makeFakeModel(baseDoc({ attempts: 4, maxAttempts: 5 }));

    const result = await verify(model, 'session-abc', '000000', { consume: false });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Too many failed attempts');
  });
});
