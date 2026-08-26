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

// ── Structured Logging ─────────────────────────────────────────────────

function log(tag: string, msg: string, ...args: any[]) {
  console.log(`[INGEST:${tag}] ${msg}`, ...args);
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

export type SourceType = 'public_api' | 'api_key' | 'self_hosted_scraper';

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
}

export const SOURCE_REGISTRY: Record<string, SourceDefinition> = {
  greenhouse: { id: 'greenhouse', name: 'Greenhouse ATS', type: 'public_api', enabled: true, requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 600_000 },
  lever: { id: 'lever', name: 'Lever ATS', type: 'public_api', enabled: true, requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 600_000 },
  ashby: { id: 'ashby', name: 'Ashby ATS', type: 'public_api', enabled: true, requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 600_000 },
  remotive: { id: 'remotive', name: 'Remotive', type: 'public_api', enabled: true, requiresApiKey: false, supportsPagination: false, defaultLimit: 250, maxLimit: 250, cooldownMs: 3_600_000 },
  remoteok: { id: 'remoteok', name: 'RemoteOK', type: 'public_api', enabled: true, requiresApiKey: false, supportsPagination: false, defaultLimit: 0, maxLimit: 0, cooldownMs: 3_600_000 },
  workday: { id: 'workday', name: 'Workday ATS', type: 'public_api', enabled: true, requiresApiKey: false, supportsPagination: true, defaultLimit: 20, maxLimit: 20, cooldownMs: 600_000 },
  adzuna: { id: 'adzuna', name: 'Adzuna', type: 'api_key', enabled: true, requiresApiKey: true, supportsPagination: true, defaultLimit: 50, maxLimit: 50, cooldownMs: 600_000 },
  jobspy: { id: 'jobspy', name: 'JobSpy Aggregator', type: 'self_hosted_scraper', enabled: true, requiresApiKey: false, supportsPagination: false, defaultLimit: 20, maxLimit: 100, cooldownMs: 600_000 },
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
    const venvPython = path.join(process.cwd(), 'scripts', '.venv', 'bin', 'python');
    const workerPath = path.join(process.cwd(), 'scripts', 'jobspy-worker.py');
    try {
      require('fs').accessSync(workerPath);
    } catch {
      return { ready: false, reason: 'scripts/jobspy-worker.py not found' };
    }
    // Check venv Python exists and jobspy package is importable
    try {
      require('fs').accessSync(venvPython);
    } catch {
      return { ready: false, reason: 'JobSpy venv not found at scripts/.venv/bin/python. Run: python3 -m venv scripts/.venv && scripts/.venv/bin/pip install git+https://github.com/Bunsly/JobSpy.git' };
    }
    // Test import
    try {
      const { execSync } = require('child_process');
      execSync(`${venvPython} -c "from jobspy import scrape_jobs"`, { timeout: 10000, stdio: 'ignore' });
    } catch {
      return { ready: false, reason: 'JobSpy package not installed in venv. Run: scripts/.venv/bin/pip install git+https://github.com/Bunsly/JobSpy.git' };
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
  log('FETCH', `Greenhouse: fetching ${GREENHOUSE_COMPANIES.length} boards`);

  for (const company of GREENHOUSE_COMPANIES) {
    if (signal?.aborted) break;
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`,
        { headers: { 'User-Agent': 'CVCircle-Ingestion/1.0' }, signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) continue;

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
    } catch {
      // Skip failed companies
    }
  }

  log('FETCH', `Greenhouse: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchLever(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  log('FETCH', `Lever: fetching ${LEVER_COMPANIES.length} companies`);

  for (const company of LEVER_COMPANIES) {
    if (signal?.aborted) break;
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company}?mode=json`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) continue;

      const data: any[] = await res.json();
      if (!Array.isArray(data)) continue;

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
    } catch {
      // Skip failed companies
    }
  }

  log('FETCH', `Lever: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchAshby(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  log('FETCH', `Ashby: fetching ${ASHBY_COMPANIES.length} boards`);

  for (const company of ASHBY_COMPANIES) {
    if (signal?.aborted) break;
    try {
      const res = await fetch(
        `https://api.ashbyhq.com/api/posting-board/job-postings/${company}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) continue;

      const data: any = await res.json();
      const postings = data?.jobPostings || data?.data || [];
      if (!Array.isArray(postings)) continue;

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
    } catch {
      // Skip failed companies
    }
  }

  log('FETCH', `Ashby: ${jobs.length} jobs fetched`);
  return jobs;
}

async function fetchRemotive(signal?: AbortSignal): Promise<RawJob[]> {
  try {
    log('FETCH', 'Remotive: fetching remote jobs');
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=250', {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];

    const data: any = await res.json();
    const rawJobs: any[] = data.jobs || data || [];
    if (!Array.isArray(rawJobs)) return [];

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
  } catch {
    return [];
  }
}

async function fetchRemoteOK(signal?: AbortSignal): Promise<RawJob[]> {
  try {
    log('FETCH', 'RemoteOK: fetching remote jobs');
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CVCircle-Ingestion/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];

    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

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
  } catch {
    return [];
  }
}

async function fetchWorkday(signal?: AbortSignal): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const MAX_PAGES = 25;
  const PAGE_SIZE = 20;
  const MAX_JOBS_PER_COMPANY = 500;
  log('FETCH', `Workday: fetching ${WORKDAY_TENANTS.length} tenants`);

  for (const company of WORKDAY_TENANTS) {
    if (signal?.aborted) break;

    try {
      let offset = 0;
      let pageCount = 0;
      let totalForCompany = 0;

      while (pageCount < MAX_PAGES && totalForCompany < MAX_JOBS_PER_COMPANY) {
        if (signal?.aborted) break;

        const res = await fetch(
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
        );

        if (!res.ok) break;

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
    } catch {
      // Skip failed companies
    }
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
  log('FETCH', `Adzuna: fetching ${ADZUNA_COUNTRIES.length} countries, max ${MAX_PAGES} pages each`);

  for (const country of ADZUNA_COUNTRIES) {
    if (signal?.aborted) break;

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (signal?.aborted) break;

      try {
        const res = await fetch(
          `http://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&what=software+engineer&results_per_page=${RESULTS_PER_PAGE}&content-type=application/json`,
          { signal: AbortSignal.timeout(15000) }
        );

        if (res.status === 429) {
          log('FETCH', `Adzuna: rate limited on ${country} page ${page}, backing off`);
          await new Promise((r) => setTimeout(r, 5000));
          break;
        }

        if (!res.ok) break;

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
      } catch {
        break;
      }
    }
  }

  log('FETCH', `Adzuna: ${jobs.length} jobs fetched`);
  return jobs;
}

const activeJobSpyProcesses = new Map<string, ChildProcess>();

async function fetchJobSpy(signal?: AbortSignal): Promise<RawJob[]> {
  const venvPython = path.join(process.cwd(), 'scripts', '.venv', 'bin', 'python');
  const workerPath = path.join(process.cwd(), 'scripts', 'jobspy-worker.py');
  log('FETCH', `JobSpy: spawning python worker at ${workerPath} using ${venvPython}`);

  return new Promise((resolve) => {
    const processId = `jobspy-${Date.now()}`;

    const child = spawn(venvPython, [workerPath], {
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

const SOURCE_FETCHERS: Record<string, (signal?: AbortSignal) => Promise<RawJob[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  remotive: fetchRemotive,
  remoteok: fetchRemoteOK,
  workday: fetchWorkday,
  adzuna: fetchAdzuna,
  jobspy: fetchJobSpy,
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
  const newOps = newJobs.map((job) => ({
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
          salary: job.salary,
          skills: job.skills,
          postedAt: job.postedAt,
          firstSeenAt: now,
          status: 'new',
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
          sourceMetadata: job.sourceMetadata,
          updatedAt: now,
        },
      },
      upsert: true,
    },
  }));

  // Upsert content-changed jobs (update content fields)
  const contentOps = contentChangedJobs.map((job) => ({
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
          sourceMetadata: job.sourceMetadata,
          updatedAt: now,
        },
        $inc: { 'ingestion.updateCount': 1 },
      },
      upsert: true,
    },
  }));

  // Metadata-only updates for duplicates (just touch lastSeenAt/lastVerifiedAt)
  const duplicateJobs = jobs.filter((_, i) => {
    const job = jobs[i];
    const existingHash =
      existingHashByCanonical.get(job.canonicalId) ||
      existingHashBySource.get(`${job.source.primary}::${job.source.sourceJobId}`);
    return existingHash !== undefined && existingHash === job.contentHash;
  });

  const metaOps = duplicateJobs.map((job) => ({
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
          updatedAt: now,
        },
      },
      upsert: false,
    },
  }));

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
          updatedAt: finishedAt,
        },
        $inc: { 'statistics.totalRuns': 1, 'statistics.totalJobsFound': rawJobs.length },
        $setOnInsert: { createdAt: finishedAt },
      },
      { upsert: true }
    );

    log('SOURCE', `${sourceName}: completed in ${(durationMs / 1000).toFixed(1)}s — +${inserted} new, ${updated} updated`);
    return progress;
  } catch (err: any) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - (progress.startedAt?.getTime() || finishedAt.getTime());

    log('ERROR', `${sourceName}: failed — ${err.message}`);
    await updateProgress({
      status: 'failed',
      error: err.message,
      finishedAt,
      durationMs,
    });

    await sourcesColl.updateOne(
      { name: sourceName },
      { $set: { 'status.health': 'failing', 'status.lastFailureAt': finishedAt }, $inc: { 'status.consecutiveFailures': 1 } },
      { upsert: true }
    );

    return progress;
  }
}

// ── Kill JobSpy Processes (for cancellation) ────────────────────────────

export function killJobSpyProcesses() {
  for (const [id, child] of activeJobSpyProcesses) {
    log('SOURCE', `Killing JobSpy process ${id}`);
    child.kill('SIGTERM');
    setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 5000);
  }
}
