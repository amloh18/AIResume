/**
 * Resolve a public job URL segment to a `jobs` document.
 *
 * ## Why this is its own module
 *
 * Three shapes of identifier can appear in `/explore/jobs/<segment>`, and they
 * must resolve identically everywhere:
 *
 *   1. **the readable slug** — `senior-product-designer-linear-4f2a1b3c` (current)
 *   2. **the sha256 `canonicalId`** — 64 hex characters (what every link used
 *      before slugs existed, and still what the authenticated handoff carries)
 *   3. **the raw Mongo `_id`** — a 24-character ObjectId (the oldest deep links)
 *
 * The page, the public detail API and the sitemap all need the same answer, and
 * a second copy of this logic is how the three drift apart — so the lookup lives
 * here, once, and both resolvers call it.
 *
 * ## How a slug resolves without a stored column
 *
 * `buildJobSlug` appends a prefix of `canonicalId` as the slug's trailing block,
 * which makes the slug *reverse-searchable*: take that block, prefix-scan the
 * `jobs_canonicalId` index, then re-derive the full slug of each candidate and
 * compare. The scan is index-backed (`^`-anchored, case-sensitive, no `i` flag)
 * and bounded, and the comparison — not the scan — is what decides, so a prefix
 * collision can never resolve to the wrong job.
 *
 * ⚠️ Nothing here trusts the segment. The suffix is validated as `[a-z0-9]{8}`
 * before it reaches a `$regex`, so no caller-supplied pattern is ever compiled.
 */

import { ObjectId, type Db } from 'mongodb';
import {
  PUBLIC_JOB_PROJECTION,
  buildJobSlug,
  parseJobSlugSuffix,
} from './publicJobView';

/** Hard cap on the segment we will even look at — slugs are ~90 chars, hashes 64. */
export const MAX_JOB_IDENTIFIER_LENGTH = 200;

/**
 * Upper bound on candidates a single slug prefix may pull back.
 *
 * A full collision of the 32-bit anchor needs ~77k listings, so in practice this
 * returns 1. The cap exists so a pathological prefix cannot turn one request into
 * an unbounded scan.
 */
const MAX_SLUG_CANDIDATES = 20;

/** ObjectId strings only — `ObjectId.isValid` alone also accepts any 12-char string. */
const OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

export interface PublicJobLookup {
  /** The projected `jobs` document — feed it to `toPublicJobDetail` / `toPublicJobSummary`. */
  raw: any;
  /** The canonical readable slug for this job — the URL every link should use. */
  slug: string;
  /**
   * True when the requested segment was NOT already the canonical slug, so the
   * caller should permanently redirect to `/explore/jobs/${slug}`. Legacy hash
   * URLs and ObjectId URLs are redirected; a slug URL never is (which is what
   * keeps the redirect from looping).
   */
  needsRedirect: boolean;
}

/**
 * Find the job a public URL segment names, or `null` when nothing matches.
 *
 * Never throws for a bad segment — an unresolvable identifier is a 404, not an
 * error. A *database* failure still propagates so the caller can decide between
 * rendering not-found and surfacing a 500.
 */
export async function findPublicJobByIdentifier(
  db: Db,
  identifier: string
): Promise<PublicJobLookup | null> {
  const id = (identifier || '').trim();
  if (!id || id.length > MAX_JOB_IDENTIFIER_LENGTH) return null;

  const jobs = db.collection('jobs');

  // ── 1. Exact match: the legacy shapes, and the cheapest possible hit ───────
  const exactOr: Record<string, any>[] = [{ canonicalId: id }];
  if (OBJECT_ID_HEX.test(id) && ObjectId.isValid(id)) {
    exactOr.push({ _id: new ObjectId(id) });
  }

  const exact = await jobs.findOne({ $or: exactOr }, { projection: PUBLIC_JOB_PROJECTION });
  if (exact) {
    const slug = buildJobSlug(exact);
    return { raw: exact, slug, needsRedirect: id !== slug };
  }

  // ── 2. Readable slug: prefix-scan on the hex anchor, then verify in full ──
  const suffix = parseJobSlugSuffix(id);
  if (!suffix) return null;

  const candidates = await jobs
    .find({ canonicalId: { $regex: `^${suffix}` } }, { projection: PUBLIC_JOB_PROJECTION })
    .limit(MAX_SLUG_CANDIDATES)
    .toArray();

  if (candidates.length === 0) return null;

  const exactSlug = candidates.find((candidate: any) => buildJobSlug(candidate) === id);
  if (exactSlug) return { raw: exactSlug, slug: id, needsRedirect: false };

  // The readable words drifted (a cosmetic title/company edit that left
  // `canonicalId` untouched) but the hex anchor still identifies exactly one
  // listing. Serve it, and redirect to the freshly-derived slug so the old link
  // keeps working instead of turning into a dead end.
  if (candidates.length === 1) {
    const slug = buildJobSlug(candidates[0]);
    return { raw: candidates[0], slug, needsRedirect: true };
  }

  // Ambiguous — several listings share the anchor and none matches the words.
  // Guessing here would serve the wrong job, which is worse than a 404.
  return null;
}

/**
 * The canonical public path for a job document.
 *
 * Single definition of "where does this job live", so the page, the sitemap and
 * any future caller cannot disagree about the shape of the URL.
 */
export function buildPublicJobPath(raw: Parameters<typeof buildJobSlug>[0]): string {
  return `/explore/jobs/${buildJobSlug(raw)}`;
}
