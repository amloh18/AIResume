import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeApplicationDecision, type DecisionInput } from './engine';
import User from '@/models/User';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';

vi.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: vi.fn() },
}));
vi.mock('@/models/JobApplication', () => ({
  __esModule: true,
  default: { findOne: vi.fn() },
}));
vi.mock('@/models/CV', () => ({
  __esModule: true,
  default: { find: vi.fn() },
}));

const leanOf = (value: any) => ({ lean: () => Promise.resolve(value) });

/** Risk-free job input: known ATS, real URL, long description, normal salary. */
function baseInput(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    userId: '507f1f77bcf86cd799439011',
    job: {
      title: 'Senior Frontend Engineer',
      company: 'Acme Corp',
      jobUrl: 'https://jobs.acme.test/senior-frontend-engineer',
      jobDescription:
        'We need react typescript node.js aws docker kubernetes postgresql graphql ci/cd agile. ' +
        'You will build product features with the team, review designs, ship experiments, mentor ' +
        'engineers, own the frontend platform, improve performance, and collaborate with designers.',
      location: 'Remote',
      atsType: 'greenhouse',
      workMode: 'remote',
    },
    ...overrides,
  } as DecisionInput;
}

const MASTER_CV = [{ _id: 'cv-master-1', metadata: { isMaster: true } }];

beforeEach(() => {
  vi.clearAllMocks();
  (User.findById as any).mockReturnValue(leanOf({}));
  (JobApplication.findOne as any).mockReturnValue(leanOf(null));
  (CV.find as any).mockReturnValue(leanOf(MASTER_CV));
});

describe('makeApplicationDecision — hard SKIP', () => {
  it('returns skip when a hard filter fails (sponsorship) and never gets to scoring', async () => {
    (User.findById as any).mockReturnValue(
      leanOf({ workAuthorization: 'requires_sponsorship' })
    );

    const result = await makeApplicationDecision(
      baseInput({ job: { ...baseInput().job, sponsorship: 'no' } })
    );

    expect(result.mode).toBe('skip');
    expect(result.reason).toMatch(/Hard filter failed/);
    expect(result.reason).toMatch(/sponsorship/i);
    expect(result.hardFilters?.passed).toBe(false);
    expect(result.matchScore).toBeUndefined();
  });

  it('returns skip for a duplicate application (same job URL)', async () => {
    (JobApplication.findOne as any).mockReturnValue(
      leanOf({ _id: '507f1f77bcf86cd799439099' })
    );

    const result = await makeApplicationDecision(baseInput());

    expect(result.mode).toBe('skip');
    expect(result.reason).toMatch(/Duplicate application detected/);
    expect(result.duplicate?.isDuplicate).toBe(true);
  });

  it('returns skip for a missing job title', async () => {
    const input = baseInput();
    const job = { ...input.job, title: '' };
    const result = await makeApplicationDecision({ ...input, job });

    expect(result.mode).toBe('skip');
    expect(result.hardFilters?.passed).toBe(false);
  });
});

describe('makeApplicationDecision — mode selection', () => {
  it('picks auto for a clean, high-match job with a master CV', async () => {
    const result = await makeApplicationDecision(baseInput());

    expect(result.mode).toBe('auto');
    expect(result.matchScore).toBeGreaterThanOrEqual(70);
    expect(result.selectedCvId).toBe('cv-master-1');
    expect(result.risk?.riskLevel).toBe('low');
  });

  it('never returns auto when the user has no CV', async () => {
    (CV.find as any).mockReturnValue(leanOf([]));

    const result = await makeApplicationDecision(baseInput());

    expect(result.mode).not.toBe('auto');
    expect(result.warnings).toContainEqual(
      expect.stringMatching(/No CV found/)
    );
  });

  it('honours an explicit requestedMode of manual (user held it back)', async () => {
    const result = await makeApplicationDecision(
      baseInput({ requestedMode: 'manual' })
    );

    expect(result.mode).toBe('manual');
  });

  it('honours an explicit requestedMode of auto (post-approval re-queue)', async () => {
    const result = await makeApplicationDecision(
      baseInput({ requestedMode: 'auto' })
    );

    expect(result.mode).toBe('auto');
  });

  it('keeps auto on a low match score — relevance must not veto submission', async () => {
    /*
      This test used to assert `mode === 'review'`, which is what the product did until 2026-09-27 and is
      exactly why nothing was being submitted: `computeBasicMatchScore` counts ten hardcoded tech keywords,
      so it returns 0–40 for every non-software role, and the veto silently moved ~92% of applications
      (measured: 92 of 99 scored ≤40) out of `auto` and into `review` — a mode that prepares documents and
      never submits. The score is a *ranking* signal; safety belongs to `assessApplicationRisk`.
    */
    const input = baseInput();
    const result = await makeApplicationDecision({
      ...input,
      job: {
        ...input.job,
        // No keyword overlap → match 0, but still a well-formed, low-risk listing.
        jobDescription:
          'Role listing with enough characters to avoid the vague-description risk factor. '.repeat(4),
      },
    });

    expect(result.matchScore).toBe(0);
    expect(result.mode).toBe('auto');
    expect(result.warnings).toContainEqual(
      expect.stringMatching(/Low keyword match/)
    );
  });

  it('recommends manual for a high-risk listing (missing job URL → risk ≥ 40)', async () => {
    const input = baseInput();
    const job = { ...input.job, jobUrl: undefined, atsType: undefined };

    const result = await makeApplicationDecision({
      ...input,
      job: {
        ...job,
        jobDescription: 'x'.repeat(300),
        company: 'Acme',
        // unknown ATS (15) + no job URL (20) + heavy competition (8) = 43 → high risk → manual
        applicantsCount: 900,
      },
    });

    expect(result.risk?.riskLevel).toBe('high');
    expect(result.mode).toBe('manual');
  });
});
