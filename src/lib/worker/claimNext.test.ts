import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claimNextApplication, completeQueueItem, failQueueItem, releaseStuckItems } from './claimNext';
import ApplicationQueue from '@/models/ApplicationQueue';
import JobApplication from '@/models/JobApplication';

vi.mock('@/models/ApplicationQueue', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOne: vi.fn(),
    updateMany: vi.fn(),
  },
}));
vi.mock('@/models/JobApplication', () => ({
  __esModule: true,
  default: { findById: vi.fn() },
}));
vi.mock('@/lib/database', () => ({
  getConnection: vi.fn().mockResolvedValue(undefined),
  ensureConnection: vi.fn().mockResolvedValue(undefined),
}));

const queueFindOneAndUpdate = ApplicationQueue.findOneAndUpdate as ReturnType<typeof vi.fn>;
const queueFindByIdAndUpdate = ApplicationQueue.findByIdAndUpdate as ReturnType<typeof vi.fn>;
const queueFindById = ApplicationQueue.findById as ReturnType<typeof vi.fn>;
const queueUpdateMany = ApplicationQueue.updateMany as ReturnType<typeof vi.fn>;
const appFindById = JobApplication.findById as ReturnType<typeof vi.fn>;

const QUEUE_ITEM = {
  _id: 'q1',
  applicationId: '507f1f77bcf86cd799439022',
  status: 'queued',
  mode: 'auto',
  attempts: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  queueFindOneAndUpdate.mockResolvedValue(QUEUE_ITEM);
  queueFindById.mockResolvedValue({ _id: 'q1', attempts: 1, maxAttempts: 3 });
  queueUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  appFindById.mockResolvedValue({ _id: QUEUE_ITEM.applicationId, userId: 'u1' });
});

describe('claimNextApplication — atomic claim', () => {
  it('claims in a single findOneAndUpdate (find + lock cannot interleave)', async () => {
    const result = await claimNextApplication();

    expect(queueFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(result?.queueItem).toMatchObject({ _id: 'q1' });
  });

  it('sets status=processing, locks with the worker identity and increments attempts', async () => {
    await claimNextApplication();

    const [filter, update, options] = queueFindOneAndUpdate.mock.calls[0];

    expect(filter).toMatchObject({
      status: 'queued',
      lockedAt: null,
      scheduledAt: { $lte: expect.any(Date) },
    });

    expect(update.$set.status).toBe('processing');
    expect(update.$set.lockedBy).toMatch(/^worker-/);
    expect(update.$set.lockedAt).toBeInstanceOf(Date);
    expect(update.$inc).toEqual({ attempts: 1 });

    // Highest priority first, oldest first within a priority band.
    expect(options.sort).toEqual({ priority: -1, scheduledAt: 1 });
    expect(options.new).toBe(true);
  });

  it('returns null when the queue is empty (no worker spin on empty queue)', async () => {
    queueFindOneAndUpdate.mockResolvedValue(null);
    await expect(claimNextApplication()).resolves.toBeNull();
  });

  it('marks an orphaned queue item failed instead of processing a missing application', async () => {
    appFindById.mockResolvedValue(null);

    const result = await claimNextApplication();

    expect(result).toBeNull();
    expect(queueFindByIdAndUpdate).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({
        status: 'failed',
        lastError: expect.stringMatching(/not found/i),
      })
    );
  });
});

describe('queue completion helpers', () => {
  it('completeQueueItem clears the lock and stamps completedAt', async () => {
    await completeQueueItem('q1');

    expect(queueFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = queueFindByIdAndUpdate.mock.calls[0];
    expect(update.status).toBe('completed');
    expect(update.completedAt).toBeInstanceOf(Date);
    expect(update.lockedAt).toBeNull();
    expect(update.lockedBy).toBeNull();
  });

  it('failQueueItem reschedules a retryable failure with backoff and releases the lock', async () => {
    await failQueueItem('q1', 'boom', true);

    expect(queueFindById).toHaveBeenCalledWith('q1');
    expect(queueFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = queueFindByIdAndUpdate.mock.calls[0];
    expect(update.status).toBe('queued');
    expect(update.lastError).toBe('boom');
    expect(update.lockedAt).toBeNull();
    expect(update.lockedBy).toBeNull();
    // 60s * 2^attempts(attempts=1) = 120s out
    expect(update.scheduledAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('failQueueItem dead-letters after maxAttempts are exhausted', async () => {
    queueFindById.mockResolvedValue({ _id: 'q1', attempts: 3, maxAttempts: 3 });

    await failQueueItem('q1', 'boom', true);

    const [, update] = queueFindByIdAndUpdate.mock.calls[0];
    expect(update.status).toBe('dead_letter');
    expect(update.completedAt).toBeInstanceOf(Date);
    expect(update.lastError).toBe('boom');
  });
});

describe('releaseStuckItems — releases must respect maxAttempts', () => {
  it('dead-letters an exhausted item instead of requeueing it', async () => {
    await releaseStuckItems(30);

    const deadCall = queueUpdateMany.mock.calls.find(([, update]) => update.$set.status === 'dead_letter');
    expect(deadCall).toBeDefined();
    const [filter, update] = deadCall!;
    expect(filter.status).toBe('processing');
    expect(filter.lockedAt.$lt).toBeInstanceOf(Date);
    // Gated on the stored attempts/maxAttempts pair — this is the check the
    // old unconditional requeue was missing (attempts=55 vs maxAttempts=3).
    expect(filter.$expr.$gte).toEqual(['$attempts', { $ifNull: ['$maxAttempts', 3] }]);
    expect(update.$set.lastError).toMatch(/no attempts left/i);
    expect(update.$set.completedAt).toBeInstanceOf(Date);
  });

  it('counts a release as an attempt so a throwing run terminates', async () => {
    await releaseStuckItems(30);

    const requeueCall = queueUpdateMany.mock.calls.find(([, update]) => update.$set.status === 'queued');
    expect(requeueCall).toBeDefined();
    const [, update] = requeueCall!;
    expect(update.$inc).toEqual({ attempts: 1 });
    expect(update.$set.lockedAt).toBeNull();
    expect(update.$set.lockedBy).toBeNull();
    // And the requeue itself is still gated: attempts < maxAttempts.
    const [filter] = requeueCall!;
    expect(filter.$expr.$lt).toEqual(['$attempts', { $ifNull: ['$maxAttempts', 3] }]);
  });

  it('releases only items stuck past the configured threshold', async () => {
    await releaseStuckItems(15);

    const requeueCall = queueUpdateMany.mock.calls.find(([, update]) => update.$set.status === 'queued');
    const [filter] = requeueCall!;
    const cutoff = filter.lockedAt.$lt as Date;
    const age = Date.now() - cutoff.getTime();
    expect(age).toBeGreaterThan(14 * 60 * 1000);
    expect(age).toBeLessThan(16 * 60 * 1000);
  });
});
