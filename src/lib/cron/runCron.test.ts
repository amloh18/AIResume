import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  runCron,
  acquireCronLock,
  cronBusyResponse,
  isCronRunning,
  cronRunElapsedMs,
  __resetCronLocks,
} from './runCron';

const req = (auth?: string) =>
  new NextRequest('http://localhost/api/cron/test', {
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  });

describe('runCron (auth + overlap guard)', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret');
    __resetCronLocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetCronLocks();
  });

  it('runs the work and returns its response when authorised', async () => {
    const res = await runCron('job', req('test-secret'), async () =>
      NextResponse.json({ success: true, value: 42 })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, value: 42 });
    expect(isCronRunning('job')).toBe(false);
  });

  it('rejects an unauthorised request without starting the work', async () => {
    const work = vi.fn();
    const res = await runCron('job', req('wrong-secret'), work as never);
    expect(res.status).toBe(401);
    expect(work).not.toHaveBeenCalled();
  });

  it('rejects when no cron secret is configured (fail closed)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('CRON_API_KEY', '');
    const res = await runCron('job', req('anything'), async () => NextResponse.json({}));
    expect(res.status).toBe(503);
  });

  it('refuses a second concurrent run with 409 while the first is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    const first = runCron('job', req('test-secret'), async () => {
      await gate;
      return NextResponse.json({ success: true, run: 'first' });
    });

    // The first run holds the lock now.
    expect(isCronRunning('job')).toBe(true);
    expect(cronRunElapsedMs('job')).toBeGreaterThanOrEqual(0);

    const second = await runCron('job', req('test-secret'), async () =>
      NextResponse.json({ success: true, run: 'second' })
    );
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.code).toBe('CRON_ALREADY_RUNNING');
    expect(body.job).toBe('job');

    release();
    const firstRes = await first;
    expect(firstRes.status).toBe(200);
    expect(isCronRunning('job')).toBe(false);
  });

  it('keeps locks per job name so a different cron can run concurrently', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    const a = runCron('job-a', req('test-secret'), async () => {
      await gate;
      return NextResponse.json({ ok: 'a' });
    });

    const b = await runCron('job-b', req('test-secret'), async () => NextResponse.json({ ok: 'b' }));
    expect(b.status).toBe(200);

    release();
    await a;
  });

  it('releases the lock when the work throws, so the next tick can run', async () => {
    await expect(
      runCron('job', req('test-secret'), async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(isCronRunning('job')).toBe(false);

    const res = await runCron('job', req('test-secret'), async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(200);
  });

  describe('inline lock primitives (used by the existing routes)', () => {
    it('acquires once and returns null while held', () => {
      const lock = acquireCronLock('inline-job');
      expect(lock).not.toBeNull();
      expect(acquireCronLock('inline-job')).toBeNull();
      lock!.release();
      expect(acquireCronLock('inline-job')).not.toBeNull();
    });

    it('builds a 409 that names the job and reports how long it has been running', async () => {
      acquireCronLock('inline-job');
      const res = cronBusyResponse('inline-job');
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('CRON_ALREADY_RUNNING');
      expect(body.job).toBe('inline-job');
      expect(typeof body.runningForMs).toBe('number');
    });
  });
});
