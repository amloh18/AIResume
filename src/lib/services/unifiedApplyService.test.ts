import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedApplyService, type ApplyJobContext } from './unifiedApplyService';
import User from '@/models/User';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';
import { acquirePlaywrightBrowser } from '@/lib/services/browserService';
import {
  detectCAPTCHA,
  detectGreenhouseFields,
} from '@/lib/services/atsPlaywrightService';

vi.mock('@/lib/database', () => ({
  getConnection: vi.fn().mockResolvedValue(undefined),
  ensureConnection: vi.fn().mockResolvedValue(undefined),
  closeConnection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/models/User', () => ({ __esModule: true, default: { findById: vi.fn() } }));
vi.mock('@/models/CV', () => ({ __esModule: true, default: { findOne: vi.fn() } }));
vi.mock('@/models/JobApplication', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn() },
}));
vi.mock('@/models/ApplicationJourney', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn() },
}));
vi.mock('@/lib/services/journeyDocumentService', () => ({
  createJourneyDocuments: vi.fn(),
}));
vi.mock('@/lib/services/browserService', () => ({
  acquirePlaywrightBrowser: vi.fn(),
}));
vi.mock('@/lib/services/atsPlaywrightService', () => ({
  detectCAPTCHA: vi.fn(),
  detectGreenhouseFields: vi.fn(),
  fillGreenhouseFields: vi.fn(),
  submitGreenhouseForm: vi.fn(),
}));
vi.mock('@/lib/services/applicationOutcomeService', () => ({
  recordApplicationOutcome: vi.fn().mockResolvedValue(undefined),
}));

const USER_ID = '507f1f77bcf86cd799439011';
const JOB_APP_ID = '507f1f77bcf86cd799439022';

const context: ApplyJobContext = {
  jobId: 'not-an-objectid',
  title: 'Senior Frontend Engineer',
  company: 'Acme Corp',
  description: 'Build things with react and typescript.',
  location: 'Remote',
  jobUrl: 'https://boards.greenhouse.io/acme/jobs/12345',
  atsType: 'greenhouse',
  source: 'auto_apply',
};

const acquireMock = acquirePlaywrightBrowser as ReturnType<typeof vi.fn>;
const journeyDocsMock = createJourneyDocuments as ReturnType<typeof vi.fn>;
const journeyFindByIdAndUpdate = ApplicationJourney.findByIdAndUpdate as ReturnType<typeof vi.fn>;
const detectCaptchaMock = vi.mocked(detectCAPTCHA);
const detectFieldsMock = vi.mocked(detectGreenhouseFields);

/** Minimal Playwright doubles that record the URL the page was actually navigated to. */
function fakeBrowser() {
  const gotoCalls: any[] = [];
  const page = {
    goto: vi.fn(async (url: any) => {
      gotoCalls.push(url);
      return { status: () => ({ status: 200 }) };
    }),
    close: vi.fn(async () => {}),
  };
  const browserContext = {
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {}),
  };
  const browser = {
    newContext: vi.fn(async () => browserContext),
    close: vi.fn(async () => {}),
  };
  return { browser, gotoCalls };
}

beforeEach(() => {
  vi.clearAllMocks();

  (User.findById as any).mockReturnValue({
    lean: () =>
      Promise.resolve({ _id: USER_ID, email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }),
  });
  (CV.findOne as any).mockReturnValue({
    lean: () => Promise.resolve({ basics: { name: 'Jane Doe', email: 'jane@example.com' } }),
  });
  (JobApplication.findOne as any).mockResolvedValue({ _id: JOB_APP_ID, status: 'saved' });
  (JobApplication.findByIdAndUpdate as any).mockResolvedValue({});
  (ApplicationJourney.findOne as any).mockResolvedValue({
    _id: 'j1',
    status: 'processing_documents',
  });
  journeyFindByIdAndUpdate.mockResolvedValue({});
  journeyDocsMock.mockResolvedValue({ success: true, cvId: 'cv1', coverLetterId: 'cl1' });
  acquireMock.mockReset();
  detectCaptchaMock.mockResolvedValue({ detected: false });
  detectFieldsMock.mockResolvedValue({
    formDetected: false,
    fields: [],
    atsType: 'greenhouse',
    hasCAPTCHA: false,
  } as any);
});

describe('UnifiedApplyService.apply — execution gate (mode)', () => {
  it('mode=review prepares documents and holds before any browser is launched', async () => {
    const result = await UnifiedApplyService.apply(USER_ID, context, { mode: 'review' });

    expect(result.status).toBe('action_required');
    expect(result.message).toMatch(/Awaiting your approval/);
    expect(journeyDocsMock).toHaveBeenCalledTimes(1); // documents *were* prepared
    expect(journeyFindByIdAndUpdate).toHaveBeenCalledWith('j1', { status: 'ready' });
    expect(acquireMock).not.toHaveBeenCalled(); // …but Playwright never started
  });

  it('mode=manual holds the same way and says no automation was attempted', async () => {
    const result = await UnifiedApplyService.apply(USER_ID, context, { mode: 'manual' });

    expect(result.status).toBe('action_required');
    expect(result.message).toMatch(/no automated submission was attempted/);
    expect(acquireMock).not.toHaveBeenCalled();
  });

  it('default (no options) keeps the previous auto behaviour — the browser path is entered', async () => {
    const { browser, gotoCalls } = fakeBrowser();
    acquireMock.mockResolvedValue({ browser });

    const result = await UnifiedApplyService.apply(USER_ID, context);

    expect(acquireMock).toHaveBeenCalledTimes(1);
    expect(gotoCalls).toEqual([context.jobUrl]);
    // `formDetected: false` → the handler bails to action_required, quoting the *real* job URL.
    expect(result.status).toBe('action_required');
    expect(result.message).toContain(context.jobUrl);
  });

  it('regression: Greenhouse navigation uses the job URL, not the (previously shadowing) Playwright context', async () => {
    const { browser, gotoCalls } = fakeBrowser();
    acquireMock.mockResolvedValue({ browser });

    await UnifiedApplyService.apply(USER_ID, context, { mode: 'auto' });

    expect(gotoCalls).toHaveLength(1);
    expect(gotoCalls[0]).toBe(context.jobUrl);
    expect(typeof gotoCalls[0]).toBe('string');
  });

  it('a user without a master CV still follows the same gate (documents come from the fallback)', async () => {
    // CV lookup misses — journeyDocumentService is the fallback path; the gate behaviour must not differ.
    (CV.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });

    const result = await UnifiedApplyService.apply(USER_ID, context, { mode: 'review' });

    expect(acquireMock).not.toHaveBeenCalled();
    expect(['action_required', 'saved']).toContain(result.status);
  });
});
