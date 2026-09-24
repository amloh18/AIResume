import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claimNextApplication, completeQueueItem, failQueueItem } from './claimNext';
import ApplicationQueue from '@/models/ApplicationQueue';
import JobApplication from '@/models/JobApplication';

vi.mock('@/models/ApplicationQueue', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOne: vi.fn(),
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
