import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processApplication } from './processApplication';
import User from '@/models/User';
import CV from '@/models/CV';
import { applicationStateMachine } from '@/lib/application-state/stateMachine';
import { UnifiedApplyService } from '@/lib/services/unifiedApplyService';

vi.mock('@/models/JobApplication', () => ({
  __esModule: true,
  default: { findById: vi.fn(), findByIdAndUpdate: vi.fn() },
}));
vi.mock('@/models/ApplicationEvent', () => ({
  __esModule: true,
  default: {},
}));
vi.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: vi.fn() },
}));
vi.mock('@/models/CV', () => ({
  __esModule: true,
  default: { findOne: vi.fn() },
}));
vi.mock('@/lib/application-state/stateMachine', () => ({
  applicationStateMachine: { transition: vi.fn().mockResolvedValue(undefined) },
  CanonicalStage: {},
  InternalApplicationStatus: {},
}));
vi.mock('@/lib/services/unifiedApplyService', () => ({
  UnifiedApplyService: { apply: vi.fn() },
}));

const USER_ID = '507f1f77bcf86cd799439011';
const APP_ID = '507f1f77bcf86cd799439022';

function ctxWith(mode?: 'auto' | 'review' | 'manual' | 'skip') {
  return {
    queueItem: { _id: 'q1', ...(mode ? { mode } : {}) },
    jobApplication: {
      _id: APP_ID,
      userId: USER_ID,
      jobTitle: 'Backend Engineer',
      company: 'Acme',
      jobUrl: 'https://jobs.acme.test/be',
      atsType: 'greenhouse',
      currentStage: 'saved',
    },
  };
}

const applyMock = UnifiedApplyService.apply as ReturnType<typeof vi.fn>;
const transitionMock = applicationStateMachine.transition as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  (User.findById as any).mockReturnValue({ lean: () => Promise.resolve({ _id: USER_ID }) });
  (CV.findOne as any).mockReturnValue({
    lean: () => Promise.resolve({ _id: 'cv1', metadata: { isMaster: true } }),
  });
  applyMock.mockResolvedValue({
    success: true,
    atsType: 'greenhouse',
    status: 'action_required',
    message: 'held for review',
  });
});

describe('processApplication — execution gate (manual never reaches Playwright)', () => {
  it('mode=manual never calls UnifiedApplyService and lands in review_required', async () => {
    const result = await processApplication(ctxWith('manual'));

    expect(applyMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      stage: 'staging',
      status: 'review_required',
    });
    // Customer copy: says what happened and what to do, without naming the decision engine.
    expect(result.message).toMatch(/manually/i);
    expect(result.message).not.toMatch(/execution mode|engine/i);
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetStage: 'staging',
        targetStatus: 'review_required',
        eventType: 'APPLICATION_REQUIRES_REVIEW',
        // …and the operator cause is preserved on the channel no UI renders.
        operatorReason: expect.stringMatching(/execution mode is "manual"/i),
      })
    );
  });

  it('mode=skip never calls UnifiedApplyService', async () => {
    const result = await processApplication(ctxWith('skip'));

    expect(applyMock).not.toHaveBeenCalled();
    expect(result.status).toBe('review_required');

    /*
      This used to assert `result.message` matched /skip/i — but `message` is rendered to the
      customer (as the park reason, and as the notification body by `applicationWorker`), so pinning
      the operator wording there pinned the leak (SB-08). The customer copy must not name the
      decision engine; the technical cause belongs in `operatorReason`.
    */
    expect(result.message).not.toMatch(/skip|engine/i);
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: result.message,
        operatorReason: expect.stringMatching(/skip/i),
      })
    );
  });

  it('mode=review calls apply with mode "review" (prepare, do not submit)', async () => {
    const result = await processApplication(ctxWith('review'));

    expect(applyMock).toHaveBeenCalledTimes(1);
    expect(applyMock.mock.calls[0][2]).toEqual({ mode: 'review' });
    expect(result.status).toBe('review_required');
  });

  it('mode=auto calls apply with mode "auto"', async () => {
    applyMock.mockResolvedValue({
      success: true,
      atsType: 'greenhouse',
      status: 'applied',
      message: 'submitted',
      confirmationId: 'CONF-1',
    });

    await processApplication(ctxWith('auto'));

    expect(applyMock.mock.calls[0][2]).toEqual({ mode: 'auto' });
  });

  it('queue items written before `mode` existed default to review, not auto', async () => {
    const result = await processApplication(ctxWith(undefined));

    expect(applyMock).toHaveBeenCalledTimes(1);
    expect(applyMock.mock.calls[0][2]).toEqual({ mode: 'review' });
    expect(result.status).toBe('review_required');
  });

  it('refuses to mark an unverified submission as applied (no evidence → review)', async () => {
    applyMock.mockResolvedValue({
      success: true,
      atsType: 'greenhouse',
      status: 'applied',
      message: 'submitted',
      // no confirmationId / confirmationUrl
    });

    const result = await processApplication(ctxWith('auto'));

    expect(result).toMatchObject({ stage: 'staging', status: 'review_required' });
    expect(result.message).toMatch(/unverified/i);
  });
});
