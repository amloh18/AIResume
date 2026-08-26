/**
 * In-Process Job Ingestion API
 * 
 * Runs job fetching from sources directly within the Next.js app.
 * Replaces the unreachable microservice at localhost:4001.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Types ──────────────────────────────────────────────────────────────

interface RawJob {
  source: string;
  sourceJobId: string;
  url: string;
  title: string;
  companyName: string;
  rawHtmlDescription?: string;
  locationString?: string;
  isRemote?: boolean;
  postedDate?: Date | string;
  applicationUrl?: string;
}

interface NormalizedJob {
  canonicalId: string;
  title: string;
  normalizedTitle: string;
  company: { name: string; normalizedName: string; domain?: string; logoUrl?: string };
  description: string;
  descriptionText: string;
  source: { primary: string; sourceJobId: string; sourceUrl: string; applicationUrl: string; discoveredAt: Date; lastSeenAt: Date };
  sources: Array<{ name: string; sourceJobId: string; url: string; firstSeenAt: Date; lastSeenAt: Date }>;
  location: { city: string; state?: string; country: string; countryCode: string; remote: boolean; remoteType?: string };
  employmentType: string;
  experience: { minYears: null; maxYears: null; level?: string };
  salary: { min?: number; max?: number; currency?: string; period?: string };
  skills: string[];
  status: string;
  postedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Source Fetchers ─────────────────────────────────────────────────────

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
  'dll', 'midjourney', 'retool', ' Retool', 'cashapp', 'square',
  'discord', 'twitch', 'coinbase', 'plaid', 'rippling', 'brex',
];

const ASHBY_COMPANIES = [
  'notion', 'linear', 'posthog', 'vercel', 'supabase', 'resend',
  'calcom', 'plausible', 'raycast', 'loom', 'webflow', 'intercom',
];

async function fetchGreenhouse(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  
  for (const company of GREENHOUSE_COMPANIES) {
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
        });
      }
    } catch {
      // Skip failed companies
    }
  }
  
  return jobs;
}

async function fetchLever(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  
  for (const company of LEVER_COMPANIES) {
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
        });
      }
    } catch {
      // Skip failed companies
    }
  }
  
  return jobs;
}

async function fetchAshby(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  
  for (const company of ASHBY_COMPANIES) {
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
        });
      }
    } catch {
      // Skip failed companies
    }
  }
  
  return jobs;
}

async function fetchRemotive(): Promise<RawJob[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=250', {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];
    
    const data: any = await res.json();
    const rawJobs: any[] = data.jobs || data || [];
    if (!Array.isArray(rawJobs)) return [];
    
    return rawJobs.map((job: any) => ({
      source: 'remotive',
      sourceJobId: String(job.id),
      url: job.url || job.job_url || `https://remotive.com/job/${job.id}`,
      title: job.title || 'Untitled',
      companyName: job.company_name || 'Unknown',
      rawHtmlDescription: job.description || job.description_required || '',
      locationString: job.candidate_required_location || '',
      isRemote: true,
      postedDate: job.publication_date ? new Date(job.publication_date) : new Date(),
      applicationUrl: job.url || job.job_url,
    }));
  } catch {
    return [];
  }
}

async function fetchRemoteOK(): Promise<RawJob[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'CVCircle-Ingestion/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];
    
    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];
    
    // First item is metadata, skip it
    return data.slice(1).filter((job: any) => job.id && job.position).map((job: any) => ({
      source: 'remoteok',
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
  } catch {
    return [];
  }
}

// ── Normalization ───────────────────────────────────────────────────────

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
  
  // Simple country extraction
  let country = 'Unknown';
  let countryCode = 'XX';
  if (lower.includes('united kingdom') || lower.includes('london') || lower.includes('uk')) { country = 'United Kingdom'; countryCode = 'GB'; }
  else if (lower.includes('united states') || lower.includes('usa') || lower.includes('us')) { country = 'United States'; countryCode = 'US'; }
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

function normalize(raw: RawJob): NormalizedJob {
  const titleRes = normalizeTitle(raw.title);
  const company = normalizeCompany(raw.companyName, raw.url);
  const location = normalizeLocation(raw.locationString);
  const now = new Date();
  
  return {
    canonicalId: generateCanonicalId(company.normalizedName, titleRes.normalizedTitle, location.countryCode, location.city),
    title: titleRes.title,
    normalizedTitle: titleRes.normalizedTitle,
    company,
    description: (raw.rawHtmlDescription || '').substring(0, 50000),
    descriptionText: (raw.rawHtmlDescription || '').replace(/<[^>]*>/g, '').substring(0, 50000),
    source: {
      primary: raw.source,
      sourceJobId: raw.sourceJobId,
      sourceUrl: raw.url,
      applicationUrl: raw.applicationUrl || raw.url,
      discoveredAt: now,
      lastSeenAt: now,
    },
    sources: [{ name: raw.source, sourceJobId: raw.sourceJobId, url: raw.url, firstSeenAt: now, lastSeenAt: now }],
    location,
    employmentType: 'full_time',
    experience: { minYears: null, maxYears: null, level: titleRes.level },
    salary: {},
    skills: [],
    status: 'active',
    postedAt: raw.postedDate ? new Date(raw.postedDate) : now,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Batch Upsert ───────────────────────────────────────────────────────

async function batchUpsert(db: mongoose.Connection['db'], jobs: NormalizedJob[], sourceName: string) {
  const coll = db!.collection('jobs');
  const eventsColl = db!.collection('jobEvents');
  const now = new Date();
  
  const ops = jobs.map((job) => ({
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
          location: job.location,
          employmentType: job.employmentType,
          experience: job.experience,
          salary: job.salary,
          skills: job.skills,
          postedAt: job.postedAt,
          status: 'active',
          createdAt: now,
        },
        $set: {
          'source.lastSeenAt': now,
          updatedAt: now,
        },
        $inc: { 'ingestion.updateCount': 1 },
        $addToSet: {
          sources: {
            name: job.source.primary,
            sourceJobId: job.source.sourceJobId,
            url: job.source.sourceUrl,
            firstSeenAt: now,
            lastSeenAt: now,
          },
        },
      },
      upsert: true,
    },
  }));
  
  const res = await coll.bulkWrite(ops, { ordered: false });
  
  // Record created events
  if (res.upsertedCount > 0 && res.upsertedIds) {
    const eventOps = Object.entries(res.upsertedIds).map(([idx, id]) => ({
      insertOne: {
        document: {
          jobId: id,
          canonicalId: jobs[parseInt(idx)]?.canonicalId,
          eventType: 'created',
          source: sourceName,
          metadata: { company: jobs[parseInt(idx)]?.company?.name, title: jobs[parseInt(idx)]?.title },
          createdAt: now,
        },
      },
    }));
    await eventsColl.bulkWrite(eventOps, { ordered: false }).catch(() => {});
  }
  
  return { inserted: res.upsertedCount || 0, updated: res.modifiedCount || 0 };
}

// ── Route Handlers ──────────────────────────────────────────────────────

const SOURCE_FETCHERS: Record<string, () => Promise<RawJob[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  remotive: fetchRemotive,
  remoteok: fetchRemoteOK,
};

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });
    
    const body = await request.json().catch(() => ({}));
    const sourceName = body.source as string | undefined;
    const sourcesToRun = sourceName ? [sourceName] : Object.keys(SOURCE_FETCHERS);
    
    const runsColl = db.collection('ingestionRuns');
    const sourcesColl = db.collection('jobSources');
    
    const results: Record<string, any> = {};
    
    for (const src of sourcesToRun) {
      const fetcher = SOURCE_FETCHERS[src];
      if (!fetcher) {
        results[src] = { error: `Unknown source: ${src}` };
        continue;
      }
      
      const runId = `run-${src}-${Date.now()}`;
      const startedAt = new Date();
      
      // Create run record
      await runsColl.insertOne({
        runId,
        source: src,
        status: 'running',
        startedAt,
        metrics: { fetched: 0, parsed: 0, inserted: 0, updated: 0, duplicates: 0, errors: 0 },
        createdAt: startedAt,
      });
      
      try {
        const rawJobs = await fetcher();
        const normalized = rawJobs.map(normalize);
        const { inserted, updated } = await batchUpsert(db, normalized, src);
        
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        
        // Update run record
        await runsColl.updateOne(
          { runId },
          {
            $set: {
              status: 'completed',
              finishedAt,
              durationMs,
              metrics: {
                fetched: rawJobs.length,
                parsed: normalized.length,
                inserted,
                updated,
                duplicates: rawJobs.length - inserted - updated,
                errors: 0,
              },
            },
          }
        );
        
        // Update source stats
        await sourcesColl.updateOne(
          { name: src },
          {
            $set: {
              name: src,
              displayName: src.charAt(0).toUpperCase() + src.slice(1),
              type: ['greenhouse', 'lever', 'ashby'].includes(src) ? 'ats' : 'api',
              enabled: true,
              'status.lastRunAt': finishedAt,
              'status.health': 'healthy',
              'status.consecutiveFailures': 0,
              updatedAt: finishedAt,
            },
            $inc: { 'statistics.totalRuns': 1, 'statistics.totalJobsFound': rawJobs.length },
            $setOnInsert: { createdAt: finishedAt },
          },
          { upsert: true }
        );
        
        results[src] = { runId, fetched: rawJobs.length, inserted, updated, durationMs };
      } catch (err: any) {
        await runsColl.updateOne(
          { runId },
          { $set: { status: 'failed', finishedAt: new Date(), errorSummary: [{ message: err.message }] } }
        );
        await sourcesColl.updateOne(
          { name: src },
          { $set: { 'status.health': 'failing' }, $inc: { 'status.consecutiveFailures': 1 } },
          { upsert: true }
        );
        results[src] = { error: err.message };
      }
    }
    
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('Ingestion error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });
    
    const sourcesColl = db.collection('jobSources');
    const sources = await sourcesColl.find({}).sort({ name: 1 }).toArray();
    
    return NextResponse.json({
      availableSources: Object.keys(SOURCE_FETCHERS),
      configuredSources: sources,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });
    
    const body = await request.json().catch(() => ({}));
    const { action, runId, source } = body;
    
    const runsColl = db.collection('ingestionRuns');
    
    // Cancel a running ingestion
    if (action === 'cancel') {
      const filter: any = { status: 'running' };
      if (runId) filter.runId = runId;
      else if (source) filter.source = source;
      else return NextResponse.json({ error: 'runId or source required' }, { status: 400 });
      
      const result = await runsColl.updateMany(
        filter,
        { $set: { status: 'cancelled', finishedAt: new Date(), cancelledBy: 'admin' } }
      );
      
      return NextResponse.json({
        success: true,
        cancelled: result.modifiedCount,
      });
    }
    
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
