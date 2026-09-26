import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  performAutomationAction,
  AutomationActionError,
} from './applicationAutomationActionService';
import JobApplication from '@/models/JobApplication';
import ApplicationQueue from '@/models/ApplicationQueue';
import ApplicationEvent from '@/models/ApplicationEvent';
import Notification from '@/models/Notification';
import { AutoApplyQuotaService } from '@/lib/services/autoApplyQuotaService';

vi.mock('@/models/JobApplication', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), updateOne: vi.fn() },
}));
vi.mock('@/models/ApplicationQueue', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), find: vi.fn(), updateOne: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
}));
vi.mock('@/models/ApplicationEvent', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), create: vi.fn() },
}));
vi.mock('@/models/Notification', () => ({
  __esModule: true,
  default: { updateMany: vi.fn() },
}));
vi.mock('@/lib/services/autoApplyQuotaService', () => ({
  AutoApplyQuotaService: { reserve: vi.fn(), consumeReservation: vi.fn() },
}));

const appFindOne = JobApplication.findOne as ReturnType<typeof vi.fn>;
const appUpdateOne = JobApplication.updateOne as ReturnType<typeof vi.fn>;
const queueFindOne = ApplicationQueue.findOne as ReturnType<typeof vi.fn>;
const queueFind = ApplicationQueue.find as ReturnType<typeof vi.fn>;
const queueUpdateOne = ApplicationQueue.updateOne as ReturnType<typeof vi.fn>;
const queueUpdateMany = ApplicationQueue.updateMany as ReturnType<typeof vi.fn>;
const queueCreate = ApplicationQueue.create as ReturnType<typeof vi.fn>;
const eventFindOne = ApplicationEvent.findOne as ReturnType<typeof vi.fn>;
const eventCreate = ApplicationEvent.create as ReturnType<typeof vi.fn>;
const notificationUpdateMany = Notification.updateMany as ReturnType<typeof vi.fn>;
const reserve = AutoApplyQuotaService.reserve as ReturnType<typeof vi.fn>;
const consumeReservation = AutoApplyQuotaService.consumeReservation as ReturnType<typeof vi.fn>;

/** Chainable thenable so `await Model.findOne(...)` and `.sort().lean()` both work. */
function query(value: any) {
  const wrap = (v: any): any => ({
    sort: vi.fn(() => wrap(v)),
    select: vi.fn(() => wrap(v)),
    lean: vi.fn(() => Promise.resolve(v)),
    then: (onF: any, onR: any) => Promise.resolve(v).then(onF, onR),
  });
  return wrap(value);
}

const APP_ID = '507f1f77bcf86cd799439022';
const USER_ID = 'u1';
const APPROVAL_REASON =
  'Review mode: documents prepared and held for your approval before submission.';
const UNVERIFIED_REASON =
  'Application submitted but no confirmation evidence captured. Needs manual verification.';

const APPROVAL_HOLD_APP = {
  _id: APP_ID,
  userId: USER_ID,
  jobId: 'j1',
  currentStage: 'staging',
  internalStatus: 'review_required',
  deadLetter: false,
};

let activeItem: any;
let latestItem: any;
let reviewReason: string;

beforeEach(() => {
  vi.clearAllMocks();

  activeItem = null;
  latestItem = { _id: 'q-existing', status: 'completed', mode: 'review' };
  reviewReason = APPROVAL_REASON;

  appFindOne.mockReturnValue(query(APPROVAL_HOLD_APP));
  appUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  queueFindOne.mockImplementation((filter: any) =>
    filter?.status?.$in ? query(activeItem) : query(latestItem)
  );
  queueFind.mockReturnValue({ select: vi.fn(() => ({ lean: vi.fn(() => Promise.resolve([])) })) });
  queueUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  queueUpdateMany.mockResolvedValue({ modifiedCount: 1 });
  queueCreate.mockResolvedValue({ _id: 'q-new' });
  eventFindOne.mockImplementation(() => query({ metadata: { reason: reviewReason } }));
  eventCreate.mockResolvedValue({});
  notificationUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  reserve.mockResolvedValue({ success: true, reservationId: 'r1' });
  consumeReservation.mockResolvedValue({});
});

describe('approve', () => {
  it('re-queues the existing queue item with mode auto and resets its attempts', async () => {
    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'approve',
    });

    expect(result.status).toBe('queued');
    expect(result.queueItemId).toBe('q-existing');

    expect(queueUpdateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = queueUpdateOne.mock.calls[0];
    expect(filter).toEqual({ _id: 'q-existing' });
    expect(update.$set).toMatchObject({
      status: 'queued',
      mode: 'auto',
      priority: 90,
      attempts: 0,
      lockedAt: null,
      lockedBy: null,
    });
    expect(update.$unset).toHaveProperty('lastError');

    // No second quota unit: the original enqueue already consumed it.
    expect(reserve).not.toHaveBeenCalled();

    expect(appUpdateOne.mock.calls[0][1].$set).toMatchObject({
      internalStatus: 'queued',
      automationEnabled: true,
      deadLetter: false,
    });
    expect(appUpdateOne.mock.calls[0][1].$push.stageHistory).toMatchObject({
      internalStatus: 'queued',
      source: 'user',
      reason: 'User approved automated submission',
    });

    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'APPLICATION_REVIEW_DECIDED',
        source: 'user',
        previousStatus: 'review_required',
        newStatus: 'queued',
      })
    );
    expect(notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        read: false,
        'metadata.applicationId': APP_ID,
      }),
      expect.anything()
    );
  });

  it('answers idempotently when an item is already queued or processing', async () => {
    activeItem = { _id: 'q-live', status: 'processing' };

    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'approve',
    });

    expect(result.status).toBe('already_queued');
    expect(result.queueItemId).toBe('q-live');
    expect(queueUpdateOne).not.toHaveBeenCalled();
    expect(appUpdateOne).not.toHaveBeenCalled();
  });

  it('refuses to re-submit an unverified submission (double-apply hazard)', async () => {
    reviewReason = UNVERIFIED_REASON;

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'approve' })
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect(queueUpdateOne).not.toHaveBeenCalled();
    expect(appUpdateOne).not.toHaveBeenCalled();
  });

  it('refuses when the application is not awaiting approval', async () => {
    appFindOne.mockReturnValue(query({ ...APPROVAL_HOLD_APP, internalStatus: 'applied' }));

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'approve' })
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  it('creates a queue item (with a quota reservation) only when none ever existed', async () => {
    latestItem = null;

    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'approve',
    });

    expect(result.status).toBe('queued');
    expect(result.queueItemId).toBe('q-new');
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(queueCreate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'queued', mode: 'auto', priority: 90 })
    );
    expect(consumeReservation).toHaveBeenCalledWith('r1', {
      applicationId: APP_ID,
      queueItemId: 'q-new',
    });
  });

  it('maps quota exhaustion to QUOTA_EXCEEDED without touching the application', async () => {
    latestItem = null;
    reserve.mockResolvedValue({ success: false, error: 'Daily limit reached' });

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'approve' })
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED', message: 'Daily limit reached' });
    expect(appUpdateOne).not.toHaveBeenCalled();
  });
});

describe('retry', () => {
  it('re-queues after a failed run', async () => {
    appFindOne.mockReturnValue(
      query({ ...APPROVAL_HOLD_APP, internalStatus: 'automation_failed', deadLetter: true })
    );

    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'retry',
    });

    expect(result.status).toBe('queued');
    expect(queueUpdateOne).toHaveBeenCalledTimes(1);
    expect(appUpdateOne.mock.calls[0][1].$unset).toMatchObject({ deadLetterReason: '' });
    expect(appUpdateOne.mock.calls[0][1].$set).toMatchObject({ deadLetter: false });
  });

  it('refuses when nothing failed', async () => {
    appFindOne.mockReturnValue(query({ ...APPROVAL_HOLD_APP, internalStatus: 'review_required' }));

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'retry' })
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
});

describe('dismiss', () => {
  it('cancels queued items, stops automation and clears the review state', async () => {
    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'dismiss',
    });

    expect(result.status).toBe('dismissed');

    expect(queueUpdateMany).toHaveBeenCalledWith(
      { applicationId: APP_ID, status: 'queued' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'cancelled' }),
      })
    );

    expect(appUpdateOne.mock.calls[0][1].$set).toMatchObject({
      internalStatus: 'automation_dismissed',
      applicationMethod: 'manual',
      automationEnabled: false,
    });
    expect(appUpdateOne.mock.calls[0][1].$push.stageHistory).toMatchObject({
      source: 'user',
      reason: 'User chose to apply manually',
    });
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'APPLICATION_REVIEW_DECIDED', newStatus: 'automation_dismissed' })
    );
    // Dismissal never consumes quota — nothing is being submitted.
    expect(reserve).not.toHaveBeenCalled();
  });

  it('works on a stale "queued" label with no live queue item behind it', async () => {
    appFindOne.mockReturnValue(query({ ...APPROVAL_HOLD_APP, internalStatus: 'queued' }));

    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'dismiss',
    });
    expect(result.status).toBe('dismissed');
  });

  it('refuses while a run is actually processing', async () => {
    activeItem = { _id: 'q-live', status: 'processing' };

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'dismiss' })
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect(appUpdateOne).not.toHaveBeenCalled();
  });

  it('is idempotent when already dismissed', async () => {
    appFindOne.mockReturnValue(query({ ...APPROVAL_HOLD_APP, internalStatus: 'automation_dismissed' }));

    const result = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'dismiss',
    });
    expect(result.status).toBe('dismissed');
  });
});

describe('guards', () => {
  it('404s for an application that does not exist (or belongs to someone else)', async () => {
    appFindOne.mockReturnValue(query(null));

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'approve' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects unknown actions and malformed ids', async () => {
    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: APP_ID, action: 'explode' as any })
    ).rejects.toMatchObject({ code: 'INVALID_ACTION' });

    await expect(
      performAutomationAction({ userId: USER_ID, applicationId: 'nope', action: 'approve' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is a typed error the route can map to HTTP statuses', async () => {
    appFindOne.mockReturnValue(query(null));
    const err = await performAutomationAction({
      userId: USER_ID,
      applicationId: APP_ID,
      action: 'approve',
    }).catch((e) => e);
    expect(err).toBeInstanceOf(AutomationActionError);
  });
});
