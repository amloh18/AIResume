/**
 * Ingestion Engine — Single source of truth for run lifecycle and source execution.
 *
 * Both /api/admin/job-intelligence (UI trigger) and /api/admin/ingest (direct API)
 * use this module. No duplicate run creation. No cross-route imports.
 *
 * Lifecycle:
 *   createRun() → executeSourceRun() → updateRunProgress() → completeRun()
 */

import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { resolveRoleFamily, getFamilySearchTerms, ROLE_TAXONOMY } from '@/lib/taxonomy/roleTaxonomy';

// ── Structured Logging ─────────────────────────────────────────────────

function log(tag: string, msg: string, ...args: any[]) {
  console.log(`[INGEST:${tag}] ${msg}`, ...args);
}

// ── Retry Helper ───────────────────────────────────────────────────────
//
// Bounded retry with exponential backoff for transient errors.
// Only retries on network timeouts, connection resets, and 5xx errors.

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 2000, maxDelayMs = 15000, label = 'operation' } = opts;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      // Don't retry on non-retryable errors
      if (attempt === maxAttempts) break;

      const isRetryable =
        err.name === 'TimeoutError' ||
        err.name === 'AbortError' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'ETIMEDOUT' ||
        (err.status && RETRYABLE_STATUS_CODES.has(err.status));

      if (!isRetryable) break;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000, maxDelayMs);
      log('RETRY', `${label}: attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms — ${err.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ── Python Resolver ─────────────────────────────────────────────────────
//
// On VPS the service sets the correct python. Locally, prefer scripts/.venv
// so we pick up packages like jobspy without touching the system python.

function resolvePython(): string {
  const fs = require('fs');
  const venvPython = path.join(process.cwd(), 'scripts', '.venv', 'bin', 'python3');
  try {
    fs.accessSync(venvPython, fs.constants.X_OK);
    return venvPython;
  } catch {
    return 'python3';
  }
}

// ── Types ──────────────────────────────────────────────────────────────

export interface RawJob {
  source: string;
  sourceSecondary?: string;
  sourceJobId: string;
  url: string;
  title: string;
  companyName: string;
  rawHtmlDescription?: string;
  locationString?: string;
  isRemote?: boolean;
  postedDate?: Date | string;
  applicationUrl?: string;
  department?: string;
  category?: string;
  sourceMetadata?: Record<string, any>;
}

export interface NormalizedJob {
  canonicalId: string;
  title: string;
  normalizedTitle: string;
  company: { name: string; normalizedName: string; domain?: string; logoUrl?: string };
  description: string;
  descriptionText: string;
  contentHash: string;
  source: {
    primary: string;
    secondary?: string;
    sourceJobId: string;
    sourceUrl: string;
    applicationUrl: string;
    discoveredAt: Date;
    lastSeenAt: Date;
  };
  sources: Array<{ name: string; sourceJobId: string; url: string; firstSeenAt: Date; lastSeenAt: Date }>;
  location: { city: string; state?: string; country: string; countryCode: string; remote: boolean; remoteType?: string };
  department?: string;
  category?: string;
  employmentType: string;
  experience: { minYears: null; maxYears: null; level?: string };
  salary: { min?: number; max?: number; currency?: string; period?: string };
  skills: string[];
  seniority?: string;
  roleFamily?: string;
  roleFamilyKeywords?: string[];
  industry?: string;
  status: string;
  postedAt: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastVerifiedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sourceMetadata?: Record<string, any>;
}

export interface SourceProgress {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped' | 'not_configured';
  fetched: number;
  normalized: number;
  inserted: number;
  updated: number;
  duplicates: number;
  errors: number;
  error?: string;
  errorCode?: string;
  startedAt?: Date;
  finishedAt?: Date;
  lastProgressAt?: Date;
  durationMs?: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
  /** LinkedIn-specific: current search being processed */
  currentSearch?: string;
  /** LinkedIn-specific: search index */
  currentSearchIndex?: number;
  /** LinkedIn-specific: total searches */
  totalSearches?: number;
}

export type RunStatus =
  | 'queued'
  | 'running'
  | 'cancelling'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'
  | 'not_configured'
  | 'throttled'
  | 'blocked';

export interface RunRecord {
  runId: string;
  source: string;
  status: RunStatus;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  metrics: SourceProgress;
  sources?: Record<string, SourceProgress>;
  createdAt: Date;
  updatedAt?: Date;
}

// ── Source Registry (Phase 1) ──────────────────────────────────────────

export type SourceType = 'public_api' | 'api_key' | 'self_hosted_scraper' | 'browser_worker';

export interface SourceDefinition {
  id: string;
  name: string;
  type: SourceType;
  enabled: boolean;
  requiresApiKey: boolean;
  supportsPagination: boolean;
  defaultLimit: number;
  maxLimit: number;
  cooldownMs: number;
  /** Minimum refresh interval in ms (baseline schedule) */
  refreshIntervalMs: number;
  /** Max jobs to fetch per run */
  maxResults: number;
  /** Max execution time in ms before timeout */
  maxDurationMs: number;
  /** Human-readable description */
  description: string;
}

export const SOURCE_REGISTRY: Record<string, SourceDefinition> = {
  greenhouse: {
    id: 'greenhouse', name: 'Greenhouse ATS', type: 'public_api', enabled: true,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 600_000,
    refreshIntervalMs: 3 * 60 * 60 * 1000, maxResults: 500, maxDurationMs: 5 * 60 * 1000,
    description: 'Public Greenhouse job board API (200k+ companies)',
  },
  lever: {
    id: 'lever', name: 'Lever ATS', type: 'public_api', enabled: true,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 600_000,
    refreshIntervalMs: 3 * 60 * 60 * 1000, maxResults: 500, maxDurationMs: 5 * 60 * 1000,
    description: 'Public Lever job board API',
  },
  ashby: {
    id: 'ashby', name: 'Ashby ATS', type: 'public_api', enabled: true,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 600_000,
    refreshIntervalMs: 3 * 60 * 60 * 1000, maxResults: 500, maxDurationMs: 5 * 60 * 1000,
    description: 'Public Ashby job board API',
  },
  remotive: {
    id: 'remotive', name: 'Remotive', type: 'public_api', enabled: true,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 250, maxLimit: 250, cooldownMs: 3_600_000,
    refreshIntervalMs: 8 * 60 * 60 * 1000, maxResults: 250, maxDurationMs: 3 * 60 * 1000,
    description: 'Curated remote-only job board',
  },
  remoteok: {
    id: 'remoteok', name: 'RemoteOK', type: 'public_api', enabled: true,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 3_600_000,
    refreshIntervalMs: 8 * 60 * 60 * 1000, maxResults: 300, maxDurationMs: 3 * 60 * 1000,
    description: 'Remote-only job aggregator',
  },
  workday: {
    id: 'workday', name: 'Workday ATS', type: 'public_api', enabled: true,
    requiresApiKey: false, supportsPagination: true, defaultLimit: 20, maxLimit: 20, cooldownMs: 600_000,
    refreshIntervalMs: 6 * 60 * 60 * 1000, maxResults: 200, maxDurationMs: 10 * 60 * 1000,
    description: 'Enterprise Workday ATS (configurable tenant list)',
  },
  adzuna: {
    id: 'adzuna', name: 'Adzuna', type: 'api_key', enabled: true,
    requiresApiKey: true, supportsPagination: true, defaultLimit: 50, maxLimit: 50, cooldownMs: 600_000,
    refreshIntervalMs: 6 * 60 * 60 * 1000, maxResults: 200, maxDurationMs: 10 * 60 * 1000,
    description: 'Global job aggregator (requires API key)',
  },
  jobspy: {
    id: 'jobspy', name: 'JobSpy Aggregator', type: 'self_hosted_scraper', enabled: true,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 20, maxLimit: 100, cooldownMs: 600_000,
    refreshIntervalMs: 8 * 60 * 60 * 1000, maxResults: 200, maxDurationMs: 10 * 60 * 1000,
    description: 'Self-hosted JobSpy scraper (Indeed, LinkedIn, etc.)',
  },
  linkedin: {
    id: 'linkedin', name: 'LinkedIn Browser Worker', type: 'browser_worker', enabled: false,
    requiresApiKey: false, supportsPagination: false, defaultLimit: 100, maxLimit: 500, cooldownMs: 3_600_000,
    refreshIntervalMs: 12 * 60 * 60 * 1000, maxResults: 500, maxDurationMs: 15 * 60 * 1000,
    description: 'Isolated VPS browser worker for LinkedIn job discovery (requires manual auth)',
  },
};

export const VALID_SOURCES = Object.keys(SOURCE_REGISTRY);

// ── Config Validation ──────────────────────────────────────────────────

interface ConfigCheck {
  ready: boolean;
  reason?: string;
}

export function checkSourceConfig(source: string): ConfigCheck {
  const def = SOURCE_REGISTRY[source];
  if (!def) return { ready: false, reason: `Unknown source: ${source}` };
  if (!def.enabled) return { ready: false, reason: 'Source disabled' };

  if (source === 'adzuna') {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return { ready: false, reason: 'Missing ADZUNA_APP_ID or ADZUNA_APP_KEY' };
  }

  if (source === 'jobspy') {
    try {
      const workerPath = path.join(process.cwd(), 'scripts', 'jobspy-worker.py');
      require('fs').accessSync(workerPath);
    } catch {
      return { ready: false, reason: 'scripts/jobspy-worker.py not found' };
    }
  }

  if (source === 'linkedin') {
    if (process.env.LINKEDIN_ENABLED !== 'true') {
      return { ready: false, reason: 'LinkedIn worker disabled (set LINKEDIN_ENABLED=true to enable)' };
    }
    try {
      const workerPath = path.join(process.cwd(), 'scripts', 'linkedin-worker', 'worker.py');
      require('fs').accessSync(workerPath);
    } catch {
      return { ready: false, reason: 'scripts/linkedin-worker/worker.py not found' };
    }
  }

  return { ready: true };
}

// ── Source Fetchers ─────────────────────────────────────────────────────
//
// Each fetcher returns RawJob[]. Errors within a source are caught
// per-company/per-page so one failure doesn't abort the entire source.
// A source-level AbortController is passed for cancellation.

const GREENHOUSE_COMPANIES = [
  { token: 'stripe', name: 'Stripe' },
  { token: 'airbnb', name: 'Airbnb' },
  { token: 'monzo', name: 'Monzo' },
  { token: 'wise', name: 'Wise' },
  { token: 'openai', name: 'OpenAI' },
  { token: 'gitlab', name: 'GitLab' },
  { token: 'cloudflare', name: 'Cloudflare' },
  { token: 'databricks', name: 'Databricks' },
  { token: 'revolut', name: 'Revolut' },
  { token: 'elastic', name: 'Elastic' },
  { token: 'samsara', name: 'Samsara' },
  { token: 'scale', name: 'Scale AI' },
  { token: 'brex', name: 'Brex' },
  { token: 'mercury', name: 'Mercury' },
  { token: 'ramp', name: 'Ramp' },
  { token: 'rippling', name: 'Rippling' },
  { token: 'deel', name: 'Deel' },
  { token: 'canva', name: 'Canva' },
  { token: 'atlassian', name: 'Atlassian' },
  { token: 'hashicorp', name: 'HashiCorp' },
  { token: 'reddit', name: 'Reddit' },
  { token: 'dropbox', name: 'Dropbox' },
  { token: 'perplexity', name: 'Perplexity' },
  { token: 'starlingbank', name: 'Starling Bank' },
  { token: 'launchdarkly', name: 'LaunchDarkly' },
];

const LEVER_COMPANIES = [
  'netflix', 'notion', 'figma', 'spotify', 'posthog', 'linear',
  'vercel', 'supabase', 'resend', 'calcom', 'plausible', 'slack',
  'airtable', 'loom', 'webflow', 'intercom', 'zapier', 'asana',
  'retool', 'cashapp', 'square', 'discord', 'twitch', 'coinbase',
  'plaid', 'rippling', 'brex',
];

const ASHBY_COMPANIES = [
  'notion', 'linear', 'posthog', 'vercel', 'supabase', 'resend',
  'calcom', 'plausible', 'raycast', 'loom', 'webflow', 'intercom',
];

const WORKDAY_TENANTS = [
  { tenant: 'wd5', site: 'unity', name: 'Unity' },
  { tenant: 'wd5', site: 'databricks', name: 'Databricks' },
  { tenant: 'wd5', site: 'cloudflare', name: 'Cloudflare' },
  { tenant: 'wd5', site: 'tesla', name: 'Tesla' },
  { tenant: 'wd5', site: 'nvidia', name: 'NVIDIA' },
  { tenant: 'wd5', site: 'salesforce', name: 'Salesforce' },
  { tenant: 'wd5', site: 'adobe', name: 'Adobe' },
  { tenant: 'wd5', site: 'servicenow', name: 'ServiceNow' },
  { tenant: 'wd5', site: 'workday', name: 'Workday' },
  { tenant: 'wd5', site: 'doordash', name: 'DoorDash' },
  { tenant: 'wd5', site: 'block', name: 'Block (Square)' },
  { tenant: 'wd5', site: 'paypal', name: 'PayPal' },
  { tenant: 'wd5', site: 'intuit', name: 'Intuit' },
];

const ADZUNA_COUNTRIES = ['us', 'gb', 'de', 'fr', 'ca', 'au', 'nl', 'in'];

async function fetchGreenhouse(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  let boardErrors = 0;
  log('FETCH', `Greenhouse: fetching ${GREENHOUSE_COMPANIES.length} boards`);

  for (const company of GREENHOUSE_COMPANIES) {
    if (signal?.aborted) break;
    try {
      const res = await withRetry(
        () => fetch(
          `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`,
          { headers: { 'User-Agent': 'CVCircle-Ingestion/1.0' }, signal: AbortSignal.timeout(15000) }
        ),
        { label: `Greenhouse/${company.token}`, maxAttempts: 2, baseDelayMs: 1000 }
      );

      if (res.status === 403 || res.status === 404) {
        // Board not found or private — skip silently
        continue;
      }

      if (!res.ok) {
        boardErrors++;
        log('FETCH', `Greenhouse/${company.token}: HTTP ${res.status}`);
        continue;
      }

      const data: any = await res.json();
      const rawJobs: any[] = data.jobs || [];

      for (const job of rawJobs) {
        jobs.push({
          source: 'greenhouse',
          sourceJobId: String(job.id),
          url: job.absolute_url || `https://boards.greenhouse.io/${company.token}/jobs/${job.id}`,
          title: job.title || 'Untitled',
          companyName: company.name,
          rawHtmlDescription: job.content || '',
          locationString: job.location?.name || '',
          isRemote: job.location?.name?.toLowerCase().includes('remote') || false,
          postedDate: job.updated_at ? new Date(job.updated_at) : new Date(),
          applicationUrl: job.absolute_url,
          department: job.departments?.[0]?.name || undefined,
        });
      }
    } catch (err: any) {
      if (signal?.aborted) break;
      boardErrors++;
      // Only log unexpected errors (not timeouts which are normal for unreachable boards)
      if (err.name !== 'TimeoutError') {
        log('FETCH', `Greenhouse/${company.token}: ${err.message}`);
      }
    }
  }

  if (boardErrors > 0) {
    log('FETCH', `Greenhouse: ${boardErrors} boards failed`);
  }
  log('FETCH', `Greenhouse: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchLever(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  let boardErrors = 0;
  log('FETCH', `Lever: fetching ${LEVER_COMPANIES.length} companies`);

  for (const company of LEVER_COMPANIES) {
    if (signal?.aborted) break;
    try {
      const res = await withRetry(
        () => fetch(
          `https://api.lever.co/v0/postings/${company}?mode=json`,
          { signal: AbortSignal.timeout(15000) }
        ),
        { label: `Lever/${company}`, maxAttempts: 2, baseDelayMs: 1000 }
      );

      if (!res.ok) {
        boardErrors++;
        continue;
      }

      const data: any[] = await res.json();
      if (!Array.isArray(data)) {
        boardErrors++;
        continue;
      }

      for (const job of data) {
        if (job.hostedUrl?.includes('deleted') || !job.text) continue;
        jobs.push({
          source: 'lever',
          sourceJobId: job.id || job.guid || `${company}-${Date.now()}`,
          url: job.hostedUrl || `https://jobs.lever.co/${company}`,
          title: job.text || 'Untitled',
          companyName: company.charAt(0).toUpperCase() + company.slice(1),
          rawHtmlDescription: job.descriptionPlain || job.description || '',
          locationString: job.categories?.location || '',
          isRemote: job.categories?.location?.toLowerCase().includes('remote') || false,
          postedDate: job.createdAt ? new Date(job.createdAt) : new Date(),
          applicationUrl: job.applyUrl || job.hostedUrl,
          department: job.categories?.team || undefined,
          category: job.categories?.department || undefined,
        });
      }
    } catch (err: any) {
      if (signal?.aborted) break;
      boardErrors++;
      if (err.name !== 'TimeoutError') {
        log('FETCH', `Lever/${company}: ${err.message}`);
      }
    }
  }

  if (boardErrors > 0) {
    log('FETCH', `Lever: ${boardErrors} boards failed`);
  }
  log('FETCH', `Lever: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchAshby(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  let boardErrors = 0;
  log('FETCH', `Ashby: fetching ${ASHBY_COMPANIES.length} boards`);

  for (const company of ASHBY_COMPANIES) {
    if (signal?.aborted) break;
    try {
      const res = await withRetry(
        () => fetch(
          `https://api.ashbyhq.com/api/posting-board/job-postings/${company}`,
          { signal: AbortSignal.timeout(15000) }
        ),
        { label: `Ashby/${company}`, maxAttempts: 2, baseDelayMs: 1000 }
      );

      if (!res.ok) {
        boardErrors++;
        continue;
      }

      const data: any = await res.json();
      const postings = data?.jobPostings || data?.data || [];
      if (!Array.isArray(postings)) {
        boardErrors++;
        continue;
      }

      for (const job of postings) {
        jobs.push({
          source: 'ashby',
          sourceJobId: job.id || job.postingId || `${company}-${Date.now()}`,
          url: job.url || `https://jobs.ashbyhq.com/${company}`,
          title: job.title || 'Untitled',
          companyName: company.charAt(0).toUpperCase() + company.slice(1),
          rawHtmlDescription: job.descriptionPlain || job.description || '',
          locationString: job.locationName || job.location || '',
          isRemote: job.locationName?.toLowerCase().includes('remote') || false,
          postedDate: job.createdAt ? new Date(job.createdAt) : new Date(),
          applicationUrl: job.url,
          department: job.departmentName || undefined,
        });
      }
    } catch (err: any) {
      if (signal?.aborted) break;
      boardErrors++;
      if (err.name !== 'TimeoutError') {
        log('FETCH', `Ashby/${company}: ${err.message}`);
      }
    }
  }

  if (boardErrors > 0) {
    log('FETCH', `Ashby: ${boardErrors} boards failed`);
  }
  log('FETCH', `Ashby: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchRemotive(signal?: AbortSignal): Promise<RawJob[]> {
  try {
    log('FETCH', 'Remotive: fetching remote jobs');
    const res = await withRetry(
      () => fetch('https://remotive.com/api/remote-jobs?limit=250', {
        signal: AbortSignal.timeout(30000),
      }),
      { label: 'Remotive', maxAttempts: 3, baseDelayMs: 2000 }
    );

    if (!res.ok) {
      log('FETCH', `Remotive: HTTP ${res.status}`);
      return [];
    }

    const data: any = await res.json();
    const rawJobs: any[] = data.jobs || data || [];
    if (!Array.isArray(rawJobs)) {
      log('FETCH', 'Remotive: response is not an array');
      return [];
    }

    const jobs = rawJobs.map((job: any) => ({
      source: 'remotive' as string,
      sourceJobId: String(job.id),
      url: job.url || job.job_url || `https://remotive.com/job/${job.id}`,
      title: job.title || 'Untitled',
      companyName: job.company_name || 'Unknown',
      rawHtmlDescription: job.description || job.description_required || '',
      locationString: job.candidate_required_location || '',
      isRemote: true,
      postedDate: job.publication_date ? new Date(job.publication_date) : new Date(),
      applicationUrl: job.url || job.job_url,
      category: job.category || undefined,
    }));

    log('FETCH', `Remotive: ${jobs.length} jobs fetched`);
    return jobs;
  } catch (err: any) {
    if (err.name !== 'TimeoutError') {
      log('ERROR', `Remotive: ${err.message}`);
    }
    return [];
  }
}

async function fetchRemoteOK(signal?: AbortSignal): Promise<RawJob[]> {
  try {
    log('FETCH', 'RemoteOK: fetching remote jobs');
    const res = await withRetry(
      () => fetch('https://remoteok.com/api', {
        headers: { 'User-Agent': 'CVCircle-Ingestion/1.0' },
        signal: AbortSignal.timeout(30000),
      }),
      { label: 'RemoteOK', maxAttempts: 3, baseDelayMs: 2000 }
    );

    if (!res.ok) {
      log('FETCH', `RemoteOK: HTTP ${res.status}`);
      return [];
    }

    const data: any[] = await res.json();
    if (!Array.isArray(data)) {
      log('FETCH', 'RemoteOK: response is not an array');
      return [];
    }

    // RemoteOK returns a metadata header as the first element
    const jobs = data.slice(1).filter((job: any) => job.id && job.position).map((job: any) => ({
      source: 'remoteok' as string,
      sourceJobId: String(job.id),
      url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      title: job.position || 'Untitled',
      companyName: job.company || 'Unknown',
      rawHtmlDescription: job.description || '',
      locationString: job.location || '',
      isRemote: true,
      postedDate: job.date ? new Date(job.date) : new Date(),
      applicationUrl: job.url,
    }));

    log('FETCH', `RemoteOK: ${jobs.length} jobs fetched`);
    return jobs;
  } catch (err: any) {
    if (err.name !== 'TimeoutError') {
      log('ERROR', `RemoteOK: ${err.message}`);
    }
    return [];
  }
}

async function fetchWorkday(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const MAX_PAGES = 25;
  const PAGE_SIZE = 20;
  const MAX_JOBS_PER_COMPANY = 500;
  let tenantErrors = 0;
  log('FETCH', `Workday: fetching ${WORKDAY_TENANTS.length} tenants`);

  for (const company of WORKDAY_TENANTS) {
    if (signal?.aborted) break;

    try {
      let offset = 0;
      let pageCount = 0;
      let totalForCompany = 0;

      while (pageCount < MAX_PAGES && totalForCompany < MAX_JOBS_PER_COMPANY) {
        if (signal?.aborted) break;

        const res = await withRetry(
          () => fetch(
            `https://${company.tenant}.wd5.myworkdayjobs.com/wday/cxs/${company.tenant}/${company.site}/jobs`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CVCircle-Ingestion/1.0',
                Accept: 'application/json',
              },
              body: JSON.stringify({ appliedFacets: {}, limit: PAGE_SIZE, offset, searchText: '' }),
              signal: AbortSignal.timeout(20000),
            }
          ),
          { label: `Workday/${company.name}`, maxAttempts: 2, baseDelayMs: 1500 }
        );

        if (res.status === 404 || res.status === 403) {
          // Tenant/site doesn't exist or is private
          break;
        }

        if (!res.ok) {
          tenantErrors++;
          log('FETCH', `Workday/${company.name}: HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const postings = data?.jobPostings || [];
        if (postings.length === 0) break;

        for (const job of postings) {
          const jobUrl = `https://${company.tenant}.wd5.myworkdayjobs.com/en-US/${company.site}/job${job.externalPath}`;
          jobs.push({
            source: 'workday',
            sourceJobId: job.bulletFields?.[0] || job.externalPath || `${company.site}-${offset}`,
            url: jobUrl,
            title: job.title || 'Untitled',
            companyName: company.name,
            rawHtmlDescription: job.bulletFields?.join(' ') || '',
            locationString: job.locationsText || job.bulletFields?.[1] || '',
            isRemote: job.locationsText?.toLowerCase().includes('remote') || false,
            postedDate: job.postedOn ? new Date(job.postedOn) : new Date(),
            applicationUrl: jobUrl,
          });
        }

        offset += PAGE_SIZE;
        pageCount++;
        totalForCompany += postings.length;

        if (postings.length < PAGE_SIZE) break;
      }
    } catch (err: any) {
      if (signal?.aborted) break;
      tenantErrors++;
      if (err.name !== 'TimeoutError') {
        log('FETCH', `Workday/${company.name}: ${err.message}`);
      }
    }
  }

  if (tenantErrors > 0) {
    log('FETCH', `Workday: ${tenantErrors} tenants failed`);
  }
  log('FETCH', `Workday: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchAdzuna(signal?: AbortSignal): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    log('FETCH', 'Adzuna: NOT_CONFIGURED — missing ADZUNA_APP_ID or ADZUNA_APP_KEY');
    return [];
  }

  const jobs: RawJob[] = [];
  const MAX_PAGES = parseInt(process.env.ADZUNA_MAX_PAGES_PER_RUN || '5', 10);
  const RESULTS_PER_PAGE = 50;
  const RATE_LIMIT_DELAY_MS = parseInt(process.env.ADZUNA_RATE_LIMIT_MS || '1200', 10);
  let countryErrors = 0;
  log('FETCH', `Adzuna: fetching ${ADZUNA_COUNTRIES.length} countries, max ${MAX_PAGES} pages each`);

  for (const country of ADZUNA_COUNTRIES) {
    if (signal?.aborted) break;

    let rateLimited = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      if (signal?.aborted) break;
      if (rateLimited) break;

      try {
        const res = await withRetry(
          () => fetch(
            `http://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&what=software+engineer&results_per_page=${RESULTS_PER_PAGE}&content-type=application/json`,
            { signal: AbortSignal.timeout(15000) }
          ),
          { label: `Adzuna/${country}/${page}`, maxAttempts: 2, baseDelayMs: 1000 }
        );

        if (res.status === 429) {
          log('FETCH', `Adzuna: rate limited on ${country} page ${page}, backing off`);
          rateLimited = true;
          await new Promise((r) => setTimeout(r, 5000));
          break;
        }

        if (res.status === 401 || res.status === 403) {
          log('FETCH', `Adzuna: authentication error on ${country} (HTTP ${res.status})`);
          countryErrors++;
          break;
        }

        if (!res.ok) {
          countryErrors++;
          break;
        }

        const data = await res.json();
        const results = data?.results || [];
        if (results.length === 0) break;

        for (const job of results) {
          jobs.push({
            source: 'adzuna',
            sourceJobId: String(job.id),
            url: job.redirect_url || `https://www.adzuna.com/job/${job.id}`,
            title: job.title || 'Untitled',
            companyName: job.company?.display_name || 'Unknown',
            rawHtmlDescription: job.description || '',
            locationString: job.location?.display_name || '',
            isRemote: job.location?.display_name?.toLowerCase().includes('remote') || false,
            postedDate: job.created ? new Date(job.created) : new Date(),
            applicationUrl: job.redirect_url,
            category: job.category?.label || undefined,
          });
        }

        if (page < MAX_PAGES) {
          await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
        }
      } catch (err: any) {
        if (signal?.aborted) break;
        countryErrors++;
        if (err.name !== 'TimeoutError') {
          log('FETCH', `Adzuna/${country}: ${err.message}`);
        }
        break;
      }
    }
  }

  if (countryErrors > 0) {
    log('FETCH', `Adzuna: ${countryErrors} country requests failed`);
  }
  log('FETCH', `Adzuna: ${jobs.length} jobs fetched`);
  return jobs;
}

const activeJobSpyProcesses = new Map<string, ChildProcess>();

async function fetchJobSpy(signal?: AbortSignal): Promise<RawJob[]> {
  const workerPath = path.join(process.cwd(), 'scripts', 'jobspy-worker.py');
  log('FETCH', `JobSpy: spawning python worker at ${workerPath}`);

  return new Promise((resolve) => {
    const processId = `jobspy-${Date.now()}`;

    const pythonBin = resolvePython();
    log('FETCH', `JobSpy: using python at ${pythonBin}`);
    const child = spawn(pythonBin, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      timeout: 300_000,
    });

    activeJobSpyProcesses.set(processId, child);

    // Send input via stdin
    const input = JSON.stringify({
      sites: ['indeed', 'linkedin', 'zip_recruiter'],
      searchTerm: 'software engineer',
      location: 'United States',
      resultsWanted: 20,
      hoursOld: 72,
    });
    child.stdin.write(input);
    child.stdin.end();

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      log('FETCH', 'JobSpy: timeout reached, killing process');
      child.kill('SIGTERM');
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
    }, 300_000);

    const onAbort = () => {
      killed = true;
      log('FETCH', 'JobSpy: cancellation requested, killing process');
      child.kill('SIGTERM');
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
    };
    signal?.addEventListener('abort', onAbort);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 10 * 1024 * 1024) {
        killed = true;
        child.kill('SIGKILL');
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      activeJobSpyProcesses.delete(processId);

      if (killed || code !== 0) {
        log('ERROR', `JobSpy: process exited code=${code}, stderr=${stderr.slice(0, 300)}`);
        resolve([]);
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success || !Array.isArray(result.jobs)) {
          log('FETCH', `JobSpy: no jobs returned (success=${result.success})`);
          resolve([]);
          return;
        }

        const jobs: RawJob[] = result.jobs.map((job: any) => ({
          source: 'jobspy',
          sourceSecondary: job.site || undefined,
          sourceJobId: job.id || `jobspy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: job.url || job.job_url || '',
          title: job.title || 'Untitled',
          companyName: job.company || 'Unknown',
          rawHtmlDescription: job.description || job.snippet || '',
          locationString: job.location || '',
          isRemote: job.location?.toLowerCase().includes('remote') || job.is_remote || false,
          postedDate: job.date_posted ? new Date(job.date_posted) : new Date(),
          applicationUrl: job.url || job.job_url || '',
          sourceMetadata: { site: job.site },
        }));

        log('FETCH', `JobSpy: ${jobs.length} jobs fetched`);
        resolve(jobs);
      } catch {
        log('ERROR', `JobSpy: malformed JSON from worker: ${stdout.slice(0, 200)}`);
        resolve([]);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      activeJobSpyProcesses.delete(processId);
      log('ERROR', `JobSpy: spawn error: ${err.message}`);
      resolve([]);
    });
  });
}

// ── SOURCE_FETCHERS ────────────────────────────────────────────────────

const activeLinkedInProcesses = new Map<string, ChildProcess>();

async function fetchLinkedIn(signal?: AbortSignal): Promise<RawJob[]> {
  const workerPath = path.join(process.cwd(), 'scripts', 'linkedin-worker', 'worker.py');
  log('FETCH', `LinkedIn: spawning worker at ${workerPath}`);

  return new Promise((resolve) => {
    const processId = `linkedin-${Date.now()}`;

    const pythonBin = resolvePython();
    log('FETCH', `LinkedIn: using python at ${pythonBin}`);
    const child = spawn(pythonBin, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LINKEDIN_ENABLED: process.env.LINKEDIN_ENABLED || 'false',
        LINKEDIN_BROWSER_PROFILE_DIR: process.env.LINKEDIN_BROWSER_PROFILE_DIR || '/var/lib/buildairesume/browser-profiles/linkedin',
        LINKEDIN_MAX_SEARCHES_PER_RUN: process.env.LINKEDIN_MAX_SEARCHES_PER_RUN || '5',
        LINKEDIN_MAX_PAGES_PER_SEARCH: process.env.LINKEDIN_MAX_PAGES_PER_SEARCH || '2',
        LINKEDIN_MAX_JOBS_PER_SEARCH: process.env.LINKEDIN_MAX_JOBS_PER_SEARCH || '100',
        LINKEDIN_MAX_RUNTIME_SECONDS: process.env.LINKEDIN_MAX_RUNTIME_SECONDS || '600',
        LINKEDIN_DRY_RUN: process.env.LINKEDIN_DRY_RUN || 'false',
        LINKEDIN_DEBUG: process.env.LINKEDIN_DEBUG || 'false',
      },
      timeout: 900_000, // 15 min max
    });

    activeLinkedInProcesses.set(processId, child);

    // Send search tasks via stdin
    const input = JSON.stringify({
      tasks: [
        {
          keyword: process.env.LINKEDIN_DEFAULT_KEYWORD || 'software engineer',
          location: process.env.LINKEDIN_DEFAULT_LOCATION || 'United States',
          remote: process.env.LINKEDIN_DEFAULT_REMOTE === 'true',
          postedWithinHours: parseInt(process.env.LINKEDIN_DEFAULT_POSTED_WITHIN_HOURS || '168', 10),
        },
      ],
    });
    child.stdin.write(input);
    child.stdin.end();

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      log('FETCH', 'LinkedIn: timeout reached, killing worker');
      child.kill('SIGTERM');
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
    }, 900_000);

    const onAbort = () => {
      killed = true;
      log('FETCH', 'LinkedIn: cancellation requested, killing worker');
      child.kill('SIGTERM');
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
    };
    signal?.addEventListener('abort', onAbort);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 50 * 1024 * 1024) { // 50MB limit
        killed = true;
        child.kill('SIGKILL');
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      // Forward worker logs
      const lines = chunk.toString().split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        log('LINKEDIN-WORKER', line);
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      activeLinkedInProcesses.delete(processId);

      if (killed) {
        log('ERROR', 'LinkedIn: worker killed/timed out');
        resolve([]);
        return;
      }

      if (code !== 0) {
        log('ERROR', `LinkedIn: worker exited code=${code}, stderr=${stderr.slice(0, 500)}`);
        resolve([]);
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success) {
          log('FETCH', `LinkedIn: worker reported failure — ${result.error || result.status || 'unknown'}`);
          resolve([]);
          return;
        }

        if (!Array.isArray(result.jobs)) {
          log('FETCH', 'LinkedIn: no jobs array in result');
          resolve([]);
          return;
        }

        const jobs: RawJob[] = result.jobs.map((job: any) => ({
          source: 'linkedin',
          sourceJobId: job.id || job.job_id || `linkedin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: job.url || job.linkedin_url || '',
          title: job.title || 'Untitled',
          companyName: job.company || 'Unknown',
          rawHtmlDescription: job.description || job.snippet || '',
          locationString: job.location || '',
          isRemote: job.location?.toLowerCase().includes('remote') || job.remote || false,
          postedDate: job.posted_date || job.date_posted ? new Date(job.posted_date || job.date_posted) : new Date(),
          applicationUrl: job.apply_url || job.url || '',
          sourceMetadata: {
            source: 'linkedin',
            searchKeyword: job.search_keyword,
            linkedinJobId: job.linkedin_job_id,
          },
        }));

        log('FETCH', `LinkedIn: ${jobs.length} jobs fetched`);
        resolve(jobs);
      } catch (e) {
        log('ERROR', `LinkedIn: malformed JSON from worker: ${stdout.slice(0, 300)}`);
        resolve([]);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      activeLinkedInProcesses.delete(processId);
      log('ERROR', `LinkedIn: spawn error: ${err.message}`);
      resolve([]);
    });
  });
}

const SOURCE_FETCHERS: Record<string, (signal?: AbortSignal) => Promise<RawJob[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  remotive: fetchRemotive,
  remoteok: fetchRemoteOK,
  workday: fetchWorkday,
  adzuna: fetchAdzuna,
  jobspy: fetchJobSpy,
  linkedin: fetchLinkedIn,
};

// ── Normalization Pipeline ──────────────────────────────────────────────

function normalizeTitle(title: string): { title: string; normalizedTitle: string; level?: string } {
  const clean = title.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();

  let level: string | undefined;
  if (lower.includes('senior') || lower.includes('sr.') || lower.includes('sr ')) level = 'senior';
  else if (lower.includes('staff') || lower.includes('principal')) level = 'staff';
  else if (lower.includes('junior') || lower.includes('jr.') || lower.includes('jr ')) level = 'junior';
  else if (lower.includes('lead') || lower.includes('head of')) level = 'lead';
  else if (lower.includes('intern')) level = 'intern';
  else if (lower.includes('director') || lower.includes('vp')) level = 'executive';

  return { title: clean, normalizedTitle: lower, level };
}

function normalizeCompany(name: string, url: string): NormalizedJob['company'] {
  const clean = name.replace(/\s+/g, ' ').trim();
  let domain: string | undefined;
  try {
    const u = new URL(url);
    domain = u.hostname.replace(/^www\./, '');
  } catch {}

  return {
    name: clean,
    normalizedName: clean.toLowerCase().replace(/[^a-z0-9]/g, ''),
    domain,
  };
}

function normalizeLocation(location?: string): NormalizedJob['location'] {
  if (!location) return { city: 'Unknown', country: 'Unknown', countryCode: 'XX', remote: false };

  const clean = location.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const remote = lower.includes('remote');

  let country = 'Unknown';
  let countryCode = 'XX';
  if (lower.includes('united kingdom') || lower.includes('london') || lower.includes('uk')) { country = 'United Kingdom'; countryCode = 'GB'; }
  else if (lower.includes('united states') || lower.includes('usa') || lower.includes(' us')) { country = 'United States'; countryCode = 'US'; }
  else if (lower.includes('germany') || lower.includes('berlin')) { country = 'Germany'; countryCode = 'DE'; }
  else if (lower.includes('france') || lower.includes('paris')) { country = 'France'; countryCode = 'FR'; }
  else if (lower.includes('india') || lower.includes('bangalore') || lower.includes('mumbai')) { country = 'India'; countryCode = 'IN'; }
  else if (lower.includes('canada') || lower.includes('toronto')) { country = 'Canada'; countryCode = 'CA'; }
  else if (lower.includes('australia') || lower.includes('sydney')) { country = 'Australia'; countryCode = 'AU'; }
  else if (lower.includes('netherlands') || lower.includes('amsterdam')) { country = 'Netherlands'; countryCode = 'NL'; }
  else if (lower.includes('singapore')) { country = 'Singapore'; countryCode = 'SG'; }
  else if (lower.includes('japan') || lower.includes('tokyo')) { country = 'Japan'; countryCode = 'JP'; }

  const cityParts = clean.split(',')[0]?.trim() || clean;

  return { city: cityParts, country, countryCode, remote };
}

function generateCanonicalId(company: string, title: string, countryCode: string, city: string): string {
  const payload = `${company}::${title}::${countryCode}::${city.toLowerCase()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function generateContentHash(job: {
  title: string;
  description: string;
  location: string;
  salary?: string;
  employmentType: string;
}): string {
  const payload = [
    job.title.toLowerCase().trim(),
    job.description.replace(/<[^>]*>/g, '').substring(0, 5000),
    job.location.toLowerCase().trim(),
    job.salary || '',
    job.employmentType,
  ].join('::');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function normalize(raw: RawJob): NormalizedJob {
  const titleRes = normalizeTitle(raw.title);
  const company = normalizeCompany(raw.companyName, raw.url);
  const location = normalizeLocation(raw.locationString);
  const now = new Date();
  const descriptionText = (raw.rawHtmlDescription || '').replace(/<[^>]*>/g, '').substring(0, 50000);
  const description = (raw.rawHtmlDescription || '').substring(0, 50000);

  // Resolve role family from title
  const roleFamily = resolveRoleFamily(titleRes.title) || undefined;
  const roleFamilyKeywords = roleFamily ? getFamilySearchTerms(roleFamily) : undefined;

  const contentHash = generateContentHash({
    title: titleRes.title,
    description,
    location: raw.locationString || '',
    employmentType: 'full_time',
  });

  return {
    canonicalId: generateCanonicalId(company.normalizedName, titleRes.normalizedTitle, location.countryCode, location.city),
    title: titleRes.title,
    normalizedTitle: titleRes.normalizedTitle,
    company,
    description,
    descriptionText,
    contentHash,
    source: {
      primary: raw.source,
      secondary: raw.sourceSecondary,
      sourceJobId: raw.sourceJobId,
      sourceUrl: raw.url,
      applicationUrl: raw.applicationUrl || raw.url,
      discoveredAt: now,
      lastSeenAt: now,
    },
    sources: [{ name: raw.source, sourceJobId: raw.sourceJobId, url: raw.url, firstSeenAt: now, lastSeenAt: now }],
    location,
    department: raw.department,
    category: raw.category,
    employmentType: 'full_time',
    experience: { minYears: null, maxYears: null, level: titleRes.level },
    seniority: titleRes.level,
    roleFamily,
    roleFamilyKeywords,
    salary: {},
    skills: [],
    status: 'new',
    postedAt: raw.postedDate ? new Date(raw.postedDate) : now,
    firstSeenAt: now,
    lastSeenAt: now,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
    sourceMetadata: raw.sourceMetadata,
  };
}

// ── Batch Upsert (source-agnostic) ─────────────────────────────────────

async function batchUpsert(db: mongoose.Connection['db'], jobs: NormalizedJob[], sourceName: string) {
  const coll = db!.collection('jobs');
  const eventsColl = db!.collection('jobEvents');
  const now = new Date();

  log('UPSERT', `batchUpsert: ${jobs.length} jobs for source=${sourceName}`);

  // Phase 12: Pre-check content hashes to track true duplicates vs content updates
  const canonicalIds = jobs.map((j) => j.canonicalId);
  const sourcePairs = jobs.map((j) => ({ primary: j.source.primary, sourceJobId: j.source.sourceJobId }));

  const existingDocs = await coll
    .find({
      $or: [
        { canonicalId: { $in: canonicalIds } },
        { $and: sourcePairs.map((p) => ({ 'source.primary': p.primary, 'source.sourceJobId': p.sourceJobId })) },
      ],
    })
    .project({ canonicalId: 1, contentHash: 1, 'source.primary': 1, 'source.sourceJobId': 1 })
    .toArray();

  // Pre-compute freshness for each job
  function computeFreshness(job: NormalizedJob): { expiresAt: Date; freshnessScore: number } {
    const now = Date.now();
    const postedAt = job.postedAt?.getTime() || now;
    const ageHours = (now - postedAt) / (1000 * 60 * 60);

    // Freshness decays over 14 days (336 hours)
    const maxAgeHours = 336;
    const freshnessScore = Math.max(0, 1 - ageHours / maxAgeHours);

    // Expire after 14 days from last seen
    const lastSeenAt = job.source.lastSeenAt?.getTime() || now;
    const expiresAt = new Date(lastSeenAt + 14 * 24 * 60 * 60 * 1000);

    return { expiresAt, freshnessScore: Math.round(freshnessScore * 1000) / 1000 };
  }

  // Build lookup: canonicalId → existing contentHash
  const existingHashByCanonical = new Map<string, string>();
  const existingHashBySource = new Map<string, string>();
  for (const doc of existingDocs) {
    if (doc.canonicalId) existingHashByCanonical.set(doc.canonicalId, doc.contentHash || '');
    const key = `${doc.source?.primary}::${doc.source?.sourceJobId}`;
    if (key !== '::') existingHashBySource.set(key, doc.contentHash || '');
  }

  // Classify each job: new, content-changed, or metadata-only (duplicate)
  let inserted = 0;
  let contentUpdated = 0;
  let duplicates = 0;

  const contentChangedJobs: NormalizedJob[] = [];
  const newJobs: NormalizedJob[] = [];

  for (const job of jobs) {
    const existingHash =
      existingHashByCanonical.get(job.canonicalId) ||
      existingHashBySource.get(`${job.source.primary}::${job.source.sourceJobId}`);

    if (existingHash === undefined) {
      // New job
      newJobs.push(job);
      inserted++;
    } else if (existingHash !== job.contentHash) {
      // Content changed
      contentChangedJobs.push(job);
      contentUpdated++;
    } else {
      // Metadata only — true duplicate
      duplicates++;
    }
  }

  // Upsert new jobs (full fields via $setOnInsert + $set)
  const newOps = newJobs.map((job) => {
    const { expiresAt, freshnessScore } = computeFreshness(job);
    return {
      updateOne: {
        filter: {
          $or: [
            { canonicalId: job.canonicalId },
            { 'source.primary': job.source.primary, 'source.sourceJobId': job.source.sourceJobId },
          ],
        },
        update: {
          $setOnInsert: {
            canonicalId: job.canonicalId,
            title: job.title,
            normalizedTitle: job.normalizedTitle,
            company: job.company,
            description: job.description,
            descriptionText: job.descriptionText,
            contentHash: job.contentHash,
            location: job.location,
            department: job.department,
            category: job.category,
            employmentType: job.employmentType,
            experience: job.experience,
            seniority: job.seniority,
            roleFamily: job.roleFamily,
            roleFamilyKeywords: job.roleFamilyKeywords,
            salary: job.salary,
            skills: job.skills,
            postedAt: job.postedAt,
            firstSeenAt: now,
            status: 'new',
            expiresAt,
            freshnessScore,
            createdAt: now,
          },
          $set: {
            'source.primary': job.source.primary,
            'source.secondary': job.source.secondary,
            'source.sourceJobId': job.source.sourceJobId,
            'source.sourceUrl': job.source.sourceUrl,
            'source.applicationUrl': job.source.applicationUrl,
            'source.discoveredAt': job.source.discoveredAt,
            'source.lastSeenAt': now,
            lastSeenAt: now,
            lastVerifiedAt: now,
            expiresAt,
            freshnessScore,
            sourceMetadata: job.sourceMetadata,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  // Upsert content-changed jobs (update content fields)
  const contentOps = contentChangedJobs.map((job) => {
    const { expiresAt, freshnessScore } = computeFreshness(job);
    return {
      updateOne: {
        filter: {
          $or: [
            { canonicalId: job.canonicalId },
            { 'source.primary': job.source.primary, 'source.sourceJobId': job.source.sourceJobId },
          ],
        },
        update: {
          $set: {
            title: job.title,
            normalizedTitle: job.normalizedTitle,
            company: job.company,
            description: job.description,
            descriptionText: job.descriptionText,
            contentHash: job.contentHash,
            location: job.location,
            department: job.department,
            category: job.category,
            employmentType: job.employmentType,
            experience: job.experience,
            seniority: job.seniority,
            roleFamily: job.roleFamily,
            roleFamilyKeywords: job.roleFamilyKeywords,
            salary: job.salary,
            skills: job.skills,
            'source.primary': job.source.primary,
            'source.secondary': job.source.secondary,
            'source.sourceJobId': job.source.sourceJobId,
            'source.sourceUrl': job.source.sourceUrl,
            'source.applicationUrl': job.source.applicationUrl,
            'source.discoveredAt': job.source.discoveredAt,
            'source.lastSeenAt': now,
            lastSeenAt: now,
            lastVerifiedAt: now,
            expiresAt,
            freshnessScore,
            sourceMetadata: job.sourceMetadata,
            updatedAt: now,
          },
          $inc: { 'ingestion.updateCount': 1 },
        },
        upsert: true,
      },
    };
  });

  // Metadata-only updates for duplicates (just touch lastSeenAt/lastVerifiedAt)
  const duplicateJobs = jobs.filter((_, i) => {
    const job = jobs[i];
    const existingHash =
      existingHashByCanonical.get(job.canonicalId) ||
      existingHashBySource.get(`${job.source.primary}::${job.source.sourceJobId}`);
    return existingHash !== undefined && existingHash === job.contentHash;
  });

  const metaOps = duplicateJobs.map((job) => {
    const { expiresAt } = computeFreshness(job);
    return {
      updateOne: {
        filter: {
          $or: [
            { canonicalId: job.canonicalId },
            { 'source.primary': job.source.primary, 'source.sourceJobId': job.source.sourceJobId },
          ],
        },
        update: {
          $set: {
            'source.lastSeenAt': now,
            lastSeenAt: now,
            lastVerifiedAt: now,
            expiresAt, // refresh expiry so actively-seen jobs don't expire early
            updatedAt: now,
          },
        },
        upsert: false,
      },
    };
  });

  // Execute all three batches
  const allOps = [...newOps, ...contentOps, ...metaOps];
  const res = allOps.length > 0
    ? await coll.bulkWrite(allOps, { ordered: false })
    : { upsertedCount: 0, modifiedCount: 0, upsertedIds: {} } as any;

  // Record events for newly inserted jobs
  if (res.upsertedCount > 0 && res.upsertedIds) {
    const eventOps = Object.entries(res.upsertedIds)
      .filter(([idx]) => parseInt(idx) < newJobs.length)
      .map(([idx, id]) => ({
        insertOne: {
          document: {
            jobId: id,
            canonicalId: newJobs[parseInt(idx)]?.canonicalId,
            eventType: 'created',
            source: sourceName,
            metadata: { company: newJobs[parseInt(idx)]?.company?.name, title: newJobs[parseInt(idx)]?.title },
            createdAt: now,
          },
        },
      }));
    if (eventOps.length > 0) {
      await eventsColl.bulkWrite(eventOps, { ordered: false }).catch(() => {});
    }
  }

  log('UPSERT', `batchUpsert: inserted=${inserted}, contentUpdated=${contentUpdated}, duplicates=${duplicates}`);
  return { inserted, updated: contentUpdated, duplicates };
}

// ── Run Lifecycle ──────────────────────────────────────────────────────
//
// These are the ONLY functions that touch ingestionRuns.
// Both job-intelligence and /api/admin/ingest use these.

export async function createRun(
  db: mongoose.Connection['db'],
  source: string,
  runId?: string
): Promise<{ runId: string; created: boolean }> {
  if (!db) throw new Error('DB not connected');
  const runsColl = db.collection('ingestionRuns');
  const id = runId || `run-${source}-${Date.now()}`;

  const existing = await runsColl.findOne({ runId: id });
  if (existing) {
    log('PROGRESS', `Run ${id} already exists, reusing`);
    return { runId: id, created: false };
  }

  const now = new Date();
  await runsColl.insertOne({
    runId: id,
    source,
    status: 'running',
    startedAt: now,
    lastProgressAt: now,
    metrics: { status: 'running', fetched: 0, normalized: 0, inserted: 0, updated: 0, duplicates: 0, errors: 0 },
    createdAt: now,
  });

  log('PROGRESS', `Run ${id} created for source=${source}`);
  return { runId: id, created: true };
}

export async function updateRunProgress(
  db: mongoose.Connection['db'],
  runId: string,
  sourceName: string,
  progress: Partial<SourceProgress>
) {
  if (!db) return;
  const runsColl = db.collection('ingestionRuns');

  const setObj: Record<string, any> = {
    [`sources.${sourceName}`]: progress,
    lastProgressAt: new Date(),
    updatedAt: new Date(),
  };

  if (typeof progress.fetched === 'number') setObj['metrics.fetched'] = progress.fetched;
  if (typeof progress.inserted === 'number') setObj['metrics.inserted'] = progress.inserted;
  if (typeof progress.updated === 'number') setObj['metrics.updated'] = progress.updated;
  if (typeof progress.duplicates === 'number') setObj['metrics.duplicates'] = progress.duplicates;
  if (typeof progress.errors === 'number') setObj['metrics.errors'] = progress.errors;

  await runsColl.updateOne({ runId }, { $set: setObj }).catch(() => {});
}

export async function completeRun(
  db: mongoose.Connection['db'],
  runId: string,
  status: RunStatus,
  metrics: SourceProgress,
  sources?: Record<string, SourceProgress>
) {
  if (!db) return;
  const runsColl = db.collection('ingestionRuns');
  const now = new Date();

  const run = await runsColl.findOne({ runId });
  const durationMs = run?.startedAt ? now.getTime() - new Date(run.startedAt).getTime() : 0;

  await runsColl.updateOne(
    { runId },
    {
      $set: {
        status,
        finishedAt: now,
        durationMs,
        metrics,
        sources,
        lastProgressAt: now,
        updatedAt: now,
      },
    }
  );

  log('COMPLETE', `Run ${runId} completed: status=${status}, fetched=${metrics.fetched}, inserted=${metrics.inserted}`);
}

// ── Stale Run Recovery (Phase 3) ───────────────────────────────────────
//
// If a run is RUNNING but lastProgressAt exceeds the timeout,
// mark it as FAILED with errorCode="STALE_RUN".

export async function recoverStaleRuns(db: mongoose.Connection['db']) {
  if (!db) return;
  const runsColl = db.collection('ingestionRuns');
  const timeoutMs = parseInt(process.env.INGEST_STALE_RUN_TIMEOUT_MS || '600000', 10); // 10 min default
  const cutoff = new Date(Date.now() - timeoutMs);

  const result = await runsColl.updateMany(
    {
      status: 'running',
      lastProgressAt: { $lt: cutoff },
    },
    {
      $set: {
        status: 'failed',
        errorCode: 'STALE_RUN',
        error: `Run exceeded stale timeout of ${timeoutMs}ms`,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    log('PROGRESS', `Stale run recovery: marked ${result.modifiedCount} runs as FAILED`);
  }
}

// ── Execute Source Run ──────────────────────────────────────────────────
//
// The core execution function. Called by both job-intelligence and ingest POST.
// Updates progress periodically. Source-isolated errors.

export async function executeSourceRun(
  db: mongoose.Connection['db'],
  sourceName: string,
  runId: string,
  signal: AbortSignal
): Promise<SourceProgress> {
  if (!db) throw new Error('DB not connected');

  const sourcesColl = db.collection('jobSources');
  const progress: SourceProgress = {
    status: 'running',
    fetched: 0,
    normalized: 0,
    inserted: 0,
    updated: 0,
    duplicates: 0,
    errors: 0,
    startedAt: new Date(),
  };

  const updateProgress = async (update: Partial<SourceProgress>) => {
    Object.assign(progress, update);
    await updateRunProgress(db, runId, sourceName, progress);
  };

  try {
    // Config validation
    const config = checkSourceConfig(sourceName);
    if (!config.ready) {
      log('ERROR', `Source ${sourceName}: NOT_CONFIGURED — ${config.reason}`);
      await updateProgress({ status: 'not_configured', error: config.reason, finishedAt: new Date() });
      return progress;
    }

    // Fetch
    log('SOURCE', `Starting ${sourceName} for run ${runId}`);
    await updateProgress({ status: 'running', message: 'Fetching...' });
    const fetcher = SOURCE_FETCHERS[sourceName];
    const rawJobs = await fetcher!(signal);

    if (signal.aborted) {
      log('SOURCE', `${sourceName}: cancelled`);
      await updateProgress({ status: 'cancelled', finishedAt: new Date() });
      return progress;
    }

    await updateProgress({ fetched: rawJobs.length, message: `Fetched ${rawJobs.length} jobs, normalizing...` });

    // Normalize
    log('NORMALIZE', `${sourceName}: normalizing ${rawJobs.length} jobs`);
    const normalized = rawJobs.map(normalize);
    await updateProgress({ normalized: normalized.length, message: `Normalized ${normalized.length} jobs, upserting...` });

    // Upsert
    log('UPSERT', `${sourceName}: upserting ${normalized.length} jobs`);
    const { inserted, updated, duplicates } = await batchUpsert(db, normalized, sourceName);

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - (progress.startedAt?.getTime() || finishedAt.getTime());

    await updateProgress({
      status: 'completed',
      inserted,
      updated,
      duplicates,
      finishedAt,
      durationMs,
      message: `Completed: +${inserted} new, ${updated} updated, ${duplicates} dupes`,
    });

    // Update source stats
    await sourcesColl.updateOne(
      { name: sourceName },
      {
        $set: {
          name: sourceName,
          displayName: SOURCE_REGISTRY[sourceName]?.name || sourceName,
          type: SOURCE_REGISTRY[sourceName]?.type || 'api',
          enabled: true,
          'status.lastRunAt': finishedAt,
          'status.lastSuccessAt': finishedAt,
          'status.health': 'healthy',
          'status.consecutiveFailures': 0,
          'status.lastErrorMessage': null,
          updatedAt: finishedAt,
        },
        $inc: {
          'statistics.totalRuns': 1,
          'statistics.totalJobsFound': rawJobs.length,
          'statistics.totalJobsInserted': inserted,
          'statistics.totalJobsUpdated': updated,
          'statistics.totalDuplicates': duplicates,
        },
        $setOnInsert: { createdAt: finishedAt },
      },
      { upsert: true }
    );

    log('SOURCE', `${sourceName}: completed in ${(durationMs / 1000).toFixed(1)}s — +${inserted} new, ${updated} updated`);
    return progress;
  } catch (err: any) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - (progress.startedAt?.getTime() || finishedAt.getTime());

    // Classify error type for better diagnostics
    let errorCode = 'UNKNOWN';
    let errorMessage = err.message || 'Unknown error';

    if (err.message?.includes('NOT_CONFIGURED') || err.message?.includes('Missing')) {
      errorCode = 'CONFIG_ERROR';
    } else if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      errorCode = 'TIMEOUT';
    } else if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
      errorCode = 'NETWORK_ERROR';
    } else if (err.message?.includes('CAPTCHA') || err.message?.includes('challenge')) {
      errorCode = 'CAPTCHA_DETECTED';
    } else if (err.message?.includes('AUTH_REQUIRED') || err.message?.includes('login')) {
      errorCode = 'AUTH_REQUIRED';
    } else if (err.message?.includes('access') && err.message?.includes('restricted')) {
      errorCode = 'ACCESS_RESTRICTED';
    } else if (err.message?.includes('parser') || err.message?.includes('JSON')) {
      errorCode = 'PARSER_ERROR';
    } else if (err.message?.includes('selector') || err.message?.includes('element')) {
      errorCode = 'SELECTOR_CHANGED';
    }

    log('ERROR', `${sourceName}: failed [${errorCode}] — ${errorMessage}`);
    await updateProgress({
      status: 'failed',
      error: errorMessage,
      errorCode,
      finishedAt,
      durationMs,
    });

    await sourcesColl.updateOne(
      { name: sourceName },
      { $set: { 'status.health': 'failing', 'status.lastFailureAt': finishedAt, 'status.lastErrorMessage': errorMessage }, $inc: { 'status.consecutiveFailures': 1 } },
      { upsert: true }
    );

    return progress;
  }
}

// ── Kill Active Processes (for cancellation) ──────────────────────────

export function killJobSpyProcesses() {
  for (const [id, child] of activeJobSpyProcesses) {
    log('SOURCE', `Killing JobSpy process ${id}`);
    child.kill('SIGTERM');
    setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
  }
}

export function killLinkedInProcesses() {
  for (const [id, child] of activeLinkedInProcesses) {
    log('SOURCE', `Killing LinkedIn process ${id}`);
    child.kill('SIGTERM');
    setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
  }
}
