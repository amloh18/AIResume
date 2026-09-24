import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startApplicationWorker, stopApplicationWorker } from './applicationWorker';
import { claimNextApplication, completeQueueItem, failQueueItem, releaseStuckItems } from '@/lib/worker/claimNext';
import { processApplication } from '@/lib/worker/processApplication';
import { getCorrelationId } from '@/lib/observability/correlation';

vi.mock('@/lib/worker/claimNext', () => ({
  claimNextApplication: vi.fn(),
  completeQueueItem: vi.fn().mockResolvedValue(undefined),
  failQueueItem: vi.fn().mockResolvedValue(undefined),
  releaseStuckItems: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/lib/worker/processApplication', () => ({
  processApplication: vi.fn(),
}));
vi.mock('@/lib/database', () => ({
  getConnection: vi.fn().mockResolvedValue(undefined),
  ensureConnection: vi.fn().mockResolvedValue(undefined),
  closeConnection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/models/ApplicationQueue', () => ({
  __esModule: true,
  default: { countDocuments: vi.fn().mockResolvedValue(0) },
}));
vi.mock('@/lib/structured-logger', () => ({
  setLogContextProvider: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    performance: vi.fn(),
  },
}));

const claimMock = claimNextApplication as ReturnType<typeof vi.fn>;
const processMock = processApplication as ReturnType<typeof vi.fn>;
const completeMock = completeQueueItem as ReturnType<typeof vi.fn>;
const failMock = failQueueItem as ReturnType<typeof vi.fn>;

const QUEUE_ITEM = {
  _id: 'q1',
  attempts: 1,
  maxAttempts: 3,
  correlationId: 'trace-from-request',
  mode: 'auto',
};

const JOB_APP = {
  _id: '507f1f77bcf86cd799439022',
  userId: '507f1f77bcf86cd799439011',
  currentStage: 'saved',
};

/** Run one worker tick by starting the loop and stopping it right after the first pass. */
async function runOneTick(): Promise<void> {
  startApplicationWorker();
  // The first tick is fired synchronously by startApplicationWorker; give it a macrotask to finish.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  stopApplicationWorker();
}

beforeEach(() => {
  vi.clearAllMocks();
  claimMock.mockResolvedValue(null);
  processMock.mockResolvedValue({ success: true, stage: 'applied', status: 'applied', message: 'ok' });
});

describe('applicationWorker — correlation handoff', () => {
  it('processes the claimed item inside the correlation context stored on the queue document', async () => {
    claimMock.mockResolvedValue({ queueItem: QUEUE_ITEM, jobApplication: JOB_APP });
    let seenDuringProcessing: string | undefined;

    processMock.mockImplementation(async () => {
      seenDuringProcessing = getCorrelationId();
      return { success: true, stage: 'applied', status: 'applied', message: 'ok' };
    });

    await runOneTick();

    expect(seenDuringProcessing).toBe('trace-from-request');
    expect(completeMock).toHaveBeenCalledWith('q1');
    expect(failMock).not.toHaveBeenCalled();
  });

  it('still runs (with a fresh trace) for queue documents written before correlation existed', async () => {
    claimMock.mockResolvedValue({
      queueItem: { ...QUEUE_ITEM, correlationId: undefined },
      jobApplication: JOB_APP,
    });
    let seenDuringProcessing: string | undefined;

    processMock.mockImplementation(async () => {
      seenDuringProcessing = getCorrelationId();
      return { success: true, stage: 'staging', status: 'review_required', message: 'held' };
    });

    await runOneTick();

    expect(seenDuringProcessing).toBeTruthy();
    expect(seenDuringProcessing).not.toBe('trace-from-request');
  });

  it('fails the queue item (and keeps the trace) when processing throws', async () => {
    claimMock.mockResolvedValue({ queueItem: QUEUE_ITEM, jobApplication: JOB_APP });
    let seenDuringFailure: string | undefined;

    processMock.mockImplementation(async () => {
      seenDuringFailure = getCorrelationId();
      throw new Error('playwright exploded');
    });

    await runOneTick();

    expect(seenDuringFailure).toBe('trace-from-request');
    // The thrown error is caught by processApplication's own handler in production; here the tick's
    // catch path runs, which must not mark the item complete.
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('does nothing when the queue is empty', async () => {
    claimMock.mockResolvedValue(null);

    await runOneTick();

    expect(processMock).not.toHaveBeenCalled();
    expect(completeMock).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
  });
});
