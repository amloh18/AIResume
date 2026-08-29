/**
 * Candidate Retrieval
 *
 * Multi-stage, tiered candidate retrieval from the jobs collection.
 * Replaces the single-pool retrieval with a progressive broadening strategy:
 *
 *   Layer 1: Exact title/text match (MongoDB $text index / Title Regex)
 *   Layer 2: Role family match (roleFamily index)
 *   Layer 3: Synonym/related role expansion
 *   Layer 4: Skill-based matching
 *   Layer 5: Bounded semantic fallback
 *   Layer 6: Adjacent opportunities (only when very few results)
 *
 * Each layer assigns a MatchTier that is used downstream for
 * result grouping and display.
 */

import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { NormalizedQuery, normalizeQuery } from '@/lib/search/queryNormalizer';
import { ROLE_TAXONOMY, resolveRoleFamily, getRelatedFamilies } from '@/lib/taxonomy/roleTaxonomy';
import { COUNTRIES_LIST } from '@/lib/config/job-constants';

// ── Types ───────────────────────────────────────────────────────────────────

export type MatchTier = 'EXACT' | 'CLOSE' | 'RELATED' | 'ADJACENT';

export interface RetrievedCandidate {
  _id: string;
  title: string;
  normalizedTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  remote: boolean;
  country: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source: string;
  atsType: string;
  applyUrl: string;
  postedDate?: Date | string;
  description?: string;
  keywords: string[];
  matchTier: MatchTier;
  roleFamily?: string;
  seniority?: string;
}

export interface TieredCandidates {
  exact: RetrievedCandidate[];
  close: RetrievedCandidate[];
  related: RetrievedCandidate[];
  adjacent: RetrievedCandidate[];
  totalCandidates: number;
  searchMeta: {
    query: NormalizedQuery;
    tiersUsed: string[];
    fallbackTriggered: boolean;
    totalInDatabase: number;
  };
}

export interface RetrievalOptions {
  limit: number;
  offset?: number;
  countryFilter?: string[];
  remoteOnly?: boolean;
  excludeJobIds?: Set<string>;
}

// ── Helpers for Filtering ───────────────────────────────────────────────────

export function buildLocationAndCountryFilter(options: RetrievalOptions): Record<string, any>[] {
  const clauses: Record<string, any>[] = [];

  if (options.remoteOnly) {
    clauses.push({
      $or: [
        { remote: true },
        { 'location.remote': true },
        { location: { $regex: 'remote', $options: 'i' } },
        { country: 'Global' },
      ],
    });
  }

  if (options.countryFilter && options.countryFilter.length > 0) {
    const matchedCodes: string[] = [];
    const matchedNames: string[] = [];
    const cityPatterns: string[] = [];

    for (const c of options.countryFilter) {
      if (!c) continue;
      const clean = c.trim();
      matchedCodes.push(clean, clean.toUpperCase());
      matchedNames.push(clean);

      const opt = COUNTRIES_LIST.find(
        (o) => o.name.toLowerCase() === clean.toLowerCase() || o.code.toLowerCase() === clean.toLowerCase()
      );
      if (opt) {
        matchedCodes.push(opt.code);
        matchedNames.push(opt.name);
        if (opt.region) matchedNames.push(opt.region);
      }

      const lower = clean.toLowerCase();
      if (lower.includes('india') || clean.toUpperCase() === 'IN') {
        cityPatterns.push('Bengaluru', 'Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Noida', 'Gurgaon', 'Kolkata', 'Ahmedabad');
      } else if (lower.includes('united states') || lower.includes('usa') || clean.toUpperCase() === 'US') {
        cityPatterns.push('San Francisco', 'New York', 'Seattle', 'Austin', 'Boston', 'Chicago', 'Los Angeles', 'Denver');
      } else if (lower.includes('united kingdom') || lower.includes('uk') || clean.toUpperCase() === 'GB') {
        cityPatterns.push('London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Cambridge', 'Oxford');
      } else if (lower.includes('germany') || clean.toUpperCase() === 'DE') {
        cityPatterns.push('Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne');
      } else if (lower.includes('canada') || clean.toUpperCase() === 'CA') {
        cityPatterns.push('Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary');
      } else if (lower.includes('singapore') || clean.toUpperCase() === 'SG') {
        cityPatterns.push('Singapore');
      } else if (lower.includes('australia') || clean.toUpperCase() === 'AU') {
        cityPatterns.push('Sydney', 'Melbourne', 'Brisbane', 'Perth');
      }
    }

    const countryOr: Record<string, any>[] = [
      { 'location.countryCode': { $in: matchedCodes } },
      { 'location.country': { $in: matchedNames } },
      { country: { $in: matchedNames } },
      { country: { $regex: matchedNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), $options: 'i' } },
      { 'location.country': { $regex: matchedNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), $options: 'i' } },
    ];

    if (cityPatterns.length > 0) {
      const cityRegex = cityPatterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      countryOr.push({ 'location.city': { $regex: cityRegex, $options: 'i' } });
      countryOr.push({
        location: {
          $regex: cityRegex + '|' + matchedNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
          $options: 'i',
        },
      });
    }

    // If Worldwide / Remote / Global is part of the filter
    if (
      matchedCodes.some((code) => ['GLOBAL', 'GLOBAL_REMOTE', 'WORLDWIDE', 'REMOTE', 'XX'].includes(code.toUpperCase())) ||
      matchedNames.some((name) =>
        name.toLowerCase().includes('global') ||
        name.toLowerCase().includes('worldwide') ||
        name.toLowerCase().includes('remote')
      )
    ) {
      countryOr.push({ remote: true });
      countryOr.push({ 'location.remote': true });
      countryOr.push({ country: 'Global' });
    }

    clauses.push({ $or: countryOr });
  }

  return clauses;
}

// ── Core Retrieval ──────────────────────────────────────────────────────────

/**
 * Retrieve candidates using a multi-stage tiered strategy.
 * Results from each tier are deduplicated and ranked.
 */
export async function retrieveCandidates(
  rawQuery: string | string[],
  options: RetrievalOptions
): Promise<TieredCandidates> {
  const db = await getDb();
  const coll = db.collection('jobs');

  const queries = Array.isArray(rawQuery) ? rawQuery : [rawQuery];
  const normalizedQueries = queries.map((q) => normalizeQuery(q));
  const primaryQuery = normalizedQueries[0] || normalizeQuery('');

  // Collect all resolved role families across all queries
  const allRoleFamilies = new Set<string>();
  const allRelatedFamilies = new Set<string>();
  const allKeywords = new Set<string>();
  const allTokens = new Set<string>();
  const allSearchTexts: string[] = [];

  for (const nq of normalizedQueries) {
    if (nq.original) allSearchTexts.push(nq.original);
    if (nq.normalized) allSearchTexts.push(nq.normalized);
    if (nq.roleFamily) {
      allRoleFamilies.add(nq.roleFamily);
      const related = getRelatedFamilies(nq.roleFamily);
      for (const rf of related) allRelatedFamilies.add(rf);
    }
    for (const rf of nq.relatedFamilies) allRelatedFamilies.add(rf);
    for (const kw of nq.keywords) allKeywords.add(kw);
    for (const tok of nq.tokens) allTokens.add(tok);
  }

  // Also check if any raw query directly resolves to a role family
  for (const q of queries) {
    const rf = resolveRoleFamily(q);
    if (rf) {
      allRoleFamilies.add(rf);
      const related = getRelatedFamilies(rf);
      for (const r of related) allRelatedFamilies.add(r);
    }
  }

  const locationClauses = buildLocationAndCountryFilter(options);

  const baseFilter: Record<string, any> = {
    $or: [
      { status: { $in: ['new', 'active'] } },
      { status: { $exists: false } },
    ],
    ...(locationClauses.length > 0 ? { $and: locationClauses } : {}),
  };

  const tiersUsed: string[] = [];
  let fallbackTriggered = false;
  const seenIds = new Set<string>();

  // Collect results from each tier
  const exactResults: RetrievedCandidate[] = [];
  const closeResults: RetrievedCandidate[] = [];
  const relatedResults: RetrievedCandidate[] = [];
  const adjacentResults: RetrievedCandidate[] = [];

  // ── Layer 1: Exact text / title match ────────────────────────────────────
  const textSearchQuery = allSearchTexts.filter(Boolean).join(' ');
  if (textSearchQuery) {
    try {
      const textResults = await coll
        .find({
          ...baseFilter,
          $text: { $search: textSearchQuery },
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit * 2)
        .toArray();

      for (const doc of textResults) {
        const id = doc._id.toString();
        if (seenIds.has(id)) continue;
        if (options.excludeJobIds?.has(id)) continue;
        seenIds.add(id);
        exactResults.push(mapToCandidate(doc, 'EXACT'));
      }

      if (exactResults.length > 0) tiersUsed.push('text');
    } catch {
      // Text index might not exist or text query syntax error
    }

    // Title Regex match for Exact / Direct title match
    const titleRegex = allSearchTexts
      .filter((t) => t.length > 2)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    if (titleRegex && exactResults.length < options.limit * 2) {
      try {
        const titleDocs = await coll
          .find({
            ...baseFilter,
            _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
            $or: [
              { normalizedTitle: { $regex: titleRegex, $options: 'i' } },
              { title: { $regex: titleRegex, $options: 'i' } },
            ],
          })
          .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
          .limit(options.limit * 2)
          .toArray();

        for (const doc of titleDocs) {
          const id = doc._id.toString();
          if (seenIds.has(id)) continue;
          if (options.excludeJobIds?.has(id)) continue;
          seenIds.add(id);
          exactResults.push(mapToCandidate(doc, 'EXACT'));
        }

        if (titleDocs.length > 0 && !tiersUsed.includes('titleRegex')) {
          tiersUsed.push('titleRegex');
        }
      } catch {
        // Ignore regex search errors
      }
    }
  }

  // ── Layer 2: Role family match ──────────────────────────────────────────
  if (allRoleFamilies.size > 0) {
    const familyFilter = {
      ...baseFilter,
      _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
      roleFamily: { $in: Array.from(allRoleFamilies) },
    };

    try {
      const familyResults = await coll
        .find(familyFilter)
        .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
        .limit(options.limit * 2)
        .toArray();

      for (const doc of familyResults) {
        const id = doc._id.toString();
        if (seenIds.has(id)) continue;
        if (options.excludeJobIds?.has(id)) continue;
        seenIds.add(id);

        const isClose = isRelatedTitle(doc.title || '', primaryQuery);
        const tier: MatchTier = isClose ? 'CLOSE' : 'CLOSE';
        closeResults.push(mapToCandidate(doc, tier));
      }

      if (familyResults.length > 0) tiersUsed.push('roleFamily');
    } catch {
      // Ignore
    }
  }

  // ── Layer 3: Synonym / related role expansion ───────────────────────────
  if (allRelatedFamilies.size > 0 && closeResults.length + exactResults.length < options.limit * 2) {
    const relatedFamilyFilter = {
      ...baseFilter,
      _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
      roleFamily: { $in: Array.from(allRelatedFamilies) },
    };

    try {
      const relatedResultsRaw = await coll
        .find(relatedFamilyFilter)
        .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
        .limit(options.limit)
        .toArray();

      for (const doc of relatedResultsRaw) {
        const id = doc._id.toString();
        if (seenIds.has(id)) continue;
        if (options.excludeJobIds?.has(id)) continue;
        seenIds.add(id);
        relatedResults.push(mapToCandidate(doc, 'RELATED'));
      }

      if (relatedResultsRaw.length > 0) tiersUsed.push('relatedFamilies');
    } catch {
      // Ignore
    }
  }

  // ── Layer 4: Keyword expansion ──────────────────────────────────────────
  const totalSoFar = exactResults.length + closeResults.length + relatedResults.length + adjacentResults.length;
  if ((allKeywords.size > 0 || allTokens.size > 0) && totalSoFar < options.limit * 2) {
    const keywordsList = Array.from(allKeywords);
    const tokensList = Array.from(allTokens);
    const keywordRegex = keywordsList.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    const keywordFilter = {
      ...baseFilter,
      _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
      $or: [
        ...(keywordRegex ? [{ normalizedTitle: { $regex: keywordRegex, $options: 'i' } }] : []),
        ...(keywordsList.length > 0 ? [{ roleFamilyKeywords: { $in: keywordsList } }] : []),
        ...(tokensList.length > 0 ? [{ skills: { $in: tokensList } }] : []),
        ...(keywordsList.length > 0 ? [{ keywords: { $in: keywordsList } }] : []),
      ],
    };

    try {
      const keywordResults = await coll
        .find(keywordFilter)
        .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
        .limit(options.limit)
        .toArray();

      for (const doc of keywordResults) {
        const id = doc._id.toString();
        if (seenIds.has(id)) continue;
        if (options.excludeJobIds?.has(id)) continue;
        seenIds.add(id);
        relatedResults.push(mapToCandidate(doc, 'RELATED'));
      }

      if (keywordResults.length > 0) tiersUsed.push('keywords');
    } catch {
      // Ignore
    }
  }

  // ── Layer 5: Broad regex fallback (bounded) ─────────────────────────────
  if (exactResults.length + closeResults.length + relatedResults.length < Math.min(10, options.limit)) {
    fallbackTriggered = true;
    const broadTokens = Array.from(allTokens).filter((t) => t.length > 2);
    const broadRegex = broadTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    if (broadRegex) {
      try {
        const broadFilter = {
          ...baseFilter,
          _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
          $or: [
            { normalizedTitle: { $regex: broadRegex, $options: 'i' } },
            { title: { $regex: broadRegex, $options: 'i' } },
            { descriptionText: { $regex: broadRegex, $options: 'i' } },
            { description: { $regex: broadRegex, $options: 'i' } },
          ],
        };

        const broadResults = await coll
          .find(broadFilter)
          .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
          .limit(options.limit)
          .toArray();

        for (const doc of broadResults) {
          const id = doc._id.toString();
          if (seenIds.has(id)) continue;
          if (options.excludeJobIds?.has(id)) continue;
          seenIds.add(id);
          relatedResults.push(mapToCandidate(doc, 'RELATED'));
        }

        if (broadResults.length > 0) tiersUsed.push('broadRegex');
      } catch {
        // Ignore broad search failures
      }
    }
  }

  // ── Layer 6: Adjacent opportunities (only when very few results) ────────
  const totalExactClose = exactResults.length + closeResults.length;
  if (totalExactClose < 5 && allRoleFamilies.size > 0) {
    const adjacentFamilies: string[] = [];
    for (const rf of allRoleFamilies) {
      const family = ROLE_TAXONOMY[rf];
      if (family?.adjacent?.length > 0) {
        for (const kw of family.adjacent) {
          const resolved = resolveRoleFamily(kw);
          if (resolved && !allRoleFamilies.has(resolved) && !adjacentFamilies.includes(resolved)) {
            adjacentFamilies.push(resolved);
          }
        }
      }
    }

    if (adjacentFamilies.length > 0) {
      try {
        const adjacentFilter = {
          ...baseFilter,
          _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
          roleFamily: { $in: adjacentFamilies.slice(0, 3) },
        };

        const adjacentResultsRaw = await coll
          .find(adjacentFilter)
          .sort({ postedAt: -1, postedDate: -1, createdAt: -1 })
          .limit(Math.max(5, options.limit - totalExactClose))
          .toArray();

        for (const doc of adjacentResultsRaw) {
          const id = doc._id.toString();
          if (seenIds.has(id)) continue;
          if (options.excludeJobIds?.has(id)) continue;
          seenIds.add(id);
          adjacentResults.push(mapToCandidate(doc, 'ADJACENT'));
        }

        if (adjacentResultsRaw.length > 0) tiersUsed.push('adjacent');
      } catch {
        // Ignore adjacent search failures
      }
    }
  }

  // ── Get total database count for metadata ───────────────────────────────
  let totalInDatabase = 0;
  try {
    totalInDatabase = await coll.countDocuments(baseFilter);
  } catch {
    // Ignore count errors
  }

  return {
    exact: exactResults,
    close: closeResults,
    related: relatedResults,
    adjacent: adjacentResults,
    totalCandidates: exactResults.length + closeResults.length + relatedResults.length + adjacentResults.length,
    searchMeta: {
      query: primaryQuery,
      tiersUsed,
      fallbackTriggered,
      totalInDatabase,
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a MongoDB document to a RetrievedCandidate.
 * Handles both flat schema and nested object formats stored in the jobs collection.
 */
export function mapToCandidate(doc: any, tier: MatchTier): RetrievedCandidate {
  const companyName = doc.company?.name || (typeof doc.company === 'string' ? doc.company : 'Unknown');
  const companyLogo = doc.company?.logoUrl || doc.companyLogo;

  let locationStr = 'Unknown';
  if (doc.location && typeof doc.location === 'object') {
    const locationParts = [doc.location.city, doc.location.country].filter(Boolean);
    locationStr = locationParts.join(', ') || 'Unknown';
  } else if (typeof doc.location === 'string' && doc.location.trim()) {
    locationStr = doc.location;
  } else if (typeof doc.country === 'string' && doc.country.trim()) {
    locationStr = doc.country;
  }

  const isRemote =
    doc.remote === true ||
    doc.location?.remote === true ||
    (typeof doc.location === 'string' && doc.location.toLowerCase().includes('remote'));

  const country = doc.country || doc.location?.country || doc.location?.countryCode || '';

  const salaryMin = doc.salaryMin ?? doc.salary?.min;
  const salaryMax = doc.salaryMax ?? doc.salary?.max;
  const salaryCurrency = doc.salaryCurrency || doc.salary?.currency || 'USD';

  const sourcePrimary =
    (typeof doc.source === 'object' ? doc.source?.primary : doc.source) || doc.atsType || 'discovery';
  const atsType =
    doc.atsType || (typeof doc.source === 'object' ? doc.source?.primary : doc.source) || 'discovery';
  const applyUrl = doc.applyUrl || doc.source?.applicationUrl || doc.source?.sourceUrl || '';

  const postedDate = doc.postedDate || doc.postedAt || doc.createdAt;
  const description = (doc.descriptionText || doc.description || '').slice(0, 800);
  const keywords = Array.isArray(doc.keywords) && doc.keywords.length > 0
    ? doc.keywords
    : (Array.isArray(doc.skills) ? doc.skills : []);

  return {
    _id: doc._id.toString(),
    title: doc.title || 'Untitled',
    normalizedTitle: doc.normalizedTitle || (doc.title ? doc.title.toLowerCase() : ''),
    company: companyName,
    companyLogo,
    location: locationStr,
    remote: isRemote,
    country,
    salaryMin,
    salaryMax,
    salaryCurrency,
    source: sourcePrimary,
    atsType,
    applyUrl,
    postedDate,
    description,
    keywords,
    matchTier: tier,
    roleFamily: doc.roleFamily,
    seniority: doc.seniority,
  };
}

/**
 * Determine if a job title is a "close" match to the query
 * (i.e., within the same role family's primary/related titles).
 */
function isRelatedTitle(jobTitle: string, query: NormalizedQuery): boolean {
  if (!query.roleFamily) return false;
  const family = ROLE_TAXONOMY[query.roleFamily];
  if (!family) return false;

  const normalized = jobTitle.toLowerCase().trim();

  // Check primary titles
  for (const title of family.primary) {
    if (normalized.includes(title) || title.includes(normalized)) return true;
  }

  // Check related titles
  for (const title of family.related) {
    if (normalized.includes(title) || title.includes(normalized)) return true;
  }

  return false;
}

/**
 * Flatten tiered candidates into a single array preserving tier metadata.
 * Orders by tier (EXACT first, then CLOSE, RELATED, ADJACENT).
 */
export function flattenTieredCandidates(tiered: TieredCandidates): RetrievedCandidate[] {
  return [
    ...tiered.exact,
    ...tiered.close,
    ...tiered.related,
    ...tiered.adjacent,
  ];
}

/**
 * Get tier summary counts.
 */
export function getTierSummary(tiered: TieredCandidates): {
  exact: number;
  close: number;
  related: number;
  adjacent: number;
  total: number;
} {
  return {
    exact: tiered.exact.length,
    close: tiered.close.length,
    related: tiered.related.length,
    adjacent: tiered.adjacent.length,
    total: tiered.totalCandidates,
  };
}

