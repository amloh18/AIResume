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
  fillGreenhouseFields,
  submitGreenhouseForm,
} from '@/lib/services/atsPlaywrightService';
import { getCVWithTemplate } from '@/lib/cv-template-utils';
import { resolveTemplate } from '@/lib/services/templateResolutionService';
import { PDFService } from '@/lib/services/pdfService';

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
vi.mock('@/lib/applications/progress-reporter', () => ({
  reportApplicationProgress: vi.fn().mockResolvedValue(undefined),
}));
// `resolveResumeAttachment` pulls these in with dynamic `import()`; vitest resolves those through the
// same module graph, so a plain `vi.mock` intercepts them.
vi.mock('@/lib/cv-template-utils', () => ({ getCVWithTemplate: vi.fn() }));
vi.mock('@/lib/services/templateResolutionService', () => ({ resolveTemplate: vi.fn() }));
vi.mock('@/lib/services/pdfService', () => ({
  PDFService: { generatePDF: vi.fn() },
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

/*
  SB-16. The four ATS fillers have always accepted `resumePdf` + `resumeFileName` and uploaded them via
  `setInputFiles`, but no caller ever passed either and `JobApplication.attachments` is written by no code
  path — so an automated run submitted the candidate's name and email with **no resume attached**. These
  tests pin the two halves of the fix: the CV is rendered and passed, and a failed render parks instead of
  submitting.
*/
describe('UnifiedApplyService.apply — resume attachment (SB-16)', () => {
  const fillMock = vi.mocked(fillGreenhouseFields);
  const submitMock = vi.mocked(submitGreenhouseForm);
  const getCvMock = vi.mocked(getCVWithTemplate);
  const resolveTemplateMock = vi.mocked(resolveTemplate);
  const generatePdfMock = vi.mocked(PDFService.generatePDF);

  /** A form that is actually detected, so the handler proceeds past detection to the fill. */
  function detectableForm() {
    detectFieldsMock.mockResolvedValue({
      formDetected: true,
      fields: [
        { name: 'first_name', type: 'text', label: 'First Name', required: true },
        { name: 'resume', type: 'file', label: 'Resume/CV', required: true },
      ],
      atsType: 'greenhouse',
      hasCAPTCHA: false,
    } as any);
  }

  /**
   * Stand-in for a Mongoose query: awaitable *and* `.lean()`-able.
   *
   * `ensureJourneyAndDocuments` awaits the query directly while `resolveResumeAttachment` calls
   * `.lean()` on it — both are valid on a real Mongoose query, so the double has to support both.
   */
  function journeyQuery(doc: any) {
    return Object.assign(Promise.resolve(doc), { lean: () => Promise.resolve(doc) });
  }

  beforeEach(() => {
    const { browser } = fakeBrowser();
    acquireMock.mockResolvedValue({ browser });
    detectableForm();
    fillMock.mockResolvedValue({ fieldsFilled: 5, skippedFields: [] } as any);
    submitMock.mockResolvedValue({
      confirmed: true,
      hasCAPTCHA: false,
      confirmationId: 'ABC123',
    } as any);
  });

  it('renders the tailored CV and hands the PDF to the filler', async () => {
    (ApplicationJourney.findOne as any).mockReturnValue(
      journeyQuery({ _id: 'j1', cvId: 'cv-tailored' })
    );
    getCvMock.mockResolvedValue({ cvData: { basics: { name: 'Jane Doe' } } } as any);
    resolveTemplateMock.mockResolvedValue({ template: { id: 'default' } } as any);
    // `PDFService.generatePDF` resolves to a Blob; `arrayBuffer()` is the only method the caller uses,
    // and the test environment's `Blob` does not implement it.
    generatePdfMock.mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
    } as any);

    const result = await UnifiedApplyService.apply(USER_ID, context, { mode: 'auto' });

    // The journey's tailored CV is preferred over the master CV.
    expect(getCvMock).toHaveBeenCalledWith('cv-tailored');
    expect(fillMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        resumePdf: expect.any(Buffer),
        resumeFileName: 'Jane-Doe-Resume.pdf',
      })
    );
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('applied');
  });

  it('refuses to submit — and does not click submit — when the CV cannot be rendered', async () => {
    // No tailored CV on the journey and no master CV id → `resolveResumeAttachment` returns null.
    (ApplicationJourney.findOne as any).mockReturnValue(journeyQuery({ _id: 'j1' }));
    (CV.findOne as any).mockReturnValue({ lean: () => Promise.resolve({ basics: {} }) });

    const result = await UnifiedApplyService.apply(USER_ID, context, { mode: 'auto' });

    expect(submitMock).not.toHaveBeenCalled();
    expect(result.status).toBe('action_required');
    // User-facing copy: no stack traces, URLs or snake_case tokens (SB-08).
    expect(result.message).toMatch(/wasn't ready to attach/i);
  });
});

/*
  SB-05. A company-hosted Greenhouse board does not serve the application form at its marketing URL.
  `https://stripe.com/jobs/search?gh_jid=8190046` answered with `net::ERR_TOO_MANY_REDIRECTS` and
  `https://careers.airbnb.com/positions/8232474?gh_jid=8232474` rendered no form at all, so real runs
  navigated, found nothing, and parked with "No application form detected" — which the tracker renders
  as **"Apply manually"**. The `gh_jid` value *is* the Greenhouse job id, so the fix rewrites those
  URLs to `/embed/job_app?token=<id>`, which serves the form directly.

  These tests pin the rewrite and, just as importantly, the two cases it must NOT touch — a rewrite
  that guesses would send non-Greenhouse applications to a form that isn't theirs.
*/
describe('UnifiedApplyService.apply — Greenhouse navigation URL (SB-05)', () => {
  const EMBED = 'https://boards.greenhouse.io/embed/job_app?token=';

  /** Drive `apply()` far enough to record the URL `page.goto` was handed. */
  async function navigatedTo(jobUrl: string) {
    const { browser, gotoCalls } = fakeBrowser();
    acquireMock.mockResolvedValue({ browser });

    await UnifiedApplyService.apply(USER_ID, { ...context, jobUrl }, { mode: 'auto' });

    expect(gotoCalls).toHaveLength(1);
    return gotoCalls[0];
  }

  it('rewrites company-hosted gh_jid URLs to the Greenhouse embed endpoint', async () => {
    // The exact URLs production failed on (server_bugs.md §SB-05).
    expect(await navigatedTo('https://stripe.com/jobs/search?gh_jid=8190046')).toBe(`${EMBED}8190046`);
    expect(await navigatedTo('https://careers.airbnb.com/positions/8232474?gh_jid=8232474')).toBe(
      `${EMBED}8232474`
    );
    // Duplicated query param (a real URL from the worker log) — resolves on the first one.
    expect(await navigatedTo('https://jobs.elastic.co/jobs?gh_jid=8121805&gh_jid=8121805')).toBe(
      `${EMBED}8121805`
    );
    // `&` separator, not `?`.
    expect(await navigatedTo('https://databricks.com/company/careers/open-positions/job?x=1&gh_jid=8788172002')).toBe(
      `${EMBED}8788172002`
    );
  });

  it('leaves a real Greenhouse board URL untouched', async () => {
    const url = 'https://boards.greenhouse.io/acme/jobs/12345';
    expect(await navigatedTo(url)).toBe(url);
    expect(await navigatedTo('https://job-boards.greenhouse.io/stripe/jobs/123')).toBe(
      'https://job-boards.greenhouse.io/stripe/jobs/123'
    );
  });

  it('leaves non-Greenhouse URLs untouched — the rewrite must not guess', async () => {
    for (const url of [
      'https://jobs.lever.co/acme/abc-123',
      'https://jobs.ashbyhq.com/elevenlabs/347282a4-74ff-4e56-a92d-3c4249ee6c28/application',
      // `gh_jid` is Greenhouse's own query param, so the host is irrelevant *when a token is present*.
      // What matters is the other direction: no token ⇒ no rewrite, whatever the host.
      'https://tiketdotcom.wd3.myworkdayjobs.com/tiket_careers/job/Jakarta-Indonesia/Creative-Designer',
    ]) {
      expect(await navigatedTo(url)).toBe(url);
    }
  });
});
