/**
 * Server-side job context loader.
 *
 * ── Why this file exists ──────────────────────────────────────────────────────
 * `JobService` (src/lib/services/jobService.ts — deleted 2026-09-24) **was** a
 * **browser** HTTP client: every
 * one of its methods called `fetch('/api/...')` with a *relative* URL. Relative URLs
 * only resolve in a browser. In Node they throw immediately:
 *
 *     TypeError: Failed to parse URL from /api/jobs?userId=1
 *
 * Despite that, `JobService` was imported by seven server-side route handlers under
 * `src/app/api/ai/`, which called `JobService.getJob(jobId)` — passing only one
 * argument even though the signature is `getJob(jobId, userId?)` and the first
 * statement is `if (!userId) throw new Error('User ID is required to fetch job')`.
 *
 * The result was that `getJob` **always** threw, every call site caught the throw and
 * logged a warning, and `jobData` was therefore **always `null`**. Every "tailored to
 * this job" AI feature silently produced untailored output, and
 * `calculateJobTitleScore` returned its hard-coded neutral `{ score: 50 }` fallback.
 *
 * This module reads MongoDB directly instead of making an HTTP hop, and maps the
 * stored `JobApplication` onto the shape the AI services actually consume.
 *
 * ── The shape mismatch this adapter also fixes ────────────────────────────────
 * `AIAssistantService` reads `jobData.title`, `jobData.description` and
 * `jobData.company`. Those names came from the client-side `Job` DTO in
 * `src/lib/stores/jobStore.ts` (deleted 2026-09-24). Neither Mongo model uses them:
 *
 *   - `JobApplication` stores `jobTitle` / `jobDescription` / `company`
 *   - `Job` (deprecated) stores `jobTitle` / `jobDescription` / `company`
 *
 * So even a working fetch would have yielded `jobData.title === undefined`, which
 * makes `AIAssistantService` return the neutral 50 fallback (see
 * `calculateJobTitleScore`) and would throw at `jobData.title.toLowerCase()`
 * (line ~1016). The mapping below is therefore load-bearing, not cosmetic.
 */

import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import { JobApplication } from '@/models';
import type { JobPromptContext } from '@/types/job-prompt-context';

/**
 * Normalised job context handed to the AI services.
 *
 * Extends the shared `JobPromptContext` contract so the compiler enforces that
 * whatever this loader returns is acceptable to `AIAssistantService`. Field names
 * deliberately match the client-side `Job` DTO those services read from, NOT the
 * Mongo field names.
 */
export interface JobContext extends JobPromptContext {
  /** `_id` of the JobApplication, stringified. */
  id: string;
  /** Original catalog job id, when the application carries one. */
  jobId?: string;
  /** Maps from `JobApplication.jobTitle`. AI services require this to be non-empty. */
  title: string;
  /** Maps from `JobApplication.company`. */
  company: string;
  /** Maps from `jobDescription`, falling back to `jobDescriptionRaw`. */
  description: string;
  /**
   * Consumed only as `${jobData.requirements || ''}` in the AI prompts, so a
   * comma-joined string is what the prompts actually want. Kept as a string
   * (not an array) to avoid rendering `a,b` from an array's implicit toString.
   */
  requirements: string;
  location?: string;
  jobUrl?: string;
  atsType?: string;
  missingKeywords: string[];
  matchedSkills: string[];
}

/** Fields needed to build a JobContext; keeps the projection tight. */
const JOB_CONTEXT_FIELDS =
  'jobTitle company jobDescription jobDescriptionRaw jobId location jobUrl atsType missingKeywords matchedSkills';

/**
 * Map a stored `JobApplication` onto the `JobContext` the AI services consume.
 *
 * Exported and pure so it can be unit-tested without a database — the mapping is
 * load-bearing (the AI services read `title`, not `jobTitle`) and is exactly the
 * kind of thing that silently regresses.
 */
export function mapJobApplicationToContext(doc: Record<string, any>): JobContext {
  const description =
    (typeof doc.jobDescription === 'string' && doc.jobDescription.trim()) ||
    (typeof doc.jobDescriptionRaw === 'string' && doc.jobDescriptionRaw.trim()) ||
    '';

  const missingKeywords = Array.isArray(doc.missingKeywords) ? doc.missingKeywords : [];
  const matchedSkills = Array.isArray(doc.matchedSkills) ? doc.matchedSkills : [];

  return {
    id: String(doc._id),
    jobId: doc.jobId ? String(doc.jobId) : undefined,
    title: doc.jobTitle || '',
    company: doc.company || '',
    description,
    // The prompts interpolate this; keyword lists are the closest thing the
    // JobApplication model holds to "requirements".
    requirements: missingKeywords.join(', '),
    location: doc.location || undefined,
    jobUrl: doc.jobUrl || undefined,
    atsType: doc.atsType || undefined,
    missingKeywords,
    matchedSkills,
  };
}

/**
 * Load the job a user is tailoring against, for server-side AI route handlers.
 *
 * Returns `null` when the job cannot be found, so callers can degrade gracefully
 * exactly as they did before — the difference is that they now degrade from a
 * *successful* lookup rather than from an unconditional throw.
 *
 * @param jobId  Accepts a JobApplication `_id`, an `id`, or a catalog `jobId`.
 * @param userId When supplied, the lookup is scoped to that user. Pass the
 *               authenticated user where the route can resolve one, so a caller
 *               cannot read another user's job context by guessing an id.
 */
export async function loadJobContext(
  jobId?: string | null,
  userId?: string | null,
): Promise<JobContext | null> {
  if (!jobId) return null;

  try {
    await getConnection();

    // Accept an ObjectId, a string _id, or a catalog jobId — the client sends
    // `jobData?.id || jobData?._id || jobData?.jobId`, so all three occur.
    const or: Record<string, unknown>[] = [{ id: jobId }, { jobId }];
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      or.unshift({ _id: new mongoose.Types.ObjectId(jobId) });
    }

    const query: Record<string, unknown> = { $or: or };

    if (userId) {
      // Match however the document happens to have stored the owner: the schema
      // declares `userId` as Mixed, so both ObjectId and string forms exist in
      // the wild. Querying only one form silently misses the other.
      const ownerKeys: unknown[] = [userId];
      if (mongoose.Types.ObjectId.isValid(userId)) {
        ownerKeys.push(new mongoose.Types.ObjectId(userId));
      }
      query.userId = { $in: ownerKeys };
    }

    const doc = await JobApplication.findOne(query)
      .select(JOB_CONTEXT_FIELDS)
      .lean<Record<string, any> | null>();

    if (!doc) return null;

    return mapJobApplicationToContext(doc);
  } catch (error) {
    // Never let a lookup failure take down an AI route; the caller treats null
    // as "no job context" and proceeds with a general (untailored) result.
    console.error('[serverJobContext] Failed to load job context:', error);
    return null;
  }
}

export default loadJobContext;
