import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claimQueueItem } from './emailWorker';
import ApplicationEmailQueue from '@/models/ApplicationEmailQueue';

vi.mock('@/models/ApplicationEmailQueue', () => ({
  __esModule: true,
  default: { findOneAndUpdate: vi.fn() },
}));
vi.mock('@/lib/services/applicationEmailService', () => ({
  sendApplicationEmail: vi.fn(),
  wasApplicationEmailSent: vi.fn(),
}));

const findOneAndUpdate = ApplicationEmailQueue.findOneAndUpdate as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  findOneAndUpdate.mockResolvedValue(null);
});

function claimFilter(): any {
  return findOneAndUpdate.mock.calls[0][0];
}

describe('emailWorker.claimQueueItem — reachable retry state', () => {
  it('claims fresh queued items whose scheduledAt has elapsed', async () => {
    await claimQueueItem();

    const filter = claimFilter();
    const orBranches = filter.$or.map((b: any) => Object.keys(b)[0]);
    expect(orBranches).toContain('status');
    expect(filter.$or[0]).toMatchObject({ status: 'queued' });
    expect(filter.$or[0].scheduledAt).toHaveProperty('$lte');
  });

  it('also claims `retrying` items once nextRetryAt has elapsed (retrying is not a dead end)', async () => {
    await claimQueueItem();

    const filter = claimFilter();
    const retryBranch = filter.$or.find((b: any) => b.status === 'retrying');
    expect(retryBranch).toBeDefined();
    expect(retryBranch.nextRetryAt).toHaveProperty('$lte');
  });

  it('respects the lock: only null locks or expired locks are claimable', async () => {
    await claimQueueItem();

    const filter = claimFilter();
    const lockClause = filter.$and[0].$or;
    expect(lockClause).toEqual([
      { lockedAt: null },
      { lockedAt: { $lt: expect.any(Date) } },
    ]);
  });

  it('returns null when nothing is claimable', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    await expect(claimQueueItem()).resolves.toBeNull();
  });
});
