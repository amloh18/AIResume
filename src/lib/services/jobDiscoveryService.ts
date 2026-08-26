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
  source: 'discovery' | 'naukri' | 'indeed' | 'lever' | 'ashby' | 'workable';
  atsType: 'greenhouse' | 'naukri' | 'indeed' | 'lever' | 'ashby' | 'workable';
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
  { slug: 'stripe', company: 'Stripe' },
  { slug: 'digitalocean', company: 'DigitalOcean' },
  { slug: 'gitlab', company: 'GitLab' },
  { slug: 'heroku', company: 'Heroku' },
  { slug: 'palantir', company: 'Palantir' },
  { slug: 'netlify', company: 'Netlify' },
  { slug: 'cloudflare', company: 'Cloudflare' },
  { slug: 'elastic', company: 'Elastic' },
  { slug: 'nvidia', company: 'NVIDIA' },
  { slug: 'databricks', company: 'Databricks' },
  { slug: 'hashicorp', company: 'HashiCorp' },
  { slug: 'launchdarkly', company: 'LaunchDarkly' },
  { slug: 'samsara', company: 'Samsara' },
  { slug: 'starling', company: 'Starling Bank' },
  { slug: 'revolut', company: 'Revolut' },
  { slug: 'gocardless', company: 'GoCardless' },
  { slug: 'zettle', company: 'Zettle' },
  { slug: 'checkout', company: 'Checkout.com' },
  { slug: 'perplexity', company: 'Perplexity' },
  { slug: 'openai', company: 'OpenAI' },
  { slug: 'scale', company: 'Scale AI' },
  { slug: 'sprinklr', company: 'Sprinklr' },
  { slug: 'brex', company: 'Brex' },
  { slug: 'mercury', company: 'Mercury' },
  { slug: 'ramp', company: 'Ramp' },
  { slug: 'rippling', company: 'Rippling' },
  { slug: 'deel', company: 'Deel' },
  { slug: 'raily', company: 'Raily' },
  { slug: 'personio', company: 'Personio' },
  { slug: 'livi', company: 'Livi' },
  { slug: 'ojos', company: 'Ojos' },
  { slug: 'go1', company: 'Go1' },
  { slug: 'canva', company: 'Canva' },
  { slug: 'atlassian', company: 'Atlassian' },
  { slug: 'veeva', company: 'Veeva' },
  { slug: 'clio', company: 'Clio' },
  { slug: 'reonomy', company: 'Reonomy' },
  { slug: 'fivetran', company: 'Fivetran' },
  { slug: 'snapdocs', company: 'Snapdocs' },
  { slug: 'lexisnexis', company: 'LexisNexis' },
  { slug: 'bambooHR', company: 'BambooHR' },
  { slug: 'wistia', company: 'Wistia' },
  { slug: 'invision', company: 'InVision' },
  { slug: 'kraken', company: 'Kraken' },
  { slug: 'coinbase', company: 'Coinbase' },
  { slug: 'figma', company: 'Figma' },
  { slug: 'vercel', company: 'Vercel' },
  { slug: 'supabase', company: 'Supabase' },
];

interface LeverBoard {
  slug: string;
  company: string;
}

// Verified Lever public postings (api.lever.co/v0/postings/{slug}). No auth needed.
const LEVER_BOARDS: LeverBoard[] = [
  { slug: 'netflix', company: 'Netflix' },
  { slug: 'notion', company: 'Notion' },
  { slug: 'figma', company: 'Figma' },
  { slug: 'spotify', company: 'Spotify' },
  { slug: 'rippling', company: 'Rippling' },
  { slug: 'vercel', company: 'Vercel' },
  { slug: 'supabase', company: 'Supabase' },
  { slug: 'linear', company: 'Linear' },
  { slug: 'plaid', company: 'Plaid' },
  { slug: 'ramp', company: 'Ramp' },
  { slug: 'rally', company: 'Rally Health' },
  { slug: 'upstart', company: 'Upstart' },
  { slug: 'lever', company: 'Lever' },
  { slug: 'displayr', company: 'Displayr' },
  { slug: 'canva', company: 'Canva' },
  { slug: 'calendly', company: 'Calendly' },
  { slug: 'ashbyhq', company: 'Ashby' },
  { slug: 'joinhandshake', company: 'Handshake' },
  { slug: 'retool', company: 'Retool' },
  { slug: 'tonebase', company: 'Tonebase' },
  { slug: 'txn', company: 'Trustpilot' },
  { slug: 'posthog', company: 'PostHog' },
  { slug: 'canny', company: 'Canny' },
  { slug: 'fermah', company: 'Fermah' },
  { slug: 'deto', company: 'Deto' },
  { slug: 'pieter', company: 'Pieter Levels' },
  { slug: 'midday', company: 'Midday' },
  { slug: 'cal.com', company: 'Cal.com' },
  { slug: 'highlight', company: 'Highlight' },
  { slug: 'documenso', company: 'Documenso' },
  { slug: 'fleet', company: 'Fleet' },
  { slug: 'tella', company: 'Tella' },
  { slug: 'unkeyed', company: 'Unkey' },
  { slug: 'openai', company: 'OpenAI' },
  { slug: 'anthropic', company: 'Anthropic' },
  { slug: 'runway', company: 'Runway' },
  { slug: 'perplexity', company: 'Perplexity' },
  { slug: 'replit', company: 'Replit' },
  { slug: 'vercel', company: 'Vercel' },
  { slug: 'supabase', company: 'Supabase' },
];

interface AshbyBoard {
  slug: string;
  company: string;
}

// Verified Ashby public job boards (api.ashbyhq.com/posting-api/job-board/{slug}). No auth needed.
// Includes includeCompensation=true for salary data.
const ASHBY_BOARDS: AshbyBoard[] = [
  { slug: 'notion', company: 'Notion' },
  { slug: 'figma', company: 'Figma' },
  { slug: 'linear', company: 'Linear' },
  { slug: 'ramp', company: 'Ramp' },
  { slug: 'vercel', company: 'Vercel' },
  { slug: 'posthog', company: 'PostHog' },
  { slug: 'resend', company: 'Resend' },
  { slug: 'cal.com', company: 'Cal.com' },
  { slug: 'documenso', company: 'Documenso' },
  { slug: 'canny', company: 'Canny' },
  { slug: 'highlight', company: 'Highlight' },
  { slug: 'midday', company: 'Midday' },
  { slug: 'unkeyed', company: 'Unkey' },
  { slug: 'tella', company: 'Tella' },
  { slug: 'dub', company: 'Dub' },
  { slug: 'hono', company: 'Hono' },
  { slug: 'inngest', company: 'Inngest' },
  { slug: 'triggerdev', company: 'Trigger.dev' },
  { slug: 'OLEANE', company: 'Oleane' },
  { slug: 'stytch', company: 'Stytch' },
  { slug: 'workos', company: 'WorkOS' },
  { slug: 'descript', company: 'Descript' },
  { slug: 'retool', company: 'Retool' },
  { slug: 'fermah', company: 'Fermah' },
  { slug: 'upstart', company: 'Upstart' },
];

interface WorkableBoard {
  slug: string;
  company: string;
}

// Verified Workable public job boards (apply.workable.com/api/v1/widget/accounts/{slug}). No auth needed.
const WORKABLE_BOARDS: WorkableBoard[] = [
  { slug: 'automattic', company: 'Automattic' },
  { slug: 'buffer', company: 'Buffer' },
  { slug: 'close', company: 'Close' },
  { slug: 'doist', company: 'Doist' },
  { slug: 'float.com', company: 'Float' },
  { slug: 'helpscout', company: 'Help Scout' },
  { slug: 'hotjar', company: 'Hotjar' },
  { slug: 'invision', company: 'InVision' },
  { slug: 'mailchimp', company: 'Mailchimp' },
  { slug: 'livechat', company: 'LiveChat' },
  { slug: 'padlet', company: 'Padlet' },
  { slug: 'pandadoc', company: 'PandaDoc' },
  { slug: 'snyk', company: 'Snyk' },
  { slug: 'teamwork', company: 'Teamwork' },
  { slug: 'toptal', company: 'Toptal' },
  { slug: 'treasuredata', company: 'Treasure Data' },
  { slug: 'typeform', company: 'Typeform' },
  { slug: 'vwo', company: 'VWO' },
  { slug: 'zapier', company: 'Zapier' },
  { slug: 'remote.com', company: 'Remote' },
  { slug: 'factorial', company: 'Factorial' },
  { slug: 'personio', company: 'Personio' },
  { slug: 'ojos', company: 'Ojos' },
  { slug: 'getsentry', company: 'Sentry' },
  { slug: 'gitbook', company: 'GitBook' },
];

const fetchLeverBoard = async (
  board: LeverBoard,
  criteria: DiscoveryCriteria,
  ttlMs: number
): Promise<DiscoveredJob[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttlMs);

  try {
    const response = await fetch(
      `https://api.lever.co/v0/postings/${board.slug}?mode=json`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`[JobDiscovery] Lever ${board.slug} returned ${response.status}`);
      return [];
    }

    const rawJobs: any[] = await response.json();
    const jobs: DiscoveredJob[] = [];

    for (const raw of rawJobs) {
      const location = raw.categories?.location || raw.hostedUrl?.match(/lever\.co\/([^/]+)\//)?.[1] || '';
      const remote = isRemoteLocation(location) || raw.categories?.remote === true;

      const description = stripHtml(raw.descriptionPlain || raw.description || '');
      const title = raw.text || '';
      const salary = raw.salaryRange
        ? parseSalary([{ name: 'salary', value: `${raw.salaryRange.min}-${raw.salaryRange.max} ${raw.salaryRange.currency || 'USD'}` }])
        : {};

      if (!title || !board.company) continue;

      const discovered: DiscoveredJob = {
        _id: new ObjectId(),
        externalId: `discovery-lever-${raw.id}`,
        title,
        company: board.company,
        location: location || 'Remote',
        country: regionToCountry(criteria.region || 'UK'),
        remote,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        salaryCurrency: salary.salaryCurrency,
        description: description.slice(0, 4000),
        applyUrl: raw.hostedUrl || '',
        source: 'lever',
        atsType: 'lever',
        keywords: deriveKeywords(title, description),
        createdAt: new Date(),
        postedDate: raw.createdAt ? new Date(raw.createdAt) : undefined,
      };

      if (!matchesRegion(discovered.location, criteria.region || 'UK')) continue;
      if (criteria.remoteOnly === true && !remote) continue;
      if (!matchesKeywords(discovered, criteria.keywords || [])) continue;
      if (!discovered.applyUrl) continue;

      jobs.push(discovered);
    }

    return jobs;
  } catch (error: any) {
    console.warn(`[JobDiscovery] Failed to fetch Lever ${board.slug}:`, error.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

const fetchAshbyBoard = async (
  board: AshbyBoard,
  criteria: DiscoveryCriteria,
  ttlMs: number
): Promise<DiscoveredJob[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttlMs);

  try {
    const response = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${board.slug}?includeCompensation=true`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`[JobDiscovery] Ashby ${board.slug} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const rawJobs: any[] = data?.jobs || [];
    const jobs: DiscoveredJob[] = [];

    for (const raw of rawJobs) {
      const location = raw.locationName || raw.location || '';
      const remote = isRemoteLocation(location) || raw.isRemote === true;

      const description = stripHtml(raw.descriptionPlain || raw.description || '');
      const title = raw.title || '';

      let salaryMin: number | undefined;
      let salaryMax: number | undefined;
      let salaryCurrency: string | undefined;
      if (raw.compensation?.salaryRange?.min && raw.compensation?.salaryRange?.max) {
        salaryMin = raw.compensation.salaryRange.min;
        salaryMax = raw.compensation.salaryRange.max;
        salaryCurrency = raw.compensation.salaryRange.currency || 'USD';
      }

      if (!title || !board.company) continue;

      const discovered: DiscoveredJob = {
        _id: new ObjectId(),
        externalId: `discovery-ashby-${raw.id}`,
        title,
        company: board.company,
        location: location || 'Remote',
        country: regionToCountry(criteria.region || 'UK'),
        remote,
        salaryMin,
        salaryMax,
        salaryCurrency,
        description: description.slice(0, 4000),
        applyUrl: raw.url || `https://jobs.ashbyhq.com/${board.slug}`,
        source: 'ashby',
        atsType: 'ashby',
        keywords: deriveKeywords(title, description),
        createdAt: new Date(),
        postedDate: raw.publishedAt ? new Date(raw.publishedAt) : undefined,
      };

      if (!matchesRegion(discovered.location, criteria.region || 'UK')) continue;
      if (criteria.remoteOnly === true && !remote) continue;
      if (!matchesKeywords(discovered, criteria.keywords || [])) continue;
      if (!discovered.applyUrl) continue;

      jobs.push(discovered);
    }

    return jobs;
  } catch (error: any) {
    console.warn(`[JobDiscovery] Failed to fetch Ashby ${board.slug}:`, error.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

const fetchWorkableBoard = async (
  board: WorkableBoard,
  criteria: DiscoveryCriteria,
  ttlMs: number
): Promise<DiscoveredJob[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttlMs);

  try {
    const response = await fetch(
      `https://apply.workable.com/api/v1/widget/accounts/${board.slug}?details=true`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`[JobDiscovery] Workable ${board.slug} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const rawJobs: any[] = data?.jobs || [];
    const jobs: DiscoveredJob[] = [];

    for (const raw of rawJobs) {
      const location = raw.title || raw.region || '';
      const remote = isRemoteLocation(location) || raw.remote === true;

      const description = stripHtml(raw.descriptionPlain || raw.description || '');
      const title = raw.title || '';

      if (!title || !board.company) continue;

      const discovered: DiscoveredJob = {
        _id: new ObjectId(),
        externalId: `discovery-workable-${raw.code || raw.title}-${board.slug}`,
        title,
        company: board.company,
        location: location || 'Remote',
        country: regionToCountry(criteria.region || 'UK'),
        remote,
        description: description.slice(0, 4000),
        applyUrl: raw.url || `https://apply.workable.com/${board.slug}`,
        source: 'workable',
        atsType: 'workable',
        keywords: deriveKeywords(title, description),
        createdAt: new Date(),
      };

      if (!matchesRegion(discovered.location, criteria.region || 'UK')) continue;
      if (criteria.remoteOnly === true && !remote) continue;
      if (!matchesKeywords(discovered, criteria.keywords || [])) continue;
      if (!discovered.applyUrl) continue;

      jobs.push(discovered);
    }

    return jobs;
  } catch (error: any) {
    console.warn(`[JobDiscovery] Failed to fetch Workable ${board.slug}:`, error.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

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

// In-memory TTL cache for discovery results — avoids re-fetching external APIs on every page load.
// CRITICAL: Cache is user-isolated to prevent cross-user data leakage.
// Key format: discover:${userId}:${profileVersion}:${requestHash}
// TTL 5 minutes.
const discoveryCache = new Map<string, { data: DiscoveredJob[]; expiresAt: number }>();
const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Generate a user-isolated cache key for discovery results.
 * Same query + different user = different cache identity.
 * Same user + changed profile = different cache identity.
 */
function discoveryCacheKey(
  userId: string | undefined,
  profileVersion: number | undefined,
  criteria: DiscoveryCriteria
): string {
  // Build request identity from all inputs affecting personalized results
  const requestIdentity = {
    userId: userId || 'anonymous',
    profileVersion: profileVersion || 0,
    region: criteria.region || 'UK',
    keywords: (criteria.keywords || []).sort().join(','),
    remoteOnly: criteria.remoteOnly || false,
    limit: criteria.limit || 60,
    ingestLimit: criteria.ingestLimit || 60,
  };
  
  // Stable serialization for consistent cache keys
  const serialized = JSON.stringify(requestIdentity);
  
  // Simple hash for cache key (not cryptographic, but stable)
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `discover:${userId || 'anon'}:${profileVersion || 0}:${Math.abs(hash).toString(16)}`;
}

/**
 * Invalidate all discovery cache entries for a specific user.
 * Called when user's job search profile changes.
 */
export function invalidateDiscoveryCache(userId: string): void {
  const prefix = `discover:${userId}:`;
  const keysToDelete = Array.from(discoveryCache.keys())
    .filter(key => key.startsWith(prefix));
  keysToDelete.forEach(key => discoveryCache.delete(key));
  console.log(`[JobDiscovery] Invalidated ${keysToDelete.length} cache entries for user ${userId}`);
}

export class JobDiscoveryService {
  /**
   * Fetch jobs from free public sources and persist them into the global
   * `jobs` collection (deduped by externalId). Returns the stored documents.
   * 
   * CRITICAL: Uses user-isolated cache to prevent cross-user data leakage.
   * Cache key includes userId and profileVersion for proper isolation.
   */
  static async fetchAndStore(
    criteria: DiscoveryCriteria = {},
    userId?: string,
    profileVersion?: number
  ): Promise<DiscoveredJob[]> {
    const key = discoveryCacheKey(userId, profileVersion, criteria);
    const cached = discoveryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const region = criteria.region || 'UK';
    const perBoardTtl = 15000;
    const ingestLimit = criteria.ingestLimit || 60;

    const results = await Promise.all([
      ...GREENHOUSE_BOARDS.map((board) => fetchGreenhouseBoard(board, criteria, perBoardTtl)),
      ...LEVER_BOARDS.map((board) => fetchLeverBoard(board, criteria, perBoardTtl)),
      ...ASHBY_BOARDS.map((board) => fetchAshbyBoard(board, criteria, perBoardTtl)),
      ...WORKABLE_BOARDS.map((board) => fetchWorkableBoard(board, criteria, perBoardTtl)),
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

    const result = pool.map((job) => ({
      ...job,
      _id: (externalToId.get(job.externalId) as ObjectId) || job._id,
    }));

    // Cache the result so subsequent page loads within TTL don't re-fetch external APIs
    // Key includes userId and profileVersion for user isolation
    discoveryCache.set(key, { data: result, expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS });

    return result;
  }

  /**
   * Compute a match score for each discovered job for the given user.
   * Uses JobSearchProfile when available (persists job_matches and can
   * mark auto-apply eligibility); otherwise falls back to a lightweight
   * display heuristic so anonymous/onboarding users still see scores.
   * 
   * IMPORTANT: Now reads from canonical JobSearchProfile instead of legacy job_preferences.
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
          const { isFeatureFlagEnabledForUser, FEATURE_FLAGS } = await import('@/lib/feature-flags');
          const useNewStore = isFeatureFlagEnabledForUser(FEATURE_FLAGS.USE_JOB_SEARCH_PROFILE, userId);
          
          if (useNewStore) {
            const { JobSearchProfileService } = await import('./jobSearchProfileService');
            const { trackNewStoreRead, trackLegacyFallbackRead } = await import('@/lib/migration/migrationTelemetry');
            const profile = await JobSearchProfileService.getProfile(userId);
            
            if (profile) {
              preferences = {
                titles: profile.targetRoles,
                locations: profile.locations,
                country: 'UK',
                remoteOnly: profile.remoteOnly,
                salaryMin: profile.minSalary,
              } as JobPreferences;
              trackNewStoreRead('JobDiscoveryService', userId);
            } else {
              preferences = await db
                .collection<JobPreferences>('job_preferences')
                .findOne({ userId: new ObjectId(userId) });
              trackLegacyFallbackRead({
                service: 'JobDiscoveryService',
                userId,
                legacySource: 'job_preferences',
                reason: 'profile_not_found',
              });
            }
          } else {
            preferences = await db
              .collection<JobPreferences>('job_preferences')
              .findOne({ userId: new ObjectId(userId) });
          }
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
          } catch {
            const fallback = heuristicScore(job, preferences);
            scores.set(job.externalId, {
              score: fallback.score,
              breakdown: fallback.breakdown,
            });
          }
        })
      );
    } else {
      for (const job of discovered) {
        const fallback = heuristicScore(job, preferences);
        scores.set(job.externalId, { score: fallback.score, breakdown: fallback.breakdown });
      }
    }

    return scores;
  }
}

const heuristicScore = (
  job: DiscoveredJob,
  preferences: JobPreferences | null
): { score: number; breakdown: MatchBreakdown } => {
  let skillsScore = 50;
  let titleScore = 40;
  let locationScore = 40;
  let recencyScore = 40;

  // ── Title matching (flexible, role-family based) ──
  if (preferences?.titles?.length) {
    // Simple role-family check: see if any preferred title shares words with job title
    const normalizedJob = job.title.toLowerCase();
    const titleMatch = preferences.titles.some((t) => {
      const normalizedPref = t.toLowerCase();
      // Direct substring match
      if (normalizedJob.includes(normalizedPref) || normalizedPref.includes(normalizedJob)) return true;
      // Word overlap
      const prefWords = new Set(normalizedPref.split(/\s+/));
      const jobWords = normalizedJob.split(/\s+/);
      const overlap = jobWords.filter((w) => w.length > 2 && prefWords.has(w));
      return overlap.length > 0;
    });
    titleScore = titleMatch ? 85 : 35;
  } else {
    titleScore = 55;
  }

  // ── Skills matching (extract from job keywords + description) ──
  const jobKeywords = job.keywords || [];
  if (jobKeywords.length > 0) {
    const skillDensity = Math.min(1, jobKeywords.length / 15);
    skillsScore = Math.round(40 + skillDensity * 45);
  } else {
    skillsScore = 50;
  }

  // ── Location matching ──
  if (preferences) {
    const prefLocations = (preferences.locations || []).map((l) => l.toLowerCase());
    const jobLocation = job.location.toLowerCase();
    if (
      job.remote ||
      prefLocations.some((l) => jobLocation.includes(l) || l.includes('remote'))
    ) {
      locationScore = 85;
    } else {
      locationScore = 45;
    }
  } else {
    locationScore = 55;
  }

  // ── Recency scoring ──
  const daysSince = job.postedDate
    ? Math.floor((Date.now() - job.postedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  if (daysSince <= 3) { recencyScore = 95; }
  else if (daysSince <= 7) { recencyScore = 80; }
  else if (daysSince <= 14) { recencyScore = 60; }
  else { recencyScore = 35; }

  // ── Composite score ──
  const finalScore = Math.min(98, Math.max(15, Math.round(
    skillsScore * 0.4 +
    titleScore * 0.3 +
    locationScore * 0.2 +
    recencyScore * 0.1
  )));

  return {
    score: finalScore,
    breakdown: {
      skills: skillsScore,
      title: titleScore,
      location: locationScore,
      recency: recencyScore,
    },
  };
};

const formatSalary = (job: DiscoveredJob): string => {
  const parts: string[] = [];
  if (job.salaryMin) parts.push(job.salaryMin.toLocaleString());
  if (job.salaryMax) parts.push(job.salaryMax.toLocaleString());
  return parts.join(' - ') + (job.salaryCurrency ? ` ${job.salaryCurrency}` : '');
};