import { describe, it, expect } from 'vitest';
import {
  upsertLoginSession,
  isDuplicateKeyError,
  type LoginSessionWriteModel,
} from './session-service';

/**
 * Regression guard for the `E11000 … index: jti_1` noise in production.
 *
 * A browser fires its requests in parallel, so several `jwt` callbacks can each read
 * "no LoginSession row" before any of them has written and then all try to record the
 * *same* jti. Only one can win; the rest used to surface as
 * `Failed to re-record session: MongoServerError: E11000 duplicate key error …`, which is
 * indistinguishable in the logs from an actually broken database.
 *
 * These tests pin the two properties that make the race harmless:
 *   1. the write is an upsert keyed on jti, so it converges instead of colliding, and
 *   2. a lost insert race is absorbed by reading the winner's row.
 */

const JTI = '7f20105d-ea35-4ad5-9972-3dabfbee846b';
const USER_ID = '6aa9aecaa6d1d844dddf8e4f';

const EXISTING_ROW = { _id: 'row-1', jti: JTI, provider: 'credentials' } as any;

/** A model that behaves like MongoDB does for a single, uncontended writer. */
function uncontendedModel(returned: any = EXISTING_ROW) {
  const calls: Array<{ filter: any; update: any; options: any }> = [];
  const model: LoginSessionWriteModel & { calls: typeof calls; findOneCalls: any[] } = {
    calls,
    findOneCalls: [],
    async findOneAndUpdate(filter, update, options) {
      calls.push({ filter, update, options });
      return returned;
    },
    async findOne(filter: any) {
      model.findOneCalls.push(filter);
      return returned;
    },
  };
  return model;
}

/** A model that loses the insert race exactly the way MongoDB reports it. */
function racedModel(fallbackRow: any) {
  const duplicateKey = Object.assign(
    new Error(
      'E11000 duplicate key error collection: airesume.loginsessions index: jti_1 ' +
        `dup key: { jti: "${JTI}" }`
    ),
    { code: 11000, keyPattern: { jti: 1 }, keyValue: { jti: JTI } }
  );

  const model: LoginSessionWriteModel & { findOneCalls: any[] } = {
    findOneCalls: [],
    async findOneAndUpdate() {
      throw duplicateKey;
    },
    async findOne(filter: any) {
      model.findOneCalls.push(filter);
      return fallbackRow;
    },
  };
  return model;
}

describe('isDuplicateKeyError', () => {
  it('recognises the numeric duplicate-key code', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it('recognises a duplicate-key error that lost its code in transit', () => {
    expect(
      isDuplicateKeyError(
        new Error('E11000 duplicate key error collection: airesume.loginsessions index: jti_1')
      )
    ).toBe(true);
  });

  it('does not swallow unrelated database errors', () => {
    expect(isDuplicateKeyError(Object.assign(new Error('validation failed'), { code: 121 }))).toBe(
      false
    );
    expect(isDuplicateKeyError(new Error('connection timed out'))).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError(undefined)).toBe(false);
  });
});

describe('upsertLoginSession', () => {
  it('writes with upsert + $setOnInsert rather than a bare insert', async () => {
    const model = uncontendedModel();
    await upsertLoginSession(model, { userId: USER_ID, jti: JTI, provider: 'credentials' });

    expect(model.calls.length).toBe(1);
    const { filter, update, options } = model.calls[0];

    // Keyed on the unique index, so concurrent callers target the same document.
    expect(filter).toEqual({ jti: JTI });
    // `upsert: true` is what stops a second caller from colliding on jti_1.
    expect(options.upsert).toBe(true);
    expect(options.new).toBe(true);
    expect(update.$setOnInsert.jti).toBe(JTI);
    // `$setOnInsert` (not `$set`) — a recovery write must not overwrite the real device
    // metadata recorded at sign-in with the `recovered` placeholder.
    expect(update.$set).toBe(undefined);
    expect(update.$setOnInsert.provider).toBe('credentials');
    expect(update.$setOnInsert.userId.toString()).toBe(USER_ID);
  });

  it('records a 7-day expiry so cleanupSessions does not purge a live session', async () => {
    const model = uncontendedModel();
    await upsertLoginSession(model, { userId: USER_ID, jti: JTI });

    const { expiresAt } = model.calls[0].update.$setOnInsert;
    const daysOut = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysOut).toBeGreaterThan(6.9);
    expect(daysOut).toBeLessThan(7.1);
  });

  it('absorbs a lost insert race by reading the winner row instead of throwing', async () => {
    const model = racedModel(EXISTING_ROW);
    const result = await upsertLoginSession(model, {
      userId: USER_ID,
      jti: JTI,
      provider: 'recovered',
    });

    // The whole point: the caller gets the row that exists, not an E11000.
    expect(result).toBe(EXISTING_ROW);
    expect(model.findOneCalls.length).toBe(1);
    expect(model.findOneCalls[0]).toEqual({ jti: JTI });
  });

  it('returns null when the row cannot be read back after the race', async () => {
    const model = racedModel(null);
    const result = await upsertLoginSession(model, { userId: USER_ID, jti: JTI });
    expect(result).toBeNull();
  });

  it('still propagates a genuine write failure', async () => {
    const model: LoginSessionWriteModel = {
      async findOneAndUpdate() {
        throw Object.assign(new Error('not primary'), { code: 10107 });
      },
      async findOne() {
        throw new Error('findOne should not be reached for a non-duplicate error');
      },
    };

    let thrown: any = null;
    try {
      await upsertLoginSession(model, { userId: USER_ID, jti: JTI });
    } catch (error) {
      thrown = error;
    }

    expect(thrown?.message).toBe('not primary');
  });
});
