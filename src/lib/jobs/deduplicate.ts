import mongoose from 'mongoose';
import JobApplication, { type IJobApplication } from '@/models/JobApplication';

/**
 * Normalizes a job title for dedup comparison.
 * Lowercases, collapses whitespace, trims.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes a company name for dedup comparison.
 * Lowercases, trims, removes common suffixes.
 */
function normalizeCompany(company: string): string {
  return company
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|co\.?|company|plc|gmbh|s\.?a\.?|s\.?p\.?a\.?)\s*$/i, '');
}

/**
 * Normalizes a URL for dedup comparison.
 * Strips common tracking params, trailing slashes, fragments.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip tracking params
    const stripParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'fbclid', 'gclid'];
    stripParams.forEach(p => u.searchParams.delete(p));
    // Strip trailing slash, lowercase host
    return u.hostname.toLowerCase() + u.pathname.replace(/\/+$/, '') + u.search;
  } catch {
    return url.toLowerCase().trim();
  }
}

export interface DedupResult {
  isDuplicate: boolean;
  existingJob?: IJobApplication;
  matchType?: 'title_company' | 'url';
}

/**
 * Checks if a job is a duplicate for a given user.
 * Uses normalized (title + company) as primary key.
 * Falls back to URL match if title/company don't match but URL does.
 */
export async function checkForDuplicate(
  userId: string | mongoose.Types.ObjectId,
  jobTitle: string,
  company: string,
  jobUrl?: string
): Promise<DedupResult> {
  const normalizedTitle = normalizeTitle(jobTitle);
  const normalizedCompany = normalizeCompany(company);

  // 1. Primary dedup: normalized title + company for this user
  const existingByTitleCompany = await JobApplication.findOne({
    userId,
    jobTitle: { $regex: new RegExp(`^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    company: { $regex: new RegExp(`^${normalizedCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  }).select('_id jobTitle company jobUrl source status updatedAt');

  if (existingByTitleCompany) {
    return {
      isDuplicate: true,
      existingJob: existingByTitleCompany,
      matchType: 'title_company',
    };
  }

  // 2. Secondary dedup: URL match (if URL provided and non-empty)
  if (jobUrl && jobUrl.trim()) {
    const normalizedInputUrl = normalizeUrl(jobUrl);
    // Find any job for this user with a matching normalized URL
    const allJobs = await JobApplication.find({
      userId,
      jobUrl: { $exists: true, $ne: '' },
    }).select('_id jobUrl jobTitle company');

    for (const job of allJobs) {
      if (job.jobUrl && normalizeUrl(job.jobUrl) === normalizedInputUrl) {
        return {
          isDuplicate: true,
          existingJob: job,
          matchType: 'url',
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Dedup-aware job creation. Returns the existing job if duplicate,
 * or creates and returns a new job if not.
 */
export async function findOrCreateJob(
  userId: string | mongoose.Types.ObjectId,
  jobData: {
    jobTitle: string;
    company: string;
    jobUrl?: string;
    [key: string]: any;
  }
): Promise<{ job: IJobApplication; created: boolean; duplicateOf?: string }> {
  const dedup = await checkForDuplicate(userId, jobData.jobTitle, jobData.company, jobData.jobUrl);

  if (dedup.isDuplicate && dedup.existingJob) {
    return {
      job: dedup.existingJob,
      created: false,
      duplicateOf: dedup.existingJob._id.toString(),
    };
  }

  const newJob = await JobApplication.create({
    userId,
    ...jobData,
  });

  return { job: newJob, created: true };
}

export { normalizeTitle, normalizeCompany, normalizeUrl };
