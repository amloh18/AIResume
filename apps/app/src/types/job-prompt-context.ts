/**
 * The job-context contract shared between the AI services and their callers.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 * `AIAssistantService` used to type its `jobData` parameter as `Job` from
 * `@/lib/stores/jobStore` — a **client-side store DTO**. That made a server-side
 * AI service structurally dependent on a browser store type, and it is the reason
 * a server route could not hand it a job loaded from MongoDB: the Mongoose models
 * store `jobTitle` / `jobDescription`, while the DTO declares `title` /
 * `description` / `responsibilities` / `skills` / `type` / `remote`.
 *
 * The type below is the honest contract: exactly the fields `AIAssistantService`
 * reads, and nothing else. Verified by enumerating every `jobData.<field>` access
 * in that file — `company`, `description`, `id`, `jobDescription`, `jobTitle`,
 * `requirements`, `title`.
 *
 * Because it is a structural subset, both existing callers keep working:
 *   - the browser passes its `Job` DTO (which has all of these, plus more);
 *   - the server passes `JobContext` from `@/lib/jobs/serverJobContext`.
 *
 * `title` is deliberately required. The service treats a missing title as "no job
 * context" and silently returns a neutral score of 50 from
 * `calculateJobTitleScore`, so requiring it keeps that degradation visible at the
 * type level rather than at runtime.
 */
export interface JobPromptContext {
  /** Stable identifier; used for cache keys. */
  id?: string;
  /**
   * Target job title. REQUIRED: the AI services key their prompts and their
   * title-match scoring off this, and silently degrade to a neutral score
   * without it.
   */
  title: string;
  /** Mongoose field name; accepted as a fallback spelling of `title`. */
  jobTitle?: string;
  company?: string;
  /** Client DTO spelling. */
  description?: string;
  /** Mongoose field name; accepted as a fallback spelling of `description`. */
  jobDescription?: string;
  /**
   * Interpolated into prompts as `${jobData.requirements || ''}`, so a
   * comma-joined string is what the prompts want.
   */
  requirements?: string;
}
