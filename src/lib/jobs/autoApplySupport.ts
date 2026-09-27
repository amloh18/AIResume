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

/** Case-insensitive check whether an ATS/source string supports auto-apply. */
export function isAutoApplySupported(atsType: string | undefined | null): boolean {
  if (!atsType) return false;
  const normalized = atsType.trim().toLowerCase();
  return (AUTO_APPLY_SUPPORTED_ATS as readonly string[]).includes(normalized);
}

/** Case-insensitive check whether an ATS type has an unattended Playwright handler. */
export function isPlaywrightAutomatable(atsType: string | undefined | null): boolean {
  if (!atsType) return false;
  const normalized = atsType.trim().toLowerCase();
  return (PLAYWRIGHT_AUTOMATABLE_ATS as readonly string[]).includes(normalized);
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
