import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationWatchdog, DEFAULT_WATCHDOG_CONFIG } from './watchdog';
import { applicationStateMachine } from '@/lib/application-state/stateMachine';

vi.mock('@/lib/application-state/stateMachine', () => ({
  applicationStateMachine: { transition: vi.fn().mockResolvedValue({ success: true }) },
}));

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

const app = (overrides: Record<string, any> = {}) => ({
  _id: '507f1f77bcf86cd799439022',
  userId: 'u1',
  jobId: 'j1',
  updatedAt: minutesAgo(60),
  internalStatus: 'queued',
  ...overrides,
});

function fakeDb(
  apps: any[],
  pendingQueue: { applicationId: any; status: string }[] = [],
  updates?: any[]
) {
  // Minimal Mongo matcher for the two query shapes the watchdog uses ($in / $lt / equality), so the
  // fake honours the scan's filters instead of returning everything.
  const matches = (doc: any, q: any) =>
    Object.entries(q).every(([key, cond]: [string, any]) => {
      if (cond && typeof cond === 'object' && '$in' in cond) return cond.$in.includes(doc[key]);
      if (cond && typeof cond === 'object' && '$lt' in cond) return new Date(doc[key]) < cond.$lt;
      return doc[key] === cond;
    });

  return {
    collection: (name: string) => {
      if (name === 'jobapplications') {
        const coll: any = { find: (q: any) => ({ toArray: async () => apps.filter((a) => matches(a, q)) }) };
        if (updates) {
          coll.updateOne = async (_q: any, u: any) => {
            updates.push(u);
          };
        }
        return coll;
      }
      if (name === 'applicationqueues') {
        return {
          find: (q: any) => ({
            project: () => ({
              toArray: async () => pendingQueue.filter((p) => matches(p, q)),
            }),
          }),
        };
      }
      throw new Error(`unexpected collection: ${name}`);
    },
  } as any;
}

const watchdog = new ApplicationWatchdog();
const transitionMock = applicationStateMachine.transition as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  transitionMock.mockResolvedValue({ success: true });
});

describe('ApplicationWatchdog.scanForStuckApplications — queued branch escalation', () => {
  it('routes a queued application with NO live queue item to review (no retry loop)', async () => {
    const reports = await watchdog.scanForStuckApplications(fakeDb([app()], []));

    expect(reports).toHaveLength(1);
    expect(reports[0].recommendedAction).toBe('route_review_required');
    expect(reports[0].reason).toMatch(/no live queue item/i);
  });

  it('keeps the retry hint when the queue item still exists (worker may just be down)', async () => {
    const reports = await watchdog.scanForStuckApplications(
      fakeDb([app()], [{ applicationId: '507f1f77bcf86cd799439022', status: 'queued' }])
    );

    expect(reports).toHaveLength(1);
    expect(reports[0].recommendedAction).toBe('retry_transient');
  });

  it('treats an unreadable queue collection as orphaned (review beats looping)', async () => {
    const db = {
      collection: (name: string) => {
        if (name === 'jobapplications') return { find: () => ({ toArray: async () => [app()] }) };
        throw new Error('collection unavailable');
      },
    } as any;

    const reports = await watchdog.scanForStuckApplications(db);

    expect(reports[0].recommendedAction).toBe('route_review_required');
  });

  it('does not report applications that are merely old but not past the threshold', async () => {
    const fresh = app({ updatedAt: minutesAgo(DEFAULT_WATCHDOG_CONFIG.maxQueuedMinutes - 1) });

    const reports = await watchdog.scanForStuckApplications(fakeDb([fresh], []));

    expect(reports).toHaveLength(0);
  });
});

describe('ApplicationWatchdog.scanForStuckApplications — other branches', () => {
  it('escalates stuck submitting/verification immediately (crash danger)', async () => {
    const reports = await watchdog.scanForStuckApplications(
      fakeDb([app({ internalStatus: 'submitting', updatedAt: minutesAgo(6) })])
    );

    expect(reports).toHaveLength(1);
    expect(reports[0].recommendedAction).toBe('route_review_required');
  });

  it('flags stuck processing as a transient retry', async () => {
    const reports = await watchdog.scanForStuckApplications(
      fakeDb([app({ internalStatus: 'processing', updatedAt: minutesAgo(20) })])
    );

    expect(reports).toHaveLength(1);
    expect(reports[0].recommendedAction).toBe('retry_transient');
  });
});

describe('ApplicationWatchdog.autoRecoverStuckApplications', () => {
  it('routes review recommendations through the state machine with a watchdog reason', async () => {
    const reports = await watchdog.scanForStuckApplications(fakeDb([app()], []));

    const recovered = await watchdog.autoRecoverStuckApplications(fakeDb([app()], []), reports);

    expect(recovered).toBe(1);
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetStage: 'staging',
        targetStatus: 'review_required',
        source: 'system',
      })
    );
  });

  it('releases transient failures back to queued without touching the state machine', async () => {
    const stuck = app({ internalStatus: 'processing', updatedAt: minutesAgo(20) });
    const updates: any[] = [];
    const db = fakeDb([stuck], [], updates);

    const reports = await watchdog.scanForStuckApplications(db);
    const recovered = await watchdog.autoRecoverStuckApplications(db, reports);

    expect(recovered).toBe(1);
    expect(updates[0].$set.internalStatus).toBe('queued');
    expect(transitionMock).not.toHaveBeenCalled();
  });
});
