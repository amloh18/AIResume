// @vitest-environment node
/**
 * Regression tests for the split-database guard in connection-manager.
 *
 * The failure these cover is real and was reproduced in production-shaped
 * data: a raw `mongoose.connect(process.env.MONGODB_URI)` (no dbName) wins
 * the first-connection race, mongoose then silently ignores the manager's
 * same-URI reconnect (options dropped), and the whole process reads/writes
 * the driver-default database while MONGODB_DB names another one — so user
 * documents "disappear" without any error.
 *
 * The mongoose semantics are mocked here (verified live against the real
 * driver: same-URI connect = no-op; disconnect + connect re-applies options).
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

interface MockState {
  /** Database the default connection is currently bound to. */
  databaseName: string;
  disconnected: boolean;
  connectCalls: number;
  disconnectCalls: number;
  /** When true, reconnects keep failing to apply dbName (poison persists). */
  poisonPersists: boolean;
}

function freshState(databaseName: string, poisonPersists = false): MockState {
  return { databaseName, disconnected: false, connectCalls: 0, disconnectCalls: 0, poisonPersists };
}

function installMongooseMock(state: MockState): void {
  const connection = {
    get readyState() {
      return state.disconnected ? 0 : 1;
    },
    setMaxListeners: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    host: 'mock-host',
    port: 27017,
    get db() {
      return {
        get databaseName() {
          return state.databaseName;
        },
        admin: () => ({ ping: vi.fn().mockResolvedValue({ ok: 1 }) }),
      };
    },
  };

  const connect = vi.fn(async (_uri: string, options?: { dbName?: string }) => {
    state.connectCalls += 1;
    state.disconnected = false;
    if (state.connectCalls === 1) {
      // Already open with the same URI: mongoose returns early and DROPS the
      // new options — the exact behavior that poisons the process.
      return { connection };
    }
    if (!state.poisonPersists) {
      state.databaseName = options?.dbName || 'test';
    }
    return { connection };
  });

  const disconnect = vi.fn(async () => {
    state.disconnectCalls += 1;
    state.disconnected = true;
  });

  vi.doMock('mongoose', () => ({ default: { connect, disconnect, connection } }));
}

/**
 * Fresh module registry + mocked mongoose per test — the manager is a
 * singleton, so a shared module instance would leak state between tests.
 */
async function loadManager(databaseName: string, opts?: { poisonPersists?: boolean; mongodbDb?: string }) {
  vi.resetModules();
  const state = freshState(databaseName, opts?.poisonPersists);
  installMongooseMock(state);

  const previousDb = process.env.MONGODB_DB;
  const previousUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/fallback';
  if (opts?.mongodbDb !== undefined) {
    process.env.MONGODB_DB = opts.mongodbDb;
  } else {
    delete process.env.MONGODB_DB;
  }

  const mod = await import('./connection-manager');

  const restoreEnv = () => {
    if (previousDb === undefined) delete process.env.MONGODB_DB;
    else process.env.MONGODB_DB = previousDb;
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
  };

  return { getConnection: mod.getConnection, state, restoreEnv };
}

beforeAll(() => {
  // Skip signal-handler registration (it accumulates listeners across the
  // resetModules() cycles below).
  process.env._SHUTDOWN_HANDLERS_SETUP = 'true';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.doUnmock('mongoose');
  vi.restoreAllMocks();
  // Re-arm the console spies — restoreAllMocks cleared them.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('connection-manager split-database guard', () => {
  it('reconnects when an earlier raw connect bound the wrong database', async () => {
    const { getConnection, state, restoreEnv } = await loadManager('test', { mongodbDb: 'airesume' });
    try {
      await expect(getConnection()).resolves.toBeDefined();
      // First connect was the silent no-op (poisoned), guard disconnected and
      // reconnected with the right dbName.
      expect(state.connectCalls).toBe(2);
      expect(state.disconnectCalls).toBe(1);
      expect(state.databaseName).toBe('airesume');
    } finally {
      restoreEnv();
    }
  });

  it('does nothing when the connection is already on the expected database', async () => {
    const { getConnection, state, restoreEnv } = await loadManager('airesume', { mongodbDb: 'airesume' });
    try {
      await expect(getConnection()).resolves.toBeDefined();
      expect(state.connectCalls).toBe(1);
      expect(state.disconnectCalls).toBe(0);
      expect(state.databaseName).toBe('airesume');
    } finally {
      restoreEnv();
    }
  });

  it('fails loudly instead of looping when the reconnect lands on the wrong database again', async () => {
    const { getConnection, state, restoreEnv } = await loadManager('test', {
      mongodbDb: 'airesume',
      poisonPersists: true,
    });
    try {
      await expect(getConnection()).rejects.toThrow(/Split-database guard/);
      // Exactly one heal attempt — no infinite reconnect loop.
      expect(state.connectCalls).toBe(2);
      expect(state.disconnectCalls).toBe(1);
      expect(state.databaseName).toBe('test');
    } finally {
      restoreEnv();
    }
  });

  it('leaves URI-default behavior alone when MONGODB_DB is not set', async () => {
    const { getConnection, state, restoreEnv } = await loadManager('test');
    try {
      await expect(getConnection()).resolves.toBeDefined();
      expect(state.connectCalls).toBe(1);
      expect(state.disconnectCalls).toBe(0);
      expect(state.databaseName).toBe('test');
    } finally {
      restoreEnv();
    }
  });
});
