import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyApplicationAlert,
  notifyApplicationNeedsAction,
} from './applicationActionNotifier';
import Notification from '@/models/Notification';
import notificationService from '@/lib/services/notificationService';

vi.mock('@/models/Notification', () => ({
  __esModule: true,
  default: { findOne: vi.fn() },
}));
vi.mock('@/lib/services/notificationService', () => ({
  __esModule: true,
  default: { createNotification: vi.fn() },
}));

const findOne = Notification.findOne as ReturnType<typeof vi.fn>;
const createNotification = notificationService.createNotification as ReturnType<typeof vi.fn>;

function query(value: any) {
  return {
    sort: () => query(value),
    select: () => query(value),
    lean: () => Promise.resolve(value),
    then: (onF: any, onR: any) => Promise.resolve(value).then(onF, onR),
  };
}

const OUTCOME = {
  userId: 'u1',
  applicationId: '507f1f77bcf86cd799439022',
  jobTitle: 'Senior Engineer',
  company: 'Acme',
  status: 'review_required',
  reason: 'Review mode: documents prepared and held for your approval before submission.',
};

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockReturnValue(query(null));
  createNotification.mockResolvedValue({});
});

describe('classifyApplicationAlert', () => {
  it('routes approval holds to the approval alert', () => {
    expect(
      classifyApplicationAlert('review_required', 'Documents prepared. Awaiting your approval before submission.')
    ).toBe('application_approval_required');
  });

  it('routes every other park to the generic action alert', () => {
    expect(classifyApplicationAlert('review_required', 'CAPTCHA detected. Manual completion required.')).toBe(
      'application_action_required'
    );
    expect(classifyApplicationAlert('review_required', 'ATS type "naukri" is not automatable.')).toBe(
      'application_action_required'
    );
  });

  it('routes failures to the failure alert', () => {
    expect(classifyApplicationAlert('automation_failed', 'Timeout loading page')).toBe(
      'application_automation_failed'
    );
  });

  it('returns null for outcomes that need no action', () => {
    expect(classifyApplicationAlert('applied', 'Successfully submitted via greenhouse')).toBeNull();
    expect(classifyApplicationAlert('processing', 'Worker picked up application')).toBeNull();
  });
});

describe('notifyApplicationNeedsAction', () => {
  it('creates an interactive notification with a working deep link and dedupe key', async () => {
    await notifyApplicationNeedsAction(OUTCOME);

    expect(createNotification).toHaveBeenCalledTimes(1);
    const params = createNotification.mock.calls[0][0];
    expect(params).toMatchObject({
      userId: 'u1',
      type: 'application_approval_required',
      actionType: 'review_job',
      actionUrl: `/dashboard/jobs?tab=applications&jobId=${OUTCOME.applicationId}`,
      interactive: true,
      channels: ['in-app'],
    });
    expect(params.title).toContain('Acme');
    expect(params.metadata).toMatchObject({ applicationId: OUTCOME.applicationId });
    // Same key the approve/dismiss endpoint clears when the user acts.
    expect(params.actionData.jobId).toBe(OUTCOME.applicationId);
  });

  it('skips when a recent alert for the same application already exists (retry backoff cannot spam)', async () => {
    findOne.mockReturnValue(query({ _id: 'n1' }));

    await notifyApplicationNeedsAction({ ...OUTCOME, status: 'automation_failed', reason: 'boom' });

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('queries the dedupe window by type + application id', async () => {
    await notifyApplicationNeedsAction(OUTCOME);

    const filter = findOne.mock.calls[0][0];
    expect(filter).toMatchObject({
      userId: 'u1',
      type: 'application_approval_required',
      'metadata.applicationId': OUTCOME.applicationId,
      createdAt: { $gte: expect.any(Date) },
    });
  });

  it('does nothing for outcomes that need no action', async () => {
    await notifyApplicationNeedsAction({ ...OUTCOME, status: 'applied', reason: 'done' });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('never throws — a notification problem must not affect queue processing', async () => {
    createNotification.mockRejectedValue(new Error('db down'));
    await expect(notifyApplicationNeedsAction(OUTCOME)).resolves.toBeUndefined();

    findOne.mockImplementation(() => {
      throw new Error('db down');
    });
    await expect(notifyApplicationNeedsAction(OUTCOME)).resolves.toBeUndefined();
  });

  it('clamps oversized titles and messages to the schema limits', async () => {
    await notifyApplicationNeedsAction({
      ...OUTCOME,
      company: 'C'.repeat(300),
      reason: 'R'.repeat(1000),
    });

    const params = createNotification.mock.calls[0][0];
    expect(params.title.length).toBeLessThanOrEqual(200);
    expect(params.message.length).toBeLessThanOrEqual(500);
  });
});
