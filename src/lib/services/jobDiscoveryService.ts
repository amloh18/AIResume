import { ObjectId } from 'mongodb';
import { NaukriDiscoveryService } from '@/lib/services/naukriDiscoveryService';
import { IndeedDiscoveryService } from '@/lib/services/indeedDiscoveryService';
import { AdzunaDiscoveryService } from '@/lib/services/adzunaDiscoveryService';
import type {
  Job,
  JobMatch,
  JobPreferences,
  MatchBreakdown,
  User,
} from '@/types/automation-schema';

export type DiscoveryRegion = 'UK' | 'India' | 'Global';

export interface DiscoveryCriteria {
  region?: DiscoveryRegion;
  keywords?: string[];
  remoteOnly?: boolean;
  limit?: number;
  ingestLimit?: number;
}

export interface DiscoveredJob {
  _id: ObjectId;
  externalId: string;
  title: string;
  company: string;
  location: string;
  country: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  applyUrl: string;
  source: 'discovery' | 'naukri' | 'indeed';
  atsType: 'greenhouse' | 'naukri' | 'indeed';
  keywords: string[];
  createdAt: Date;
  postedDate?: Date;
  postedAt?: Date;
  status?: string;
}

interface GreenhouseBoard {
  slug: string;
  company: string;
}

// Verified live Greenhouse public board slugs (tested 2026-08).
// UK employers, plus global employers with UK + India presence.
const GREENHOUSE_BOARDS: GreenhouseBoard[] = [
  { slug: 'monzo', company: 'Monzo' },
  { slug: 'wise', company: 'Wise' },
  { slug: 'skyscanner', company: 'Skyscanner' },
  { slug: 'graphcore', company: 'Graphcore' },
  { slug: 'airbnb', company: 'Airbnb' },
  { slug: 'dropbox', company: 'Dropbox' },
  { slug: 'reddit', company: 'Reddit' },
  { slug: 'twilio', company: 'Twilio' },
  { slug: 'mongodb', company: 'MongoDB' },
  { slug: 'pinterest', company: 'Pinterest' },
  { slug: 'duolingo', company: 'Duolingo' },
  { slug: 'lyft', company: 'Lyft' },
];

const UK_HINTS = [
  'united kingdom',
  'london',
  'uk',
  'manchester',
  'bristol',
  'leeds',
  'edinburgh',
  'birmingham',
  'cardiff',
  'glasgow',
  'cambridge',
  'oxford',
  'brighton',
  'europe',
];

const INDIA_HINTS = [
  'india',
  'new delhi',
  'mumbai',
  'bangalore',
  'bengaluru',
  'hyderabad',
  'chennai',
  'pune',
  'gurgaon',
  'gurugram',
  'noida',
  'kolkata',
];

const REMOTE_HINTS = ['remote', 'anywhere', 'worldwide', 'home based', 'distributed'];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'our', 'all', 'will', 'this',
  'that', 'from', 'into', 'have', 'has', 'can', 'who', 'what', 'when', 'team', 'role',
]);

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const normalizedLocation = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const loc = value as { name?: string; city?: string; state?: string; country?: string };
    return [loc.name, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  }
  return '';
};

const isRemoteLocation = (location: string): boolean =>
  REMOTE_HINTS.some((hint) => location.toLowerCase().includes(hint));

// Qualifier text following "remote" (e.g. "Remote - US" -> "us", "Remote" -> "").
export const remoteQualifier = (location: string): string => {
  const lower = location.toLowerCase();
  const match = lower.match(/remote[\s/]*[-–—:,\s]*\s*(.+)$/);
  return (match ? match[1] : '').trim();
};

// A remote posting may be restricted to a specific geography (e.g. "Remote - US"
// or "Remote - Bengaluru"). Only surface it for a compatible market.
const remoteAllowedForRegion = (
  location: string,
  region: DiscoveryRegion
): boolean => {
  const qualifier = remoteQualifier(location);

  if (!qualifier || /anywhere|worldwide|global|emea|europe(an)?\b/.test(qualifier)) {
    return true;
  }

  const ukAnchored = /(london|uk\b|united kingdom|ireland|scotland|england|wales|britain)/.test(qualifier);
  const indiaAnchored = /(india|apac|bengaluru|bangalore|mumbai|hyderabad|pune|gurugram|noida|chennai)/.test(qualifier);

  if (region === 'UK') return ukAnchored;
  if (region === 'India') return indiaAnchored;
  return true;
};

export const parseSalary = (
  metadata: unknown[]
): { salaryMin?: number; salaryMax?: number; salaryCurrency?: string } => {
  if (!Array.isArray(metadata)) return {};

  const salaryMeta = metadata.find((m) => {
    const name = (m as { name?: string })?.name?.toLowerCase() || '';
    return /salary|compensation|pay|annual|offer/i.test(name);
  });

  const value = salaryMeta
    ? (salaryMeta as { value?: string })?.value || ''
    : '';

  if (!value) return {};

  let currency: string = 'GBP';
  if (value.includes('$') || /usd/i.test(value)) currency = 'USD';
  else if (value.includes('€') || /eur/i.test(value)) currency = 'EUR';
  else if (value.includes('₹') || /inr/i.test(value)) currency = 'INR';

  const withK = value.replace(/(\d)\s*k\b/gi, '$1000');
  const numberTokens = withK.match(/\d[\d,.]*/g) || [];
  const numbers = numberTokens
    .map((t) => parseInt(t.replace(/,/g, ''), 10))
    .filter((n) => !Number.isNaN(n));

  if (numbers.length === 0) return {};

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return {
    salaryMin: min,
    salaryMax: max > min ? max : undefined,
    salaryCurrency: currency,
  };
};

const deriveKeywords = (title: string, description: string): string[] => {
  const text = `${title} ${description}`.toLowerCase();
  const tokens = text.split(/[^a-z0-9+#.-]+/).filter((t) => t.length > 2);
  const unique = Array.from(new Set(tokens)).filter((t) => !STOPWORDS.has(t));
  return unique.slice(0, 30);
};

export const matchesRegion = (location: string, region: DiscoveryRegion): boolean => {
  const lower = location.toLowerCase();
  const remote = isRemoteLocation(lower);

  if (remote) {
    return remoteAllowedForRegion(lower, region);
  }

  if (region === 'UK') {
    return UK_HINTS.some((hint) => lower.includes(hint));
  }

  if (region === 'India') {
    return INDIA_HINTS.some((hint) => lower.includes(hint));
  }

  return true;
};

const matchesKeywords = (
  job: { title: string; company: string; description: string },
  keywords: string[]
): boolean => {
  if (!keywords.length) return true;
  const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
};

const fetchGreenhouseBoard = async (
  board: GreenhouseBoard,
  criteria: DiscoveryCriteria,
  ttlMs: number
): Promise<DiscoveredJob[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttlMs);

  try {
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`[JobDiscovery] ${board.slug} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const rawJobs: any[] = data?.jobs || [];

    const jobs: DiscoveredJob[] = [];

    for (const raw of rawJobs) {
      const location = normalizedLocation(raw.location);
      const remote = isRemoteLocation(location) || raw.remote === true;

      const salary = parseSalary(raw.metadata);
      const description = stripHtml(raw.content || '');
      const title = raw.title || '';

      if (!title || !board.company) continue;

      const discovered: DiscoveredJob = {
        _id: new ObjectId(),
        externalId: `discovery-greenhouse-${raw.id || raw.absolute_url}`,
        title,
        company: board.company,
        location: location || 'Remote',
        country: regionToCountry(criteria.region || 'UK'),
        remote,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        salaryCurrency: salary.salaryCurrency,
        description: description.slice(0, 4000),
        applyUrl: raw.absolute_url || '',
        source: 'discovery',
        atsType: 'greenhouse',
        keywords: deriveKeywords(title, description),
        createdAt: new Date(),
        postedDate: raw.first_published ? new Date(raw.first_published) : undefined,
      };

      if (!matchesRegion(discovered.location, criteria.region || 'UK')) continue;
      if (criteria.remoteOnly === true && !remote) continue;
      if (!matchesKeywords(discovered, criteria.keywords || [])) continue;
      if (!discovered.applyUrl) continue;

      jobs.push(discovered);
    }

    return jobs;
  } catch (error: any) {
    console.warn(`[JobDiscovery] Failed to fetch ${board.slug}:`, error.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

const regionToCountry = (region: DiscoveryRegion): string => {
  if (region === 'UK') return 'UK';
  if (region === 'India') return 'India';
  return 'Global';
};

export class JobDiscoveryService {
  /**
   * Fetch jobs from free public sources and persist them into the global
   * `jobs` collection (deduped by externalId). Returns the stored documents.
   */
  static async fetchAndStore(criteria: DiscoveryCriteria = {}): Promise<DiscoveredJob[]> {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const region = criteria.region || 'UK';
    const perBoardTtl = 15000;
    const ingestLimit = criteria.ingestLimit || 60;

    const results = await Promise.all([
      ...GREENHOUSE_BOARDS.map((board) => fetchGreenhouseBoard(board, criteria, perBoardTtl)),
      // Ingest from Naukri when targeting India or Global markets
      (region === 'India' || region === 'Global')
        ? NaukriDiscoveryService.searchJobs({
            keywords: criteria.keywords,
            remoteOnly: criteria.remoteOnly,
            limit: Math.min(ingestLimit, 25),
          })
        : Promise.resolve([]),
      // Ingest from Indeed across all regions (UK, US, India, Global)
      IndeedDiscoveryService.searchJobs({
        query: criteria.keywords?.join(' ') || 'Software Engineer',
        region: region as any,
        limit: Math.min(ingestLimit, 25),
      }).then((r) => r.jobs).catch(() => []),
      // Ingest from free Adzuna public index across UK, US, India, Global
      AdzunaDiscoveryService.searchJobs({
        keywords: criteria.keywords,
        region: region as any,
        limit: Math.min(ingestLimit, 25),
      }).then((r) => r.jobs).catch(() => []),
    ]);

    const seen = new Set<string>();
    let pool: DiscoveredJob[] = [];

    for (const batch of results) {
      for (const job of batch) {
        if (seen.has(job.externalId)) continue;
        seen.add(job.externalId);
        pool.push(job);
      }
    }

    // Prefer freshest postings; keep run bounded.
    pool.sort(
      (a, b) =>
        (b.postedDate?.getTime() || 0) - (a.postedDate?.getTime() || 0)
    );
    pool = pool.slice(0, ingestLimit);

    if (pool.length === 0) {
      return [];
    }

    const collection = db.collection<Job>('jobs');

    const ops = pool.map((job) => ({
      updateOne: {
        filter: { externalId: job.externalId },
        update: {
          $set: {
            title: job.title,
            company: job.company,
            description: job.description,
            location: job.location,
            country: job.country,
            remote: job.remote,
            salary: job.salaryMin || job.salaryMax ? formatSalary(job) : undefined,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            applyUrl: job.applyUrl,
            source: (job.source || 'discovery') as any,
            atsType: (job.atsType || 'greenhouse') as any,
            keywords: job.keywords,
            postedDate: job.postedDate,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            externalId: job.externalId,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(ops, { ordered: false });

    const stored = await collection
      .find({ externalId: { $in: pool.map((j) => j.externalId) } })
      .toArray();

    const externalToId = new Map(stored.map((s) => [(s as any).externalId, s._id]));

    return pool.map((job) => ({
      ...job,
      _id: (externalToId.get(job.externalId) as ObjectId) || job._id,
    }));
  }

  /**
   * Compute a match score for each discovered job for the given user.
   * Uses stored job_preferences when available (persists job_matches and can
   * mark auto-apply eligibility); otherwise falls back to a lightweight
   * display heuristic so anonymous/onboarding users still see scores.
   */
  static async scoreDiscoveredJobs(
    discovered: DiscoveredJob[],
    userId?: string
  ): Promise<Map<string, { score: number; breakdown?: MatchBreakdown }>> {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    const scores = new Map<string, { score: number; breakdown?: MatchBreakdown }>();

    let preferences: JobPreferences | null = null;
    let user: User | null = null;

    if (userId) {
      try {
        user = await db.collection<User>('users').findOne({ _id: new ObjectId(userId) });
        if (user) {
          preferences = await db
            .collection<JobPreferences>('job_preferences')
            .findOne({ userId: new ObjectId(userId) });
        }
      } catch (error) {
        console.warn('[JobDiscovery] Could not load user preferences:', error);
      }
    }

    if (preferences) {
      const { JobMatchingService } = await import('./jobMatchingService');

      await Promise.all(
        discovered.map(async (job) => {
          try {
            const match: JobMatch = await JobMatchingService.computeScore(
              userId as string,
              job._id.toString()
            );
            scores.set(job.externalId, {
              score: match.score,
              breakdown: match.breakdown,
            });
          } catch (error) {
            scores.set(job.externalId, {
              score: heuristicScore(job, preferences),
            });
          }
        })
      );
    } else {
      for (const job of discovered) {
        scores.set(job.externalId, { score: heuristicScore(job, preferences) });
      }
    }

    return scores;
  }
}

const heuristicScore = (
  job: DiscoveredJob,
  preferences: JobPreferences | null
): number => {
  let score = 58;

  if (preferences) {
    const prefTitles = preferences.titles || [];
    const normalized = job.title.toLowerCase();
    if (prefTitles.some((t) => normalized.includes(t.toLowerCase()))) {
      score += 12;
    }

    const prefLocations = (preferences.locations || []).map((l) => l.toLowerCase());
    const jobLocation = job.location.toLowerCase();
    if (
      job.remote ||
      prefLocations.some((l) => jobLocation.includes(l) || l.includes('remote'))
    ) {
      score += 10;
    }
  } else {
    score += 6;
  }

  const daysSince = job.postedDate
    ? Math.floor((Date.now() - job.postedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  if (daysSince <= 3) score += 6;
  else if (daysSince <= 7) score += 4;
  else if (daysSince <= 14) score += 2;

  return Math.min(98, Math.max(40, score));
};

const formatSalary = (job: DiscoveredJob): string => {
  const parts: string[] = [];
  if (job.salaryMin) parts.push(job.salaryMin.toLocaleString());
  if (job.salaryMax) parts.push(job.salaryMax.toLocaleString());
  return parts.join(' - ') + (job.salaryCurrency ? ` ${job.salaryCurrency}` : '');
};