export const JOB_APPLICATION_SOURCES = [
  'extension',
  'manual',
  'import',
  'linkedin',
  'indeed',
  'naukri',
  'adzuna',
  'greenhouse',
  'lever',
  'ashby',
  'workable',
  'workday',
  'company-website',
  'referral',
  'discovery',
  'other',
] as const;

export type JobApplicationSource = (typeof JOB_APPLICATION_SOURCES)[number];

const SOURCE_ALIASES: Record<string, JobApplicationSource> = {
  web: 'manual',
  discover: 'discovery',
  google_talent: 'discovery',
  serpapi: 'discovery',
  apify: 'discovery',
  job_board: 'discovery',
  jobboard: 'discovery',
  'company_website': 'company-website',
  website: 'company-website',
};

export function sanitizeJobApplicationSource(value: unknown): JobApplicationSource {
  if (typeof value !== 'string' || !value.trim()) return 'other';
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  if ((JOB_APPLICATION_SOURCES as readonly string[]).includes(normalized)) {
    return normalized as JobApplicationSource;
  }
  return SOURCE_ALIASES[normalized] || 'other';
}

export function isJobApplicationSource(value: unknown): value is JobApplicationSource {
  return typeof value === 'string' && (JOB_APPLICATION_SOURCES as readonly string[]).includes(value);
}
