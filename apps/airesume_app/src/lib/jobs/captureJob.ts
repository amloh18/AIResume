/**
 * Browser-extension job capture.
 *
 * The extension scrapes whatever job page the user is looking at (any job board,
 * any company careers page) and POSTs the result to `/api/jobs/capture`. This
 * module is the single place that decides what a scraped payload is allowed to
 * contain, how it maps onto the user's tracker row (`JobApplication`) and how it
 * maps onto the *shared* job catalog document (`jobs`).
 *
 * Why the catalog matters: the same scrape is published for every user, so a job
 * a human found on a company site that no scheduled source covers still shows up
 * in Discover for everyone. To make that safe, everything here is derived by the
 * ingestion engine's own normalizer (`normalizeRawJob`) — canonicalId,
 * contentHash and the description pipeline are identical to the worker path, so
 * a posting a worker later fetches dedups onto the user's capture instead of
 * creating a second catalog row.
 *
 * Nothing in a capture is trusted: every string is length-capped and typed, the
 * URL is canonicalised, and the catalog is only written when the page actually
 * looks like a real posting (title + company + enough description to be useful).
 */

import type { RawJob } from '@/lib/ingestion/engine';
import { sanitizeJobApplicationSource, type JobApplicationSource } from './jobApplicationSource';

/** Field caps — mirror the JobApplication model limits so a write can't fail validation. */
const MAX_TITLE = 200;
const MAX_COMPANY = 100;
const MAX_LOCATION = 200;
const MAX_URL = 500;
const MAX_DESCRIPTION = 45_000;
const MAX_NOTES = 2_000;
const MAX_SALARY = 10_000_000;

/**
 * Minimum description length before a capture is published to the shared
 * catalog. A page with a title and no body (a search result, a listing index)
 * would otherwise seed a useless catalog row for every user — it still lands in
 * the capturing user's tracker, it just isn't broadcast.
 */
export const MIN_CATALOG_DESCRIPTION = 200;

export interface CapturedJob {
  jobTitle: string;
  company: string;
  location: string;
  jobUrl: string;
  applyUrl: string;
  jobDescription: string;
  salary?: { min?: number; max?: number; currency?: string; period?: 'hourly' | 'monthly' | 'yearly' };
  employmentType?: string;
  remote?: boolean;
  sponsorship?: 'yes' | 'no' | 'unknown';
  postedDate?: string;
  /** The raw phrase the posting date was read from ("2 days ago"). */
  postedDateText?: string;
  /** Application closing date, when the posting states one. */
  deadline?: string;
  siteName: string;
  source: JobApplicationSource;
  atsType?: string;
  skills: string[];
  tags: string[];
  contacts: Array<{ name?: string; email?: string; phone?: string }>;
  /** How the extractor found the data — kept for diagnostics on the tracker row. */
  detector?: string;
  confidence?: number;
  notes: string;
}

export type CaptureResult =
  | { ok: true; job: CapturedJob }
  | { ok: false; error: string; status: number };

/** Trim, collapse whitespace and cap a value that should be a short string. */
function shortString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? collapsed.slice(0, max) : collapsed;
}

/** Multi-line text (descriptions) — preserve line structure, drop control noise. */
function longString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\u0000/g, '')
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 3)}...` : cleaned;
}

/**
 * Canonicalise a job URL: drop the fragment and tracking parameters and cap the
 * length. Returns '' for anything that is not an http(s) URL.
 *
 * This is what makes the stored `jobUrl` comparable between the extension, the
 * discovery feeds and the tracker's own dedup check.
 */
export function normalizeCapturedUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    const strip = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'ref', 'referrer', 'trk', 'trackingId', 'originalSubdomain',
      'currentJobId', 'position', 'pageNum', 'searchId', 'trackingId',
    ];
    strip.forEach((param) => url.searchParams.delete(param));
    url.hash = '';
    return url.toString().slice(0, MAX_URL);
  } catch {
    return '';
  }
}

/** Deterministic ATS label for a hostname, used for the tracker's `atsType`. */
export function detectAtsType(url: string): string | undefined {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (!host) return undefined;
  if (host.includes('greenhouse.io')) return 'greenhouse';
  if (host.includes('lever.co')) return 'lever';
  if (host.includes('ashbyhq.com')) return 'ashby';
  if (host.includes('myworkdayjobs.com') || host.includes('workday')) return 'workday';
  if (host.includes('workable.com')) return 'workable';
  if (host.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (host.includes('naukri.com')) return 'naukri';
  if (host.includes('indeed.com')) return 'indeed';
  if (host.includes('linkedin.com')) return undefined;
  return undefined;
}

/** Normalize the several salary shapes the extension can send. */
function parseSalary(raw: any): CapturedJob['salary'] {
  if (!raw) return undefined;

  let min: number | undefined;
  let max: number | undefined;
  let currency: string | undefined;
  let period: 'hourly' | 'monthly' | 'yearly' | undefined;

  if (typeof raw === 'string') {
    const numbers = raw.match(/\d[\d,.]*/g) || [];
    const parsed = numbers
      .map((n) => Number(n.replace(/[^\d.]/g, '')))
      .filter((n) => Number.isFinite(n) && n > 0)
      // A bare "$100k" arrives as "100" plus the multiplier text below, so a
      // range of 100–150 is rescaled before it is stored.
      .map((n) => n);
    if (parsed.length === 0) return undefined;
    const hasK = /(\d\s*k\b)|thousand/i.test(raw);
    const hasMillion = /million|\bm\b/i.test(raw);
    const scale = hasMillion ? 1_000_000 : hasK ? 1_000 : 1;
    min = Math.round(parsed[0] * scale);
    max = parsed.length > 1 ? Math.round(parsed[1] * scale) : undefined;
    currency = /\$|usd/i.test(raw) ? 'USD' : /\u20ac|eur/i.test(raw) ? 'EUR' : /\u00a3|gbp/i.test(raw) ? 'GBP' : undefined;
    period = /hour|\bhr\b/i.test(raw) ? 'hourly' : /month|\bmo\b/i.test(raw) ? 'monthly' : 'yearly';
  } else if (typeof raw === 'object') {
    min = Number(raw.min);
    max = Number(raw.max);
    currency = shortString(raw.currency, 3).toUpperCase() || undefined;
    period = ['hourly', 'monthly', 'yearly'].includes(raw.period) ? raw.period : undefined;
    if (!Number.isFinite(min) || min <= 0) min = undefined;
    if (!Number.isFinite(max) || max <= 0) max = undefined;
  }

  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && min > MAX_SALARY) min = undefined;
  if (max !== undefined && max > MAX_SALARY) max = undefined;
  if (min === undefined && max === undefined) return undefined;
  // A single value or an inverted range is stored as the lower bound only.
  if (min !== undefined && max !== undefined && max < min) max = min;

  return { min, max, currency: currency || 'USD', period: period || 'yearly' };
}

/**
 * Validate and normalize a raw capture payload.
 *
 * Accepts both the extension's own field names (`title`, `url`, `description`)
 * and the tracker's (`jobTitle`, `jobUrl`, `jobDescription`) so one endpoint
 * serves the floating save button, the sidebar and the legacy save path.
 */
export function sanitizeCapturedJob(input: any): CaptureResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'A job payload is required', status: 400 };
  }

  const jobTitle = shortString(input.jobTitle || input.title, MAX_TITLE);
  const company = shortString(input.company || input.companyName || input.employer, MAX_COMPANY);

  if (!jobTitle) return { ok: false, error: 'Job title is required', status: 400 };
  if (!company) return { ok: false, error: 'Company name is required', status: 400 };

  const jobUrl = normalizeCapturedUrl(input.jobUrl || input.url);
  const applyUrl = normalizeCapturedUrl(input.applyUrl) || jobUrl;

  const jobDescription = longString(input.jobDescription || input.description, MAX_DESCRIPTION);
  const location = shortString(input.location || input.jobLocation, MAX_LOCATION) || 'Remote';

  const skills = Array.isArray(input.skills)
    ? input.skills.map((s: unknown) => shortString(s, 50)).filter(Boolean).slice(0, 30)
    : [];

  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  const tags = rawTags
    .map((t: unknown) => shortString(t, 50))
    .filter(Boolean)
    .slice(0, 10);

  const contacts = Array.isArray(input.contacts)
    ? input.contacts
        .slice(0, 10)
        .map((c: any) => ({
          name: shortString(c?.name, 100) || undefined,
          email: shortString(c?.email, 100).toLowerCase() || undefined,
          phone: shortString(c?.phone, 20) || undefined,
        }))
        .filter((c: any) => c.name || c.email || c.phone)
    : [];

  const sponsorRaw = typeof input.sponsorship === 'string' ? input.sponsorship.toLowerCase() : '';
  const sponsorship: CapturedJob['sponsorship'] =
    sponsorRaw === 'yes' ? 'yes' : sponsorRaw === 'no' ? 'no' : undefined;

  const remote =
    typeof input.remote === 'boolean'
      ? input.remote
      : /remote|work from home|wfh|telecommut/i.test(`${location} ${input.employmentType || ''}`)
        ? true
        : undefined;

  const postedRaw = input.postedDate || input.postedAt || input.datePosted;
  const postedDate = (() => {
    if (!postedRaw) return undefined;
    const date = new Date(postedRaw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    })();

  const deadlineRaw = input.deadline || input.validThrough || input.closingDate;
  const deadline = (() => {
    if (!deadlineRaw) return undefined;
    const date = new Date(deadlineRaw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  })();

  return {
    ok: true,
    job: {
      jobTitle,
      company,
      location,
      jobUrl,
      applyUrl,
      jobDescription,
      salary: parseSalary(input.salary),
      employmentType: shortString(input.employmentType || input.jobType, 40) || undefined,
      remote,
      sponsorship,
      postedDate,
      postedDateText: shortString(input.postedDateText, 100) || undefined,
      deadline,
      siteName: shortString(input.siteName || input.source || '', 60) || 'extension',
      source: sanitizeJobApplicationSource(input.sourceId || input.source || 'extension'),
      atsType: shortString(input.atsType, 40) || detectAtsType(applyUrl || jobUrl),
      skills,
      tags,
      contacts,
      detector: shortString(input.detector, 60) || undefined,
      confidence: typeof input.confidence === 'number' ? Math.max(0, Math.min(1, input.confidence)) : undefined,
      notes: longString(input.notes, MAX_NOTES),
    },
  };
}

/**
 * True when a capture is worth publishing to the catalog every user sees.
 *
 * Requires a usable description: without one the row would pollute Discover
 * (and every future catalog search) with a title-only stub. The capturing user
 * still gets the job in their own tracker either way.
 */
export function isCatalogPublishable(capture: CapturedJob): boolean {
  if (!capture.jobTitle || !capture.company) return false;
  if (capture.jobDescription.length < MIN_CATALOG_DESCRIPTION) return false;
  return true;
}

/**
 * Map a capture onto the ingestion engine's `RawJob`.
 *
 * `sourceJobId` is derived from the URL so a repeat capture of the same posting
 * (and a scheduled worker that later finds it) resolves to one catalog row.
 */
export function captureToRawJob(capture: CapturedJob, capturedBy?: string): RawJob {
  const url = capture.applyUrl || capture.jobUrl;
  let sourceJobId = url;
  try {
    const parsed = new URL(url);
    // Prefer the site's own job id when the URL carries one — it is stable
    // across the tracking-parameter churn these boards add per click.
    const fromQuery =
      parsed.searchParams.get('currentJobId') ||
      parsed.searchParams.get('jobId') ||
      parsed.searchParams.get('gh_jid') ||
      parsed.searchParams.get('job_id');
    sourceJobId = fromQuery || `${parsed.hostname}${parsed.pathname}`;
  } catch {
    sourceJobId = url || `capture-${Date.now()}`;
  }

  return {
    source: 'extension-capture',
    sourceSecondary: capture.siteName,
    sourceJobId,
    url,
    title: capture.jobTitle,
    companyName: capture.company,
    rawHtmlDescription: capture.jobDescription,
    locationString: capture.location,
    isRemote: capture.remote === true,
    postedDate: capture.postedDate || new Date(),
    applicationUrl: capture.applyUrl || capture.jobUrl,
    jobType: capture.employmentType,
    salaryMin: capture.salary?.min,
    salaryMax: capture.salary?.max,
    salaryCurrency: capture.salary?.currency,
    salaryInterval: capture.salary?.period,
    skills: capture.skills.length ? capture.skills : undefined,
    sourceMetadata: {
      capturedBy: capturedBy || null,
      capturedFrom: capture.siteName,
      detector: capture.detector || null,
      confidence: capture.confidence ?? null,
      humanCaptured: true,
    },
  };
}

/**
 * Map a capture onto the tracker row the user sees.
 *
 * Never sets a status: the caller decides the stage (a one-click save lands in
 * `saved`, an explicit staging choice lands in `created` and triggers document
 * generation), because that choice has downstream effects.
 */
export function captureToTrackerPayload(capture: CapturedJob) {
  return {
    jobTitle: capture.jobTitle,
    company: capture.company,
    location: capture.location,
    jobUrl: capture.jobUrl || capture.applyUrl,
    jobDescription: capture.jobDescription,
    sourceUrl: capture.applyUrl || capture.jobUrl,
    salary: capture.salary,
    sponsorship: capture.sponsorship,
    atsType: capture.atsType,
    // Both dates were being dropped here, which is why a captured job always
    // showed today's date and no deadline, no matter what the page said.
    postedDate: capture.postedDate,
    deadline: capture.deadline,
    // The raw phrase ("2 days ago") is the trust pipeline's documented input —
    // it derives the posting age and ghost-job risk from it.
    ...(capture.postedDateText ? { trustSnapshot: { postedDateText: capture.postedDateText } } : {}),
    tags: capture.tags.length ? capture.tags : ['extension-saved'],
    contactDetails: capture.contacts[0],
    notes: capture.notes,
  };
}
