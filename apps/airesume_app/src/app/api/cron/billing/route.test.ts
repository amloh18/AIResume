import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { acquireCronLock, __resetCronLocks } from '@/lib/cron/runCron';
import {
  processRenewals,
  processDunning,
  retryFailedPayments,
  sendDunningEmails,
} from '@/lib/services/billingSchedulerService';

vi.mock('@/lib/services/billingSchedulerService', () => ({
  processRenewals: vi.fn().mockResolvedValue({ processed: 1 }),
  processDunning: vi.fn().mockResolvedValue({ processed: 2 }),
  retryFailedPayments: vi.fn().mockResolvedValue({ retried: 3 }),
  sendDunningEmails: vi.fn().mockResolvedValue({ sent: 4 }),
}));

const req = (headers: Record<string, string> = {}, query = '') =>
  new NextRequest(`http://localhost/api/cron/billing${query}`, { headers });

const bearer = (secret: string) => ({ authorization: `Bearer ${secret}` });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'test-secret');
  __resetCronLocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetCronLocks();
});

describe('GET /api/cron/billing — auth', () => {
  it('fails closed with 503 when no cron secret is configured at all', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const res = await GET(req(bearer('anything')));

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('CRON_NOT_CONFIGURED');
    expect(processRenewals).not.toHaveBeenCalled();
  });

  it('rejects a request with no credentials with 401 and never touches billing', async () => {
    const res = await GET(req());

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('CRON_UNAUTHORIZED');
    expect(processRenewals).not.toHaveBeenCalled();
    expect(processDunning).not.toHaveBeenCalled();
    expect(retryFailedPayments).not.toHaveBeenCalled();
    expect(sendDunningEmails).not.toHaveBeenCalled();
  });

  it('rejects a wrong bearer token with 401', async () => {
    const res = await GET(req(bearer('nope')));

    expect(res.status).toBe(401);
    expect(processRenewals).not.toHaveBeenCalled();
  });

  it('accepts the legacy X-Api-Key header against CRON_API_KEY', async () => {
    vi.stubEnv('CRON_API_KEY', 'legacy-key');

    const res = await GET(req({ 'x-api-key': 'legacy-key' }));

    expect(res.status).toBe(200);
    expect(processRenewals).toHaveBeenCalledTimes(1);
  });

  it('accepts the Bearer form against CRON_SECRET and runs every action for action=all', async () => {
    const res = await GET(req(bearer('test-secret')));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toMatchObject({
      renewals: { processed: 1 },
      dunning: { processed: 2 },
      retry: { retried: 3 },
      emails: { sent: 4 },
    });
  });

  it('runs only the requested action when action= is given', async () => {
    const res = await GET(req(bearer('test-secret'), '?action=renewals'));

    expect(res.status).toBe(200);
    expect(processRenewals).toHaveBeenCalledTimes(1);
    expect(processDunning).not.toHaveBeenCalled();
    expect(retryFailedPayments).not.toHaveBeenCalled();
    expect(sendDunningEmails).not.toHaveBeenCalled();
  });
});

describe('POST /api/cron/billing — same guard as GET', () => {
  it('is authenticated identically (no POST back door)', async () => {
    const res = await POST(req());

    expect(res.status).toBe(401);
    expect(processRenewals).not.toHaveBeenCalled();
  });

  it('runs the work when authorised', async () => {
    const res = await POST(req(bearer('test-secret')));

    expect(res.status).toBe(200);
    expect(processRenewals).toHaveBeenCalledTimes(1);
  });
});

describe('overlap protection (a concurrent pass could double-charge a card)', () => {
  it('returns 409 CRON_ALREADY_RUNNING while a run holds the lock', async () => {
    const held = await acquireCronLock('billing');
    expect(held).not.toBeNull();

    const res = await GET(req(bearer('test-secret')));

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('CRON_ALREADY_RUNNING');
    expect(processRenewals).not.toHaveBeenCalled();

    await held!.release();
  });

  it('releases the lock after the run, including after an auth failure inside the lock', async () => {
    await GET(req(bearer('test-secret')));      // authorised run — finally { release() }
    await GET(req(bearer('wrong')));            // auth fails *inside* the lock — also released

    const after = await acquireCronLock('billing');
    expect(after).not.toBeNull();
    await after!.release();
  });

  it('actually runs billing work while holding the lock (lock is not a bypass)', async () => {
    let sawLockDuringRun = false;
    (processRenewals as any).mockImplementation(async () => {
      // `acquireCronLock` is async now (the in-process slot is still taken synchronously, but the
      // cross-process lease is awaited) — so this must be awaited to read the real answer.
      sawLockDuringRun = !(await acquireCronLock('billing')); // busy → still held
      return { processed: 0 };
    });

    const res = await GET(req(bearer('test-secret')));

    expect(res.status).toBe(200);
    expect(sawLockDuringRun).toBe(true);
  });
});
