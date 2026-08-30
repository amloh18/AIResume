/**
 * WorkerSettings — MongoDB-backed configuration for ingestion workers.
 *
 * Single-document pattern: one document per settings namespace.
 * All ingestion workers read from DB instead of env vars or hardcoded values.
 * Changes take effect immediately without redeployment.
 *
 * API keys (ADZUNA_APP_ID, ADZUNA_APP_KEY) remain in env vars for security.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface LinkedInSettings {
  enabled: boolean;
  debug: boolean;
  dryRun: boolean;
  maxSearchesPerRun: number;
  maxPagesPerSearch: number;
  maxJobsPerSearch: number;
  maxRuntimeSeconds: number;
  regionStrategy: 'demand' | 'rotation';
  regions: string[];
  maxRegionsPerRun: number;
  defaultKeyword: string;
  browserProfileDir: string;
}

export interface AdzunaSettings {
  maxPagesPerRun: number;
  rateLimitMs: number;
}

export interface JobSpySettings {
  sites: string[];
  searchTerm: string;
  location: string;
  resultsWanted: number;
  hoursOld: number;
}

export interface SourceConfig {
  enabled: boolean;
  maxResults: number;
  maxDurationMs: number;
  refreshIntervalMs: number;
  cooldownMs: number;
}

export interface CompanyListSettings {
  greenhouse: Array<{ token: string; name: string }>;
  lever: string[];
  ashby: string[];
  workday: Array<{ tenant: string; site: string; name: string }>;
}

export interface IngestionSettings {
  linkedin: LinkedInSettings;
  adzuna: AdzunaSettings;
  jobspy: JobSpySettings;
  sources: Record<string, SourceConfig>;
  companies: CompanyListSettings;
  baselineEnabled: boolean;
  concurrency: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
}

export interface IWorkerSettings extends Document {
  namespace: string;
  settings: IngestionSettings;
  updatedAt: Date;
  updatedBy?: string;
}

const WorkerSettingsSchema = new Schema<IWorkerSettings>({
  namespace: {
    type: String,
    required: true,
    unique: true,
    default: 'ingestion',
    index: true,
  },
  settings: {
    type: Schema.Types.Mixed,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String,
  },
}, {
  timestamps: true,
});

// Ensure only one document per namespace
WorkerSettingsSchema.index({ namespace: 1 }, { unique: true });

export const WorkerSettings = (mongoose.models.WorkerSettings as mongoose.Model<IWorkerSettings>) ||
  mongoose.model<IWorkerSettings>('WorkerSettings', WorkerSettingsSchema);

// ── Default Settings ────────────────────────────────────────────────────────

export const DEFAULT_INGESTION_SETTINGS: IngestionSettings = {
  linkedin: {
    enabled: false,
    debug: false,
    dryRun: false,
    maxSearchesPerRun: 5,
    maxPagesPerSearch: 2,
    maxJobsPerSearch: 100,
    maxRuntimeSeconds: 600,
    regionStrategy: 'rotation',
    regions: ['US', 'CA', 'GB', 'IN', 'AU'],
    maxRegionsPerRun: 3,
    defaultKeyword: 'software engineer',
    browserProfileDir: '/var/lib/buildairesume/browser-profiles/linkedin',
  },
  adzuna: {
    maxPagesPerRun: 5,
    rateLimitMs: 1200,
  },
  jobspy: {
    sites: ['indeed', 'linkedin', 'zip_recruiter'],
    searchTerm: 'software engineer',
    location: 'United States',
    resultsWanted: 20,
    hoursOld: 72,
  },
  sources: {
    greenhouse: {
      enabled: true,
      maxResults: 500,
      maxDurationMs: 5 * 60 * 1000,
      refreshIntervalMs: 3 * 60 * 60 * 1000,
      cooldownMs: 600_000,
    },
    lever: {
      enabled: true,
      maxResults: 500,
      maxDurationMs: 5 * 60 * 1000,
      refreshIntervalMs: 3 * 60 * 60 * 1000,
      cooldownMs: 600_000,
    },
    ashby: {
      enabled: true,
      maxResults: 500,
      maxDurationMs: 5 * 60 * 1000,
      refreshIntervalMs: 3 * 60 * 60 * 1000,
      cooldownMs: 600_000,
    },
    workday: {
      enabled: true,
      maxResults: 200,
      maxDurationMs: 10 * 60 * 1000,
      refreshIntervalMs: 6 * 60 * 60 * 1000,
      cooldownMs: 600_000,
    },
    adzuna: {
      enabled: true,
      maxResults: 200,
      maxDurationMs: 10 * 60 * 1000,
      refreshIntervalMs: 6 * 60 * 60 * 1000,
      cooldownMs: 600_000,
    },
    jobspy: {
      enabled: true,
      maxResults: 200,
      maxDurationMs: 10 * 60 * 1000,
      refreshIntervalMs: 8 * 60 * 60 * 1000,
      cooldownMs: 600_000,
    },
    remotive: {
      enabled: true,
      maxResults: 250,
      maxDurationMs: 3 * 60 * 1000,
      refreshIntervalMs: 8 * 60 * 60 * 1000,
      cooldownMs: 3_600_000,
    },
    remoteok: {
      enabled: true,
      maxResults: 300,
      maxDurationMs: 3 * 60 * 1000,
      refreshIntervalMs: 8 * 60 * 60 * 1000,
      cooldownMs: 3_600_000,
    },
    linkedin: {
      enabled: false,
      maxResults: 500,
      maxDurationMs: 15 * 60 * 1000,
      refreshIntervalMs: 12 * 60 * 60 * 1000,
      cooldownMs: 3_600_000,
    },
  },
  companies: {
    greenhouse: [
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
    ],
    lever: [
      'netflix', 'notion', 'figma', 'spotify', 'posthog', 'linear',
      'vercel', 'supabase', 'resend', 'calcom', 'plausible', 'slack',
      'airtable', 'loom', 'webflow', 'intercom', 'zapier', 'asana',
      'retool', 'cashapp', 'square', 'discord', 'twitch', 'coinbase',
      'plaid', 'rippling', 'brex',
    ],
    ashby: [
      'notion', 'linear', 'posthog', 'vercel', 'supabase', 'resend',
      'calcom', 'plausible', 'raycast', 'loom', 'webflow', 'intercom',
    ],
    workday: [
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
    ],
  },
  baselineEnabled: true,
  concurrency: 2,
  retryMaxAttempts: 3,
  retryBaseDelayMs: 2000,
};

// ── Settings Loader ─────────────────────────────────────────────────────────
// Merges DB settings with defaults. Falls back to env vars for API keys.
// Cached in-memory with a TTL to avoid hammering MongoDB on every fetch.

let cachedSettings: IngestionSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function loadIngestionSettings(): Promise<IngestionSettings> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const doc = await WorkerSettings.findOne({ namespace: 'ingestion' }).lean();
    if (doc?.settings) {
      // Deep merge with defaults (DB values override defaults)
      cachedSettings = deepMerge(DEFAULT_INGESTION_SETTINGS, doc.settings as IngestionSettings);
      cacheTimestamp = now;
      console.log('[WorkerSettings] Loaded from DB, merged with defaults');
      return cachedSettings;
    } else {
      console.log('[WorkerSettings] No DB record found, using defaults');
    }
  } catch (err) {
    console.error('[WorkerSettings] Failed to load from DB, using defaults:', err);
  }

  // No DB record yet — use defaults, enriched with env vars for backward compat
  cachedSettings = applyEnvOverrides({ ...DEFAULT_INGESTION_SETTINGS });
  cacheTimestamp = now;
  return cachedSettings;
}

/**
 * Invalidate the in-memory cache so next loadIngestionSettings() fetches fresh.
 */
export function invalidateSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
  console.log('[WorkerSettings] Cache invalidated');
}

/**
 * Apply env var overrides for backward compatibility.
 * Only applies to settings that were previously controlled by env vars.
 * This ensures existing deployments keep working while new admin UI takes effect.
 */
function applyEnvOverrides(settings: IngestionSettings): IngestionSettings {
  // LinkedIn env overrides
  if (process.env.LINKEDIN_ENABLED) settings.linkedin.enabled = process.env.LINKEDIN_ENABLED === 'true';
  if (process.env.LINKEDIN_DEBUG) settings.linkedin.debug = process.env.LINKEDIN_DEBUG === 'true';
  if (process.env.LINKEDIN_DRY_RUN) settings.linkedin.dryRun = process.env.LINKEDIN_DRY_RUN === 'true';
  if (process.env.LINKEDIN_MAX_SEARCHES_PER_RUN) settings.linkedin.maxSearchesPerRun = parseInt(process.env.LINKEDIN_MAX_SEARCHES_PER_RUN, 10) || settings.linkedin.maxSearchesPerRun;
  if (process.env.LINKEDIN_MAX_PAGES_PER_SEARCH) settings.linkedin.maxPagesPerSearch = parseInt(process.env.LINKEDIN_MAX_PAGES_PER_SEARCH, 10) || settings.linkedin.maxPagesPerSearch;
  if (process.env.LINKEDIN_MAX_JOBS_PER_SEARCH) settings.linkedin.maxJobsPerSearch = parseInt(process.env.LINKEDIN_MAX_JOBS_PER_SEARCH, 10) || settings.linkedin.maxJobsPerSearch;
  if (process.env.LINKEDIN_MAX_RUNTIME_SECONDS) settings.linkedin.maxRuntimeSeconds = parseInt(process.env.LINKEDIN_MAX_RUNTIME_SECONDS, 10) || settings.linkedin.maxRuntimeSeconds;
  if (process.env.LINKEDIN_REGION_STRATEGY) settings.linkedin.regionStrategy = process.env.LINKEDIN_REGION_STRATEGY as any;
  if (process.env.LINKEDIN_REGIONS) settings.linkedin.regions = process.env.LINKEDIN_REGIONS.split(',').map(r => r.trim()).filter(Boolean);
  if (process.env.LINKEDIN_MAX_REGIONS_PER_RUN) settings.linkedin.maxRegionsPerRun = parseInt(process.env.LINKEDIN_MAX_REGIONS_PER_RUN, 10) || settings.linkedin.maxRegionsPerRun;
  if (process.env.LINKEDIN_DEFAULT_KEYWORD) settings.linkedin.defaultKeyword = process.env.LINKEDIN_DEFAULT_KEYWORD;
  if (process.env.LINKEDIN_BROWSER_PROFILE_DIR) settings.linkedin.browserProfileDir = process.env.LINKEDIN_BROWSER_PROFILE_DIR;

  // Adzuna env overrides
  if (process.env.ADZUNA_MAX_PAGES_PER_RUN) settings.adzuna.maxPagesPerRun = parseInt(process.env.ADZUNA_MAX_PAGES_PER_RUN, 10) || settings.adzuna.maxPagesPerRun;
  if (process.env.ADZUNA_RATE_LIMIT_MS) settings.adzuna.rateLimitMs = parseInt(process.env.ADZUNA_RATE_LIMIT_MS, 10) || settings.adzuna.rateLimitMs;

  return settings;
}

/**
 * Deep merge two objects. Source values override target values.
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
      targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)
    ) {
      (result as any)[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      (result as any)[key] = sourceVal;
    }
  }
  return result;
}
