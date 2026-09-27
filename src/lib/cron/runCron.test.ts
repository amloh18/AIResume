import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import {
  runCron,
  acquireCronLock,
  cronBusyResponse,
  isCronRunning,
  cronRunElapsedMs,
  __resetCronLocks,
} from './runCron';
import CronLock from '@/models/CronLock';

/*
  The cross-process lease (SB-07) is stubbed rather than exercised against Mongo.
  `acquireCronLock` skips the lease entirely whenever `mongoose.connection.readyState !== 1`, so
  leaving it alone keeps every other case on the in-process path — which is the fallback those cases
  are about.
*/
vi.mock('@/models/CronLock', () => ({
  __esModule: true,
  default: { findOneAndUpdate: vi.fn(), deleteOne: vi.fn().mockResolvedValue({}) },
}));

/** `findOneAndUpdate(...).lean()` is awaited, so the stub has to expose `lean()`. */
const leaseResolves = (value: unknown) => ({ lean: () => Promise.resolve(value) });
const leaseRejects = (err: unknown) => ({ lean: () => Promise.reject(err) });

const leaseFindOneAndUpdate = CronLock.findOneAndUpdate as unknown as ReturnType<typeof vi.fn>;
const leaseDeleteOne = CronLock.deleteOne as unknown as ReturnType<typeof vi.fn>;

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
    it('acquires once and returns null while held', async () => {
      const lock = await acquireCronLock('inline-job');
      expect(lock).not.toBeNull();
      expect(await acquireCronLock('inline-job')).toBeNull();
      await lock!.release();
      expect(await acquireCronLock('inline-job')).not.toBeNull();
    });

    it('builds a 409 that names the job and reports how long it has been running', async () => {
      await acquireCronLock('inline-job');
      const res = cronBusyResponse('inline-job');
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('CRON_ALREADY_RUNNING');
      expect(body.job).toBe('inline-job');
      expect(typeof body.runningForMs).toBe('number');
    });
  });

  /*
    SB-07 — the cross-process half of the guard.

    Before this, the guard was an in-process `Map` only, so two app replicas could tick
    `daily-summary` at the same second and both run it. These cases pin the three outcomes that
    matter: another process holds the lease (refuse), we win it (run, then release), and the store is
    unreachable (fall back rather than stop every scheduled job).
  */
  describe('cross-process lease', () => {
    let readyState: number;

    beforeEach(() => {
      readyState = 1;
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockImplementation(() => readyState);
      leaseFindOneAndUpdate.mockReset();
      leaseDeleteOne.mockReset().mockResolvedValue({});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('refuses the tick when another process holds the lease, and frees the local slot', async () => {
      // The upsert won the document, but a different owner wrote it.
      leaseFindOneAndUpdate.mockReturnValue(leaseResolves({ owner: 'another-process' }));

      const res = await runCron('lease-job', req('test-secret'), async () =>
        NextResponse.json({ ok: true })
      );

      expect(res.status).toBe(409);
      expect((await res.json()).code).toBe('CRON_ALREADY_RUNNING');
      // We are not running the job, so the local slot must not stay occupied.
      expect(isCronRunning('lease-job')).toBe(false);
    });

    it('treats a unique-key collision as "another process holds it"', async () => {
      // The filter matched nothing and the insert hit the unique index on `name`.
      leaseFindOneAndUpdate.mockReturnValue(
        leaseRejects(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }))
      );

      const res = await runCron('lease-job', req('test-secret'), async () =>
        NextResponse.json({ ok: true })
      );

      expect(res.status).toBe(409);
      expect(isCronRunning('lease-job')).toBe(false);
    });

    it('runs the job and releases its own lease when it wins', async () => {
      leaseFindOneAndUpdate.mockImplementation((_filter: unknown, update: any) =>
        leaseResolves({ owner: update.$set.owner })
      );

      const res = await runCron('lease-job', req('test-secret'), async () =>
        NextResponse.json({ ok: true })
      );

      expect(res.status).toBe(200);
      // The lease must be scoped to this run's owner so it cannot delete a successor's lease.
      const [filter] = leaseDeleteOne.mock.calls[0];
      expect(filter.name).toBe('lease-job');
      expect(typeof filter.owner).toBe('string');
      expect(filter.owner.length).toBeGreaterThan(0);
    });

    it('falls back to the in-process guard when the lease store is unreachable', async () => {
      leaseFindOneAndUpdate.mockReturnValue(
        leaseRejects(Object.assign(new Error('connection lost'), { code: 500 }))
      );

      const res = await runCron('lease-job', req('test-secret'), async () =>
        NextResponse.json({ ok: true })
      );

      // A guard that cannot reach its store must not stop every scheduled job.
      expect(res.status).toBe(200);
    });

    it('refuses a same-process overlap without consulting the lease', async () => {
      leaseFindOneAndUpdate.mockImplementation((_filter: unknown, update: any) =>
        leaseResolves({ owner: update.$set.owner })
      );

      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));

      const first = runCron('lease-job', req('test-secret'), async () => {
        await gate;
        return NextResponse.json({ ok: 'first' });
      });

      // Second tick is refused by the in-process slot alone.
      const second = await runCron('lease-job', req('test-secret'), async () =>
        NextResponse.json({ ok: 'second' })
      );
      expect(second.status).toBe(409);

      release();
      await first;

      // The lease was consulted exactly once — by the run that actually started. The refused tick
      // never got as far as asking the database.
      expect(leaseFindOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
