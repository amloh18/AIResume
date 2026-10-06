/**
 * Auto-Apply support — which job sources/ATS types the platform can submit
 * applications to automatically.
 *
 * Matches the ATS adapters in UnifiedApplyService:
 *  - Greenhouse, Lever, Ashby, Workable (direct API apply)
 *  - Naukri, Indeed (session-based apply)
 *
 * Adzuna / Workday / Unknown are not auto-apply supported (redirect/manual).
 */

export const AUTO_APPLY_SUPPORTED_ATS = [
  'greenhouse',
  'lever',
  'ashby',
  'workable',
  'naukri',
  'indeed',
] as const;

export type AutoApplySupportedAts = (typeof AUTO_APPLY_SUPPORTED_ATS)[number];

/**
 * ATS types that have a real Playwright handler in `UnifiedApplyService` and can therefore be
 * submitted to unattended.
 *
 * Deliberately narrower than `AUTO_APPLY_SUPPORTED_ATS`, and the difference is load-bearing:
 *
 *  - `naukri` / `indeed` are session-based 1-Click routes that deliberately record a truthful
 *    `saved` row instead of submitting (`server_bugs.md` §5). Letting the worker reach their
 *    handlers is what produced the "tracker says applied, nothing was sent" bug.
 *  - `workday` has **no** `case` in the `UnifiedApplyService.apply` switch. It used to be listed in
 *    the worker's gate anyway, so a Workday job cleared the gate and then fell through to
 *    `applyGeneric`, which returns "Review and submit on employer website" and never submits —
 *    a silent degradation with no signal anywhere (SB-04).
 *
 * Keep this list and the switch in `UnifiedApplyService.apply` in step: adding a name here without a
 * handler is what SB-04 was.
 */
export const PLAYWRIGHT_AUTOMATABLE_ATS = [
  'greenhouse',
  'lever',
  'ashby',
  'workable',
] as const;

export type PlaywrightAutomatableAts = (typeof PLAYWRIGHT_AUTOMATABLE_ATS)[number];

/**
 * Reduce whatever a caller has to hand down to a comparable lowercase token.
 *
 * Callers legitimately hold two different shapes:
 *   - an `atsType` string (`'greenhouse'`, or `null`);
 *   - a `source`, which is a plain string for the in-app ingestion sources **or** the
 *     `{ primary, applicationUrl, … }` object the `feashliaa` sync writes — an object in 86.7% of the
 *     corpus, even though `Job.ts` still declares the path as `String` (schema drift, see SB-20).
 *
 * Anything else yields `''`, so the exported predicates below are total and can never throw.
 */
function normalizeAtsInput(value: unknown): string {
  if (typeof value === 'string') return value.trim().toLowerCase();

  // Object-shaped `source`: use `primary`, the same field the DB-level filter matches on
  // (`'source.primary': { $in: … }` in discover/route.ts), so the two filters agree.
  if (value && typeof value === 'object') {
    const primary = (value as { primary?: unknown }).primary;
    if (typeof primary === 'string') return primary.trim().toLowerCase();
  }

  return '';
}

/**
 * Case-insensitive check whether an ATS/source value supports auto-apply.
 *
 * The parameter is typed `unknown` on purpose. It used to be `string | undefined | null`, but
 * `discover/route.ts` calls it as `isAutoApplySupported(job.atsType || job.source || '')` — and for
 * a `feashliaa` job `atsType` is `null` while `source` is an object, so the object went straight into
 * `.trim()` and threw a `TypeError` out of the request. A predicate that only answers a yes/no
 * question must not be able to fail the whole endpoint because a caller passed the wrong shape.
 */
export function isAutoApplySupported(value: unknown): boolean {
  const normalized = normalizeAtsInput(value);
  return normalized !== '' && (AUTO_APPLY_SUPPORTED_ATS as readonly string[]).includes(normalized);
}

/** Case-insensitive check whether an ATS type has an unattended Playwright handler. */
export function isPlaywrightAutomatable(value: unknown): boolean {
  const normalized = normalizeAtsInput(value);
  return normalized !== '' && (PLAYWRIGHT_AUTOMATABLE_ATS as readonly string[]).includes(normalized);
}

/**
 * ATS values `detectAtsFromUrl` can resolve. A subset of `ATSType`
 * (`@/types/automation-schema`) — this module deliberately does not import it, because the detection
 * result is only ever fed back through the API route's own validation.
 */
export type DetectedAts =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'workday'
  | 'naukri'
  | 'indeed'
  | 'adzuna';

/**
 * The URL of the form a job must actually be submitted at.
 *
 * Why this exists
 * ---------------
 * `detectAtsFromUrl()` is the authority on routing (SB-03) — but it can only be as good as the URL
 * it is handed, and two different fields describe that URL depending on which discovery source
 * produced the job:
 *
 *   - `applyUrl`               — set by the in-app ingestion sources (greenhouse, lever, ashby, …)
 *   - `source.applicationUrl`  — set by the `feashliaa` pre-aggregated sync
 *
 * Measured on production 2026-09-27: of the 42,338 `feashliaa` jobs (86.7% of the corpus),
 * **42,338 have `source.applicationUrl` and 0 have `applyUrl`.** So for the large majority of jobs
 * the only field carrying the form URL was one nothing read.
 *
 * Before this helper the fallback existed as a hand-written expression in exactly one place — the
 * saved-jobs filter in `discover/route.ts` — and was missing from every place that mattered. The
 * empty `applyUrl` was therefore forwarded to the client, posted back on enqueue, and resolved to
 * `'unknown'`, parking 42,338 jobs as "not automatable" no matter which ATS really hosted the form
 * (SB-20).
 *
 * Keep this the ONLY place that decides the order — it is the input to `detectAtsFromUrl()`.
 *
 * The parameter is `unknown` on purpose: `source` is declared `String` on the `Job` model but the
 * ingestion service stores an object there (schema drift — see SB-20), so callers legitimately hold
 * either shape and neither is worth a cast at every call site.
 *
 * @returns the apply URL, trimmed, or `''` when neither field carries one.
 */
export function resolveApplyUrl(job: unknown): string {
  if (!job || typeof job !== 'object') return '';

  const record = job as { applyUrl?: unknown; source?: unknown };

  const direct = typeof record.applyUrl === 'string' ? record.applyUrl.trim() : '';
  if (direct) return direct;

  const source = record.source;
  if (source && typeof source === 'object') {
    const fromSource = (source as { applicationUrl?: unknown }).applicationUrl;
    if (typeof fromSource === 'string') return fromSource.trim();
  }

  return '';
}

/**
 * Resolve the ATS that actually hosts the application form, from the apply URL.
 *
 * Why this exists
 * ---------------
 * `JobApplication.atsType` was written from where a job was **discovered** (`job.source.primary`,
 * `'adzuna'`, `'jobspy'`, …). The worker then reads that same field as the **submission target**
 * (`processApplication` → `isPlaywrightAutomatable`) and `unifiedApplyService` switches on it. The
 * two meanings are not the same thing: a job discovered through an aggregator whose `applyUrl` is an
 * ordinary Greenhouse board was parked as *"not automatable"* and could never auto-apply. Measured on
 * production 2026-09-27: 42,372 of 47,054 `jobs` carried `atsType: null`, and the single most common
 * park reason was `ATS type "unknown" is not automatable. Manual submission required.`
 *
 * Embed-aware on purpose
 * ----------------------
 * Many employers serve the real form from the ATS through a query parameter on their **own** domain —
 * `stripe.com/jobs/search?gh_jid=…`, `careers.airbnb.com/positions/…?gh_jid=…`,
 * `jobs.elastic.co/jobs?gh_jid=…`. Host-only matching misses all of them, so the ATS marker
 * parameters are checked too.
 *
 * @returns the detected ATS, or `null` when the URL identifies no known ATS. Callers should fall back
 * to the discovery source, then to `'unknown'`.
 */
export function detectAtsFromUrl(url?: string | null): DetectedAts | null {
  if (!url || typeof url !== 'string') return null;

  let host = '';
  let search = '';
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase();
    search = parsed.search.toLowerCase();
  } catch {
    // Not a parseable absolute URL — fall back to substring matching over the raw string.
    const lower = url.toLowerCase();
    host = lower;
    search = lower;
  }

  // ── Host-based: the ATS's own board ──────────────────────────────────────
  if (host.includes('greenhouse.io') || host.includes('grnh.se')) return 'greenhouse';
  if (host.includes('lever.co')) return 'lever';
  if (host.includes('ashbyhq.com')) return 'ashby';
  if (host.includes('workable.com')) return 'workable';
  if (host.includes('myworkdayjobs.com') || host.includes('myworkdaysite.com')) return 'workday';
  if (host.includes('naukri.com')) return 'naukri';
  if (host.includes('indeed.')) return 'indeed';
  if (host.includes('adzuna.')) return 'adzuna';

  // ── Embed-based: the ATS's form behind a company domain ──────────────────
  // `gh_jid` is Greenhouse's job id and is what `/embed/job_app?token=` accepts.
  if (/[?&]gh_jid=/.test(search)) return 'greenhouse';
  if (/[?&]ashby_jid=/.test(search)) return 'ashby';
  if (/[?&]lever-origins?=/.test(search)) return 'lever';

  return null;
}
