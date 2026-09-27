import { describe, it, expect, vi } from 'vitest';
import {
  buildWorkerHealthPayload,
  getWorkerHealthUrl,
  probeWorkerHealth,
  resolveBuildCommit,
} from './health';
import { getWorkerPlan } from './roles';

describe('buildWorkerHealthPayload', () => {
  it('reports uptime, memory and the enabled loops', () => {
    const payload = buildWorkerHealthPayload({
      role: 'worker',
      plan: getWorkerPlan('worker'),
      startedAt: new Date('2026-09-21T10:00:00.000Z'),
      now: new Date('2026-09-21T10:02:05.400Z'),
      loops: { email: { isRunning: true } },
      runtime: { pid: 4242, memoryUsage: () => ({ rss: 209 * 1024 * 1024 }) },
      commit: 'deadbee',
    });

    expect(payload.ok).toBe(true);
    expect(payload.role).toBe('worker');
    expect(payload.pid).toBe(4242);
    expect(payload.commit).toBe('deadbee');
    expect(payload.startedAt).toBe('2026-09-21T10:00:00.000Z');
    expect(payload.uptimeSeconds).toBe(125);
    expect(payload.memoryRssMb).toBe(209);
    expect(payload.loops.email).toEqual({ isRunning: true });
    expect(payload.loops.enabled).toEqual([
      'email',
      'emailIngestion',
      'applicationQueue',
      'reconciliation',
    ]);
  });

  it('lists no enabled loops for the web role', () => {
    const payload = buildWorkerHealthPayload({
      role: 'web',
      plan: getWorkerPlan('web'),
      startedAt: new Date('2026-09-21T10:00:00.000Z'),
      loops: {},
      now: new Date('2026-09-21T10:00:01.000Z'),
      runtime: { pid: 1, memoryUsage: () => ({ rss: 1024 * 1024 }) },
    });

    expect(payload.loops.enabled).toEqual([]);
    expect(payload.memoryRssMb).toBe(1);
  });
});

describe('resolveBuildCommit', () => {
  it('prefers GIT_COMMIT, then SOURCE_COMMIT, then reports unknown', () => {
    expect(resolveBuildCommit({ GIT_COMMIT: 'aaa1111', SOURCE_COMMIT: 'bbb2222' })).toBe('aaa1111');
    expect(resolveBuildCommit({ SOURCE_COMMIT: 'bbb2222' })).toBe('bbb2222');
    expect(resolveBuildCommit({})).toBe('unknown');
  });

  it('is what the payload reports when no commit is passed explicitly', () => {
    const payload = buildWorkerHealthPayload({
      role: 'worker',
      plan: getWorkerPlan('worker'),
      startedAt: new Date('2026-09-21T10:00:00.000Z'),
      now: new Date('2026-09-21T10:00:00.000Z'),
      loops: {},
      runtime: { pid: 1, memoryUsage: () => ({ rss: 1024 * 1024 }) },
    });

    // Never empty: an unbuilt image must read as "unknown", not as a blank that a UI hides.
    expect(payload.commit).toBe(resolveBuildCommit());
    expect(payload.commit).not.toBe('');
  });
});

describe('getWorkerHealthUrl', () => {
  it('is null when unset or blank, so callers do not guess an address', () => {
    expect(getWorkerHealthUrl({})).toBeNull();
    expect(getWorkerHealthUrl({ WORKER_HEALTH_URL: '   ' })).toBeNull();
  });

  it('strips trailing slashes so the probe builds one path', () => {
    expect(getWorkerHealthUrl({ WORKER_HEALTH_URL: 'http://worker:8791/' })).toBe(
      'http://worker:8791'
    );
  });
});

describe('probeWorkerHealth', () => {
  it('does not call fetch when no worker is configured', async () => {
    const fetchImpl = vi.fn();
    await expect(probeWorkerHealth(null, { fetchImpl })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns the payload from /health', async () => {
    const body = { ok: true, role: 'worker' };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => body });

    await expect(probeWorkerHealth('http://worker:8791', { fetchImpl })).resolves.toEqual(body);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://worker:8791/health',
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('treats a non-OK response as unavailable rather than throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(probeWorkerHealth('http://worker:8791', { fetchImpl })).resolves.toBeNull();
  });

  it('returns null when the worker is unreachable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(probeWorkerHealth('http://worker:8791', { fetchImpl })).resolves.toBeNull();
  });
});
