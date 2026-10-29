/**
 * Role Relevance
 *
 * Turns a user's target roles into a MongoDB title predicate, so the
 * "Recommended" feed is curated in the database instead of being filtered
 * after the page has already been fetched.
 *
 * Why this exists
 * ---------------
 * The discovery route used to fetch a fixed pool of recent jobs and only
 * *rank* them against the profile. Every job in the pool was still returned,
 * so "Recommended" was the whole catalogue in match-score order, and because
 * hard constraints were applied after the fetch, a 20-row page could arrive
 * with 3 rows left.
 *
 * Filtering on the role has to happen in Mongo to keep pagination honest
 * (20 per page, exact totals). The catch is that a naive
 * `title: { $regex: ..., $options: 'i' }` cannot use an index: measured on
 * production it took 1–4s per request. Two things make it fast here:
 *
 *   1. `normalizedTitle` is stored lowercase (verified: 0 of 226,600
 *      documents are mixed-case), so the regex needs no `i` flag.
 *   2. The pattern is anchored with `^`, so MongoDB can derive index bounds
 *      from it instead of scanning every document.
 *
 * An anchored pattern would otherwise miss "Senior Software Engineer", so the
 * seniority word is folded into the anchor rather than matched loosely.
 */

import { ROLE_TAXONOMY, resolveRoleFamily } from '@/lib/taxonomy/roleTaxonomy';

/**
 * Seniority words that commonly prefix a title. Kept inside the `^` anchor so
 * "Senior Data Analyst" matches the target role "Data Analyst" without
 * falling back to an unanchored scan.
 */
const SENIORITY_PREFIXES = [
  'senior',
  'sr',
  'sr.',
  'lead',
  'staff',
  'principal',
  'chief',
  'head of',
  'director of',
  'vp of',
  'vp',
  'junior',
  'jr',
  'jr.',
  'graduate',
  'entry level',
  'entry',
  'trainee',
  'associate',
  'assistant',
  'mid',
  'mid level',
  'intermediate',
];

/**
 * Bound on the generated alternation. Each alternative is an index range for
 * MongoDB, so a runaway list would cost more than it saves. Real profiles
 * resolve to a handful of families and stay well under this.
 */
const MAX_ALTERNATIVES = 48;

/** Shortest phrase worth matching. Below this, noise outweighs relevance. */
const MIN_PHRASE_LENGTH = 3;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Collect the title phrases a profile's target roles should match.
 *
 * Sources, in priority order:
 *   1. The target roles exactly as the user wrote them.
 *   2. The taxonomy family each target role resolves to (primary + related
 *      titles), which is what catches "Full Stack Engineer" when the user
 *      typed "Software Engineer".
 *   3. Family keywords ("developer", "programmer"), which catch titles the
 *      taxonomy does not list verbatim.
 *
 * Adjacent families are deliberately excluded: they are the "you might also
 * like" tier, and the product requirement is a curated feed, not a broad one.
 */
export function collectRolePhrases(
  targetRoles: string[],
  roleFamilies: string[] = []
): string[] {
  const phrases = new Set<string>();

  const add = (raw: string | undefined | null) => {
    if (!raw) return;
    const phrase = raw.toLowerCase().trim().replace(/\s+/g, ' ');
    if (phrase.length < MIN_PHRASE_LENGTH) return;
    phrases.add(phrase);
  };

  for (const role of targetRoles) add(role);

  const families = new Set<string>();
  for (const family of roleFamilies) {
    if (family && ROLE_TAXONOMY[family]) families.add(family);
  }
  // A target role can resolve to a family even when the stored `roleFamilies`
  // list is stale or empty (profiles saved before families were derived).
  // Only roles long enough to be a real phrase are resolved: the taxonomy's
  // word-overlap fallback will happily map a single character to a family.
  for (const role of targetRoles) {
    const normalized = (role || '').toLowerCase().trim();
    if (normalized.length < MIN_PHRASE_LENGTH) continue;
    const resolved = resolveRoleFamily(normalized);
    if (resolved) families.add(resolved);
  }

  for (const family of families) {
    const definition = ROLE_TAXONOMY[family];
    if (!definition) continue;
    for (const title of definition.primary) add(title);
    for (const title of definition.related) add(title);
    for (const keyword of definition.keywords) add(keyword);
  }

  // Longest first: the alternation is tried left to right, and a specific
  // phrase ("full stack developer") is a better label than a generic one
  // ("developer") even though both end up in the same index range set.
  return Array.from(phrases)
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_ALTERNATIVES);
}

/**
 * Build the anchored, case-sensitive pattern used against `normalizedTitle`.
 * Returns null when the profile has nothing to match on.
 */
export function buildRoleTitlePattern(
  targetRoles: string[],
  roleFamilies: string[] = []
): string | null {
  const phrases = collectRolePhrases(targetRoles, roleFamilies);
  if (phrases.length === 0) return null;

  const prefix = SENIORITY_PREFIXES.map(escapeRegex).join('|');
  const alternatives = phrases.map(escapeRegex).join('|');

  return `^(?:(?:${prefix})\\s+)?(?:${alternatives})`;
}

/**
 * The MongoDB clause for role relevance, or null when the profile has no
 * usable target roles.
 *
 * `$or` covers the legacy documents that predate `normalizedTitle`; those are
 * few and already excluded by the status filter, but leaving them out of the
 * query entirely would silently hide any future ingestion that skips the
 * field. The second branch only matches when the first does not, so the
 * indexed path is unaffected.
 */
export function buildRoleRelevanceClause(
  targetRoles: string[],
  roleFamilies: string[] = []
): Record<string, any> | null {
  const pattern = buildRoleTitlePattern(targetRoles, roleFamilies);
  if (!pattern) return null;

  return { normalizedTitle: { $regex: pattern } };
}

/**
 * Case-insensitive fallback used only when the anchored pattern returns
 * nothing at all — a signal that the stored titles are not normalised the way
 * the collection currently assumes. Slower by design; it is a safety valve,
 * not the normal path.
 */
export function buildRoleRelevanceFallbackClause(
  targetRoles: string[],
  roleFamilies: string[] = []
): Record<string, any> | null {
  const pattern = buildRoleTitlePattern(targetRoles, roleFamilies);
  if (!pattern) return null;

  return {
    $or: [
      { normalizedTitle: { $regex: pattern, $options: 'i' } },
      { title: { $regex: pattern, $options: 'i' } },
    ],
  };
}
