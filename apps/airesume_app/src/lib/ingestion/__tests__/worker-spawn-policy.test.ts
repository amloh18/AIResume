import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The slim production image has no Python and no `scripts/`. These tests pin the two things that make
 * that safe: production refuses to pretend otherwise, and every escape hatch still works.
 */
describe('local worker spawn policy', () => {
  beforeEach(() => {
    vi.resetModules();
    // `vi.stubEnv` rather than direct assignment: NODE_ENV is typed read-only.
    vi.stubEnv('NODE_ENV', 'test');
    delete process.env.INGESTION_WORKER_URL;
    delete process.env.INGESTION_WORKER_TOKEN;
    delete process.env.ALLOW_LOCAL_INGESTION_WORKERS;
  });

  it('allows spawning in development when no gateway is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { mustRefuseLocalWorkerSpawn, getWorkerExecutionMode } = await import('@/lib/ingestion/engine');

    expect(mustRefuseLocalWorkerSpawn()).toBe(false);
    expect(getWorkerExecutionMode()).toEqual({ mode: 'local-spawn', gatewayUrl: null });
  });

  it('refuses to spawn in production when no gateway is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { mustRefuseLocalWorkerSpawn, getWorkerExecutionMode } = await import('@/lib/ingestion/engine');

    expect(mustRefuseLocalWorkerSpawn()).toBe(true);
    expect(getWorkerExecutionMode()).toEqual({ mode: 'disabled', gatewayUrl: null });
  });

  it('reports jobspy as not ready in production without a gateway, naming the env var', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { checkSourceConfig } = await import('@/lib/ingestion/engine');

    const result = checkSourceConfig('jobspy');
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('INGESTION_WORKER_URL');
  });

  it('never refuses when the gateway is configured, in any environment', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.INGESTION_WORKER_URL = 'http://172.17.0.1:8790';
    const { mustRefuseLocalWorkerSpawn, getWorkerExecutionMode, checkSourceConfig } = await import(
      '@/lib/ingestion/engine'
    );

    expect(mustRefuseLocalWorkerSpawn()).toBe(false);
    expect(getWorkerExecutionMode()).toEqual({
      mode: 'remote-gateway',
      gatewayUrl: 'http://172.17.0.1:8790',
    });
    // In remote mode the local script check is skipped — the script lives on the VPS.
    expect(checkSourceConfig('jobspy').ready).toBe(true);
  });

  it('honours the ALLOW_LOCAL_INGESTION_WORKERS escape hatch', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.ALLOW_LOCAL_INGESTION_WORKERS = 'true';
    const { mustRefuseLocalWorkerSpawn, getWorkerExecutionMode } = await import('@/lib/ingestion/engine');

    expect(mustRefuseLocalWorkerSpawn()).toBe(false);
    expect(getWorkerExecutionMode()).toEqual({ mode: 'local-spawn', gatewayUrl: null });
  });

  it('does not treat a non-"true" override as consent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.ALLOW_LOCAL_INGESTION_WORKERS = 'yes';
    const { mustRefuseLocalWorkerSpawn } = await import('@/lib/ingestion/engine');

    expect(mustRefuseLocalWorkerSpawn()).toBe(true);
  });
});
