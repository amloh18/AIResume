/**
 * Public (unauthenticated) job projection + query validation.
 *
 * ## Why this module exists
 *
 * Job discovery is public; personalization and application management are not.
 * The existing `/api/jobs/discover` handler is auth-*optional* and returns raw
 * `jobs` documents (plus per-user match fields when a session is present). Serving
 * that payload to an anonymous visitor would leak ingestion metadata and — worse —
 * make it possible for a caching layer to hand one user's personalized response to
 * another.
 *
 * So the public surface gets its own explicit projection and its own query
 * parser. Two rules govern everything here:
 *
 *   1. **Allowlist, never denylist.** A field reaches the public response only if
 *      it is named in the projection below. Adding a field to the `jobs` document
 *      can therefore never silently make it public.
 *   2. **Validate then normalize.** Every query parameter is bounded (page size,
 *      sort key, date window) and regex input is escaped, so an anonymous caller
 *      cannot drive an unbounded scan or a ReDoS.
 *
 * This file is deliberately dependency-light (no mongoose, no Next) so it can be
 * unit-tested directly and imported from both the API routes and the pages.
 */

/** Hard ceiling on page size — protects the public search endpoint from scrape amplification. */
export const PUBLIC_JOBS_MAX_PAGE_SIZE = 50;
export const PUBLIC_JOBS_DEFAULT_PAGE_SIZE = 20;

/** Statuses that count as "open for application" in the public catalog. */
export const PUBLIC_OPEN_STATUSES = ['active', 'new'] as const;

/** Employment types we accept as a filter value (normalized, lower-case). */
const EMPLOYMENT_TYPES = new Set([
  'full_time',
  'full-time',
  'part_time',
  'part-time',
  'contract',
  'temporary',
  'internship',
  'freelance',
  'permanent',
]);

/** Workplace arrangements we accept. */
const WORKPLACE_TYPES = new Set(['remote', 'hybrid', 'onsite', 'on-site', 'on_site']);

/** Posting-date windows → milliseconds. */
const DATE_WINDOWS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/** Sort keys the public endpoint will honour. Anything else falls back to `recent`. */
export type PublicJobSort = 'recent' | 'oldest' | 'salary' | 'title';

const SORT_MAP: Record<PublicJobSort, Record<string, 1 | -1>> = {
  recent: { postedAt: -1, firstSeenAt: -1 },
  oldest: { postedAt: 1 },
  salary: { 'salary.max': -1, postedAt: -1 },
  title: { title: 1 },
};

/**
 * Only the fields an anonymous visitor is allowed to see.
 *
 * `_id` is projected because it is the join key back to the canonical record, but
 * it is renamed to `id` on the way out (never exposed as `_id`, which reads as an
 * internal identifier). Everything user-scoped — `userId`, saved relationships,
 * application rows, match scores — is simply absent, which is the point.
 */
export const PUBLIC_JOB_PROJECTION: Record<string, 1> = {
  _id: 1,
  canonicalId: 1,
  title: 1,
  company: 1,
  location: 1,
  department: 1,
  category: 1,
  employmentType: 1,
  experience: 1,
  seniority: 1,
  salary: 1,
  skills: 1,
  industry: 1,
  status: 1,
  postedAt: 1,
  firstSeenAt: 1,
  lastSeenAt: 1,
  lastVerifiedAt: 1,
  expiresAt: 1,
  atsType: 1,
  remote: 1,
  country: 1,
  applyUrl: 1,
  postedDate: 1,
  description: 1,
  descriptionText: 1,
  source: 1,
};

export interface PublicJobCompany {
  name: string;
  logoUrl?: string;
  domain?: string;
}

export interface PublicJobLocation {
  label: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  remote: boolean;
  workplaceType?: string;
}

export interface PublicJobSalary {
  min?: number;
  max?: number;
  currency?: string;
  period?: string;
}

export interface PublicJobSummary {
  id: string;
  canonicalId: string;
  /**
   * Readable, URL-safe public identifier — the segment in `/explore/jobs/<slug>`.
   * Derived from title + company + a prefix of `canonicalId`; see `buildJobSlug`.
   */
  slug: string;
  title: string;
  company: PublicJobCompany;
  location: PublicJobLocation;
  employmentType?: string;
  salary?: PublicJobSalary;
  skills: string[];
  postedDate?: string;
  status: string;
  /** False when the listing is closed/expired — the card must not invite an application. */
  openForApplication: boolean;
  atsType?: string;
  source?: { name?: string; url?: string };
  /** Public employer application URL, when one exists. */
  applyUrl?: string;
}

export interface PublicJobDetail extends PublicJobSummary {
  description: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  requirements: string[];
  experience?: { minYears?: number | null; maxYears?: number | null; level?: string };
  department?: string;
  category?: string;
  industry?: string;
  seniority?: string;
  expiresAt?: string;
  lastVerifiedAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a user-supplied string before it is used as a MongoDB `$regex`.
 *
 * Without this, a search for `((((` throws and a crafted pattern can pin a CPU.
 * The existing discover route interpolates the raw query into `$regex`, so this
 * is a deliberate hardening of the new public path only.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Collapse HTML to readable plain text without pulling in a DOM parser. */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// ---------------------------------------------------------------------------
// Readable public slug
// ---------------------------------------------------------------------------

/**
 * How many characters of `canonicalId` are appended to a slug.
 *
 * The suffix is the *stable* half of the slug: a pure prefix of the content hash,
 * so it cannot change while the listing stays the same listing. 8 hex characters
 * is 32 bits — the birthday bound for a collision sits around 77k listings, and a
 * collision is not a correctness problem anyway, because every lookup re-derives
 * the full slug and compares (see `findPublicJobByIdentifier`).
 */
export const JOB_SLUG_SUFFIX_LENGTH = 8;

/** Cap on the readable part, so a 120-character job title cannot make a 120-character URL. */
const JOB_SLUG_WORDS_MAX = 72;

/** The suffix must be exactly this shape — generated by `jobSlugSuffix`. */
const JOB_SLUG_SUFFIX = /^[a-z0-9]{8}$/;

/**
 * Lower-case, ASCII-only, dash-separated form of one slug segment.
 *
 * Accents are folded (`Zürich` → `zurich`) rather than transliterated, `&`
 * becomes `and`, and every other run of punctuation/whitespace collapses to a
 * single dash — so the result is always safe as a path segment with no escaping.
 */
function slugifySegment(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** The stable anchor of a slug — a prefix of `canonicalId`, falling back to `_id`. */
function jobSlugSuffix(raw: any): string {
  const canonicalId = str(raw?.canonicalId) || String(raw?._id ?? '');
  return canonicalId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, JOB_SLUG_SUFFIX_LENGTH)
    .padEnd(JOB_SLUG_SUFFIX_LENGTH, '0');
}

/**
 * The public, human-readable URL segment for a job.
 *
 * `Senior Product Designer` at `Linear` → `senior-product-designer-linear-4f2a1b3c`.
 *
 * ⚠️ **Derived, never stored.** There is deliberately no `slug` column, no slug
 * index and no backfill, for three reasons:
 *
 *   1. Every listing that already exists gets a readable URL immediately — there
 *      is nothing to migrate and no window where old rows 404.
 *   2. `jobs_canonicalId` is intentionally **non-unique** (concurrent upserts of
 *      the same `canonicalId` race, and a unique index turns that race into
 *      E11000 — see `ensureIndexes` in the ingestion engine). A unique slug index
 *      would re-introduce on the write path exactly the hazard that design avoids.
 *   3. A derived slug can never drift out of sync with the listing it names.
 *
 * The trade-off is stability: the slug is as stable as `canonicalId`, which is
 * what public URLs used before this existed. A cosmetic edit that leaves
 * `canonicalId` alone is still resolvable via the single-candidate fallback in
 * `findPublicJobByIdentifier`, and any URL that is not already the canonical slug
 * is permanently redirected to it, so search engines only ever index one URL.
 */
export function buildJobSlug(raw: {
  title?: unknown;
  company?: { name?: unknown } | null;
  canonicalId?: unknown;
  _id?: unknown;
}): string {
  const suffix = jobSlugSuffix(raw);
  const words = [slugifySegment(str(raw?.title) || ''), slugifySegment(str(raw?.company?.name) || '')]
    .filter(Boolean)
    .join('-')
    .slice(0, JOB_SLUG_WORDS_MAX)
    .replace(/-+$/, '');
  return words ? `${words}-${suffix}` : `job-${suffix}`;
}

/**
 * Recover the hex anchor from a URL segment, or `null` when it is not slug-shaped.
 *
 * Only the *trailing* hex block counts, and it must be preceded by a dash or the
 * start of the segment. That is what stops a legacy 64-character `canonicalId` —
 * or a 24-character ObjectId — from being read as a slug: neither has a `-` before
 * its last 8 characters.
 */
export function parseJobSlugSuffix(segment: string): string | null {
  const value = (segment || '').trim().toLowerCase();
  if (!value || value.length > 200) return null;
  const match = /(?:^|-)([a-z0-9]{8})$/.exec(value);
  return match && JOB_SLUG_SUFFIX.test(match[1]) ? match[1] : null;
}

/** Turn a `description` (HTML) or `descriptionText` into bullet lists + body. */
function extractDescriptionSections(raw: any): {
  description: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  requirements: string[];
} {
  const html = str(raw?.description) || '';
  const text = htmlToPlainText(str(raw?.descriptionText) || html);

  // Prefer explicit arrays when ingestion stored them.
  const asArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((x) => htmlToPlainText(String(x))).filter(Boolean)
      : [];

  let responsibilities = asArray(raw?.responsibilities);
  let requiredQualifications = asArray(raw?.requiredQualifications) || asArray(raw?.qualifications);
  let preferredQualifications = asArray(raw?.preferredQualifications);
  let requirements = asArray(raw?.requirements);

  if (!responsibilities.length && !requiredQualifications.length && text) {
    // Heuristic split on common section headers. The plain text is always
    // returned in full as `description`, so a failed split loses nothing.
    const lines = text.split('\n').map((l) => l.trim());
    let bucket: 'none' | 'resp' | 'req' | 'pref' = 'none';
    const resp: string[] = [];
    const req: string[] = [];
    const pref: string[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase().replace(/[:\s]+$/, '');
      if (/^(responsibilities|what you.?ll do|the role|duties)/.test(lower)) {
        bucket = 'resp';
        continue;
      }
      if (/^(requirements|required qualifications|qualifications|must have|what we.?re looking for)/.test(lower)) {
        bucket = 'req';
        continue;
      }
      if (/^(preferred|nice to have|bonus|preferred qualifications)/.test(lower)) {
        bucket = 'pref';
        continue;
      }
      const bullet = line.replace(/^[•\-*\u2022]\s*/, '').trim();
      if (bullet.length < 3 || bullet.length > 400) continue;
      if (bucket === 'resp') resp.push(bullet);
      else if (bucket === 'req') req.push(bullet);
      else if (bucket === 'pref') pref.push(bullet);
    }
    if (resp.length) responsibilities = resp.slice(0, 20);
    if (req.length) requiredQualifications = req.slice(0, 20);
    if (pref.length) preferredQualifications = pref.slice(0, 20);
  }

  if (!requirements.length) {
    requirements = [...requiredQualifications, ...preferredQualifications].slice(0, 20);
  }

  return {
    description: text,
    responsibilities,
    requiredQualifications,
    preferredQualifications,
    requirements,
  };
}

function buildLocation(raw: any): PublicJobLocation {
  const loc = raw?.location;
  const remote = Boolean(loc?.remote) || raw?.remote === true;
  let workplaceType = str(loc?.remoteType) || str(loc?.workplaceType);
  if (!workplaceType) workplaceType = remote ? 'remote' : undefined;

  const city = str(loc?.city);
  const state = str(loc?.state);
  const country = str(loc?.country);
  const parts = [city, state, country].filter(Boolean) as string[];
  const label = parts.length ? parts.join(', ') : remote ? 'Remote' : str(raw?.country) || 'Location not specified';

  return {
    label,
    city,
    state,
    country,
    countryCode: str(loc?.countryCode),
    remote,
    workplaceType,
  };
}

function buildSalary(raw: any): PublicJobSalary | undefined {
  const salary = raw?.salary;
  if (!salary || typeof salary !== 'object') return undefined;
  const min = num(salary.min);
  const max = num(salary.max);
  if (min === undefined && max === undefined) return undefined;
  return {
    min,
    max,
    currency: str(salary.currency),
    period: str(salary.period),
  };
}

function isOpen(status: string | undefined): boolean {
  if (!status) return true; // legacy rows predate the status field
  return (PUBLIC_OPEN_STATUSES as readonly string[]).includes(status);
}

/** Map a raw `jobs` document into the public summary shape. */
export function toPublicJobSummary(raw: any): PublicJobSummary {
  const canonicalId = str(raw?.canonicalId) || String(raw?._id || '');
  const status = str(raw?.status) || 'active';
  const sourcePrimary = str(raw?.source?.primary);
  const applyUrl = str(raw?.applyUrl) || str(raw?.source?.applicationUrl) || str(raw?.source?.sourceUrl);
  const title = str(raw?.title) || 'Untitled role';
  const companyName = str(raw?.company?.name) || 'Confidential';

  return {
    id: String(raw?._id || canonicalId),
    canonicalId,
    slug: buildJobSlug(raw),
    title,
    company: {
      name: companyName,
      logoUrl: str(raw?.company?.logoUrl),
      domain: str(raw?.company?.domain),
    },
    location: buildLocation(raw),
    employmentType: str(raw?.employmentType),
    salary: buildSalary(raw),
    skills: Array.isArray(raw?.skills) ? raw.skills.map(String).filter(Boolean).slice(0, 24) : [],
    postedDate: iso(raw?.postedAt) || iso(raw?.postedDate) || iso(raw?.firstSeenAt),
    status,
    openForApplication: isOpen(status),
    atsType: str(raw?.atsType) || sourcePrimary,
    source: sourcePrimary
      ? { name: sourcePrimary, url: str(raw?.source?.sourceUrl) }
      : undefined,
    applyUrl,
  };
}

/** Map a raw `jobs` document into the full public detail shape. */
export function toPublicJobDetail(raw: any): PublicJobDetail {
  const summary = toPublicJobSummary(raw);
  const sections = extractDescriptionSections(raw);

  return {
    ...summary,
    description: sections.description,
    responsibilities: sections.responsibilities,
    requiredQualifications: sections.requiredQualifications,
    preferredQualifications: sections.preferredQualifications,
    requirements: sections.requirements,
    experience: raw?.experience
      ? {
          minYears: raw.experience.minYears ?? null,
          maxYears: raw.experience.maxYears ?? null,
          level: str(raw.experience.level),
        }
      : undefined,
    department: str(raw?.department),
    category: str(raw?.category),
    industry: str(raw?.industry),
    seniority: str(raw?.seniority),
    expiresAt: iso(raw?.expiresAt),
    lastVerifiedAt: iso(raw?.lastVerifiedAt),
  };
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

export interface ParsedPublicJobQuery {
  /** MongoDB filter for the `jobs` collection (status-scoped, escaped). */
  filter: Record<string, any>;
  sort: Record<string, 1 | -1>;
  page: number;
  pageSize: number;
  skip: number;
  /** Echoed back for cache keys / debugging; never trusted downstream. */
  normalized: {
    q?: string;
    location?: string;
    workplaceType?: string;
    experienceLevel?: string;
    employmentType?: string;
    datePosted?: string;
    source?: string;
    sort: PublicJobSort;
  };
}

const UUIDISH = /^[a-f0-9]{16,64}$/i;

/**
 * Parse and bound the public search query.
 *
 * Never throws: an unparseable value is dropped rather than 400'd, because a
 * shared link with a stale filter should still render results.
 */
export function parsePublicJobQuery(searchParams: URLSearchParams): ParsedPublicJobQuery {
  const page = Math.max(1, Math.floor(num(searchParams.get('page')) ?? 1));
  const rawPageSize = Math.floor(num(searchParams.get('pageSize') ?? searchParams.get('limit')) ?? PUBLIC_JOBS_DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(PUBLIC_JOBS_MAX_PAGE_SIZE, Math.max(1, rawPageSize));

  const q = str(searchParams.get('q') || searchParams.get('search') || '')?.slice(0, 200);
  const location = str(searchParams.get('location'))?.slice(0, 120);
  const rawWorkplace = str(searchParams.get('workplaceType') || searchParams.get('remote'));
  const experienceLevel = str(searchParams.get('experienceLevel') || searchParams.get('experience'));
  const rawEmployment = str(searchParams.get('employmentType') || searchParams.get('jobType'));
  const datePosted = str(searchParams.get('datePosted') || searchParams.get('postedWithin'));
  const source = str(searchParams.get('source') || searchParams.get('atsType'))?.toLowerCase();
  const sortRaw = str(searchParams.get('sort') || searchParams.get('sortBy')) || 'recent';

  const sort: PublicJobSort =
    sortRaw === 'oldest' || sortRaw === 'salary' || sortRaw === 'title' ? sortRaw : 'recent';

  const and: Record<string, any>[] = [{ status: { $in: [...PUBLIC_OPEN_STATUSES] } }];

  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    and.push({
      $or: [
        { title: rx },
        { 'company.name': rx },
        { skills: rx },
        { descriptionText: rx },
      ],
    });
  }

  if (location) {
    const rx = { $regex: escapeRegex(location), $options: 'i' };
    and.push({
      $or: [
        { 'location.city': rx },
        { 'location.country': rx },
        { 'location.state': rx },
      ],
    });
  }

  let workplaceType: string | undefined;
  if (rawWorkplace) {
    const normalized = rawWorkplace.toLowerCase();
    if (normalized === 'remote' || normalized === 'true') {
      and.push({ $or: [{ 'location.remote': true }, { remote: true }, { 'location.remoteType': /remote/i }] });
      workplaceType = 'remote';
    } else if (normalized === 'hybrid') {
      and.push({ 'location.remoteType': /hybrid/i });
      workplaceType = 'hybrid';
    } else if (normalized === 'onsite' || normalized === 'on-site' || normalized === 'on_site') {
      and.push({
        $and: [
          { $or: [{ 'location.remote': { $ne: true } }, { 'location.remote': { $exists: false } }] },
          { $or: [{ 'location.remoteType': { $not: /hybrid/i } }, { 'location.remoteType': { $exists: false } }] },
        ],
      });
      workplaceType = 'onsite';
    }
  }

  if (experienceLevel) {
    and.push({ 'experience.level': experienceLevel.toLowerCase() });
  }

  if (rawEmployment) {
    const normalized = rawEmployment.toLowerCase().replace(/\s+/g, '_');
    if (EMPLOYMENT_TYPES.has(normalized)) {
      and.push({
        $or: [
          { employmentType: new RegExp(`^${escapeRegex(normalized.replace(/_/g, '[-_ ]?'))}$`, 'i') },
          { employmentType: rawEmployment },
        ],
      });
    }
  }

  if (datePosted && DATE_WINDOWS[datePosted]) {
    const since = new Date(Date.now() - DATE_WINDOWS[datePosted]);
    and.push({ $or: [{ postedAt: { $gte: since } }, { postedDate: { $gte: since } }] });
  }

  if (source) {
    and.push({
      $or: [{ atsType: source }, { 'source.primary': source }],
    });
  }

  return {
    filter: and.length === 1 ? and[0] : { $and: and },
    sort: SORT_MAP[sort],
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    normalized: { q, location, workplaceType, experienceLevel, employmentType: rawEmployment, datePosted, source, sort },
  };
}

/** True when the string could be a canonical id (used to accept both id shapes in the URL). */
export function looksLikeCanonicalId(value: string): boolean {
  return UUIDISH.test(value);
}

/** Minimal shape of the public list response — kept here so routes and tests agree. */
export interface PublicJobsListResponse {
  success: true;
  jobs: PublicJobSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface PublicJobDetailResponse {
  success: true;
  job: PublicJobDetail;
}

export interface PublicJobsErrorResponse {
  success: false;
  error: string;
}
