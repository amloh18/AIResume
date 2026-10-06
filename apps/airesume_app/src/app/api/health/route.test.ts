import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * `/api/health` used to await every dependency before responding — including a real SMTP handshake
 * to `mail.morigrid.com:443/:587`, which times out from inside the container (no hairpin), and Ollama
 * on `127.0.0.1:11434`, which is not running there at all. The endpoint therefore hung for the full
 * TCP timeout and then returned 503 while the app was serving 200s the whole time.
 *
 * These tests pin the contract that replaced it:
 *   - default (`/api/health`) is liveness: no network I/O, answers 200 fast, reports missing env
 *     configuration as information rather than as process death;
 *   - `?deep=1` runs the real dependency checks and reports them individually.
 */

const getConnectionSpy = vi.fn();

vi.mock('@/lib/database', () => ({
  getConnection: (...args: unknown[]) => getConnectionSpy(...args),
  ensureConnection: vi.fn(),
}));

vi.mock('@/lib/env-validation', () => ({
  validateEnvironment: () => ({ isValid: false, missing: ['MONGODB_URI'], warnings: [], errors: [] }),
}));

import { GET, HEAD } from './route';

const get = (url: string) => GET(new NextRequest(`http://localhost${url}`));

describe('/api/health', () => {
  beforeEach(() => {
    getConnectionSpy.mockReset();
    vi.stubEnv('OLLAMA_BASE_URL', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('STALWART_SMTP_HOST', '');
    vi.stubEnv('EMAIL_SERVER_HOST', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('liveness (default)', () => {
    it('returns 200 without touching the database', async () => {
      const res = await get('/api/health');
      expect(res.status).toBe(200);
      expect(getConnectionSpy).not.toHaveBeenCalled();
    });

    it('answers in well under the SMTP timeout this used to hang for', async () => {
      const started = Date.now();
      await get('/api/health');
      expect(Date.now() - started).toBeLessThan(500);
    });

    it('stays healthy even when environment validation fails', async () => {
      const body = await (await get('/api/health')).json();
      expect(body.mode).toBe('liveness');
      expect(body.status).toBe('healthy');
      expect(body.checks.environment.status).toBe('unhealthy');
      expect(body.checks.environment.missingVars).toContain('MONGODB_URI');
    });

    it('reports the running commit so a deploy can be verified', async () => {
      vi.stubEnv('GIT_COMMIT', 'abc1234');
      const body = await (await get('/api/health')).json();
      expect(body.commit).toBe('abc1234');
    });

    it('reports the worker role and which loops this process runs', async () => {
      const body = await (await get('/api/health')).json();
      expect(body.worker).toBeDefined();
      expect(Array.isArray(body.worker.loops)).toBe(true);
      // Default (WORKER_ROLE unset) keeps the legacy single-container behaviour: everything on.
      expect(body.worker.role).toBe('all');
      expect(body.worker.loops).toContain('applicationQueue');
      expect(body.worker.loops).toContain('email');
    });

    it('reports the web tier as running no loops when WORKER_ROLE=web', async () => {
      vi.stubEnv('WORKER_ROLE', 'web');
      const body = await (await get('/api/health')).json();
      expect(body.worker.role).toBe('web');
      expect(body.worker.loops).toEqual([]);
    });

    it('surfaces an unrecognised WORKER_ROLE instead of hiding the fallback', async () => {
      vi.stubEnv('WORKER_ROLE', 'wroker');
      const body = await (await get('/api/health')).json();
      expect(body.worker.role).toBe('all');
      expect(body.worker.warning).toMatch(/Unrecognized WORKER_ROLE/);
    });

    it('marks unconfigured external services as unknown, not unhealthy', async () => {
      const body = await (await get('/api/health?deep=1')).json();
      const external = body.checks.externalServices;
      expect(external.ollama.status).toBe('unknown');
      expect(external.gemini.status).toBe('unknown');
      expect(external.email.status).toBe('unknown');
    });
  });

  describe('deep mode', () => {
    it('runs the database check when ?deep=1 is passed', async () => {
      getConnectionSpy.mockResolvedValue({ connection: { readyState: 1 } });
      await get('/api/health?deep=1');
      expect(getConnectionSpy).toHaveBeenCalled();
    });

    it('reports database as healthy when the connection is established', async () => {
      getConnectionSpy.mockResolvedValue({ connection: { readyState: 1 } });
      const body = await (await get('/api/health?deep=1')).json();
      expect(body.mode).toBe('deep');
      expect(body.checks.database.status).toBe('healthy');
    });

    it('fails deep mode when the database is down', async () => {
      getConnectionSpy.mockRejectedValue(new Error('buffering timeout'));
      const res = await get('/api/health?deep=1');
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.checks.database.status).toBe('unhealthy');
    });
  });

  describe('HEAD', () => {
    it('answers a load-balancer probe with 200 and no body', async () => {
      const res = await HEAD();
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });
});
