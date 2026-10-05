/**
 * Tests for AutoApplyQuotaService binding-cap resolution.
 *
 * The service is the single enforcement point for Auto-Apply quota. Its
 * binding-cap precedence (free → lifetime, starter → monthly, focused → daily)
 * must match the numbers the UI displays — the "12 of 10 used, nothing
 * blocked" bug was exactly this precedence disagreeing between surfaces.
 *
 * resolveBindingCap is private; these tests exercise it through reserve()'s
 * post-insert recheck, mocking the DB layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockCount = vi.fn();

vi.mock('mongoose', () => ({
  default: { Types: { ObjectId: class {} } },
  Types: { ObjectId: class {} },
}));

vi.mock('@/lib/database', () => ({
  getConnection: vi.fn(async () => ({})),
}));

vi.mock('@/models/AutoApplyReservation', () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    countDocuments: async (q: any) => mockCount(q),
    findOne: async () => null,
  },
}));

/**
 * The service calls `User.findById(id).lean()` — findById must return a
 * thenable WITH a .lean() method, not a bare Promise.
 */
function userDoc(subscription: { planKey: string }) {
  return {
    lean: () => Promise.resolve({ subscription }),
    then: (resolve: any, reject: any) => Promise.resolve({ subscription }).then(resolve, reject),
  };
}

vi.mock('@/models/User', () => ({
  default: {
    findById: vi.fn(() => userDoc({ planKey: 'starter_monthly' })),
    findOne: async () => null,
  },
}));

import { AutoApplyQuotaService } from './autoApplyQuotaService';

/**
 * Drive the countDocuments calls inside getUsage() by inspecting each query's
 * shape (robust to call-order changes in the implementation):
 *   period consumed → createdAt + status 'consumed'
 *   period reserved → createdAt + status 'reserved'
 *   daily           → createdAt + status $in
 *   lifetime        → status 'consumed', NO createdAt
 *
 * `bumpConsumedAfterCalls` simulates a CONCURRENT request landing between the
 * pre-insert check and the post-insert recheck: after N countDocuments calls,
 * the consumed count jumps. That is exactly the race the recheck exists for.
 */
function mockUsage(opts: {
  consumed: number;
  reserved: number;
  dailyUsed: number;
  lifetimeUsed?: number;
  bumpConsumedAfterCalls?: { after: number; by: number };
}) {
  let calls = 0;
  let consumed = opts.consumed;
  mockCount.mockImplementation(async (q: any) => {
    calls += 1;
    if (opts.bumpConsumedAfterCalls && calls > opts.bumpConsumedAfterCalls.after) {
      consumed += opts.bumpConsumedAfterCalls.by;
      opts.bumpConsumedAfterCalls = undefined; // bump once
    }
    const hasCreated = q.createdAt !== undefined;
    if (!hasCreated) return opts.lifetimeUsed ?? 0; // lifetime query
    if (q.status?.$in) return opts.dailyUsed;
    if (q.status === 'consumed') return consumed;
    if (q.status === 'reserved') return opts.reserved;
    return 0;
  });
}

describe('AutoApplyQuotaService plan configs', () => {
  it('uses the canonical limits across plans', () => {
    // Starter: 10 per billing month (matches paywall + legal copy)
    expect(AutoApplyQuotaService.getPlanConfig('starter').monthlyLimit).toBe(10);
    // Focused: the DAILY cap binds (50/day); monthly is uncapped
    expect(AutoApplyQuotaService.getPlanConfig('focused').dailyLimit).toBe(50);
    expect(AutoApplyQuotaService.getPlanConfig('focused').monthlyLimit).toBe(-1);
    // Free: 10 lifetime
    expect(AutoApplyQuotaService.getPlanConfig('free').lifetimeLimit).toBe(10);
  });
});

describe('AutoApplyQuotaService.reserve post-insert recheck', () => {
  beforeEach(() => {
    mockFindByIdAndUpdate.mockReset();
    mockCreate.mockReset();
  });

  it('releases the over-cap reservation when a concurrent request consumed the last slot (starter)', async () => {
    /*
      checkQuota sees 9/10 (passes); a concurrent reservation lands before our
      insert; the post-insert recheck sees 11/10 and must release THIS one.
      getUsage() issues 3 countDocuments for paid plans, so the bump fires
      between the two reads.
    */
    mockUsage({
      consumed: 9,
      reserved: 0,
      dailyUsed: 5,
      bumpConsumedAfterCalls: { after: 3, by: 2 },
    });

    mockCreate.mockResolvedValue({ _id: { toString: () => 'r1' } });
    mockFindByIdAndUpdate.mockResolvedValue({});

    const result = await AutoApplyQuotaService.reserve('user1', 'op1');

    expect(result.success).toBe(false);
    // Reason carries the actual overage the user hit (11 used against the 10 cap).
    expect(result.error).toContain('(11/10)');
    // …and the reset window, since the user asked "when does it refresh?"
    expect(result.error).toContain('Resets');
    // The losing reservation must be released, not leaked in 'reserved'.
    expect(mockFindByIdAndUpdate).toHaveBeenCalled();
  });

  it('succeeds when usage stays within the cap', async () => {
    mockUsage({ consumed: 3, reserved: 1, dailyUsed: 2 });

    mockCreate.mockResolvedValue({ _id: { toString: () => 'r2' } });

    const result = await AutoApplyQuotaService.reserve('user1', 'op2');

    expect(result.success).toBe(true);
    expect(result.usage?.remaining).toBe(6); // 10 - (3 consumed + 1 reserved)
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks starter entirely at the monthly cap', async () => {
    // checkQuota short-circuits before insert when usage.total >= cap
    mockUsage({ consumed: 10, reserved: 0, dailyUsed: 10 });

    const result = await AutoApplyQuotaService.reserve('user1', 'op3');

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('blocks focused at the daily cap of 50 (the binding limit)', async () => {
    // Resolve plan as focused via the user doc
    const { default: User } = await import('@/models/User');
    (User.findById as any).mockImplementationOnce(() => userDoc({ planKey: 'focused_monthly' }));

    mockUsage({ consumed: 50, reserved: 0, dailyUsed: 50 });

    const result = await AutoApplyQuotaService.reserve('user1', 'op4');

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('AutoApplyQuotaService.getUsageSummary', () => {
  it('reports the binding cap per plan, not always the monthly bucket', async () => {
    // Starter: monthly binds
    mockUsage({ consumed: 12, reserved: 0, dailyUsed: 12 });
    const starter = await AutoApplyQuotaService.getUsageSummary('user1');
    expect(starter.limit).toBe(10);
    expect(starter.used).toBe(12);
    expect(starter.remaining).toBe(0);
  });
});
