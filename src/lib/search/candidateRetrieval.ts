/**
 * Candidate Retrieval
 *
 * Multi-stage, tiered candidate retrieval from the jobs collection.
 * Replaces the single-pool retrieval with a progressive broadening strategy:
 *
 *   Layer 1: Exact title/text match (MongoDB $text index)
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
import { ROLE_TAXONOMY, resolveRoleFamily } from '@/lib/taxonomy/roleTaxonomy';

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
  postedDate?: Date;
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

// ── Core Retrieval ──────────────────────────────────────────────────────────

/**
 * Retrieve candidates using a multi-stage tiered strategy.
 * Results from each tier are deduplicated and ranked.
 */
export async function retrieveCandidates(
  rawQuery: string,
  options: RetrievalOptions
): Promise<TieredCandidates> {
  const db = await getDb();
  const coll = db.collection('jobs');
  const query = normalizeQuery(rawQuery);

  const baseFilter: Record<string, any> = {
    $or: [
      { status: { $in: ['new', 'active'] } },
      { status: { $exists: false } },
    ],
  };

  // Location/remote pre-filter (applied to all layers)
  if (options.remoteOnly) {
    baseFilter['location.remote'] = true;
  }
  if (options.countryFilter && options.countryFilter.length > 0) {
    baseFilter['location.countryCode'] = { $in: options.countryFilter };
  }

  const tiersUsed: string[] = [];
  let fallbackTriggered = false;
  const seenIds = new Set<string>();
  const allCandidates: RetrievedCandidate[] = [];

  // Collect results from each tier
  const exactResults: RetrievedCandidate[] = [];
  const closeResults: RetrievedCandidate[] = [];
  const relatedResults: RetrievedCandidate[] = [];
  const adjacentResults: RetrievedCandidate[] = [];

  // ── Layer 1: Exact text match ───────────────────────────────────────────
  // Use original query for text search to preserve abbreviations like "IT"
  // (the normalized form expands "IT" → "information technology" which doesn't match titles)
  const textSearchQuery = query.original || query.normalized;
  try {
    const textResults = await coll
      .find({
        ...baseFilter,
        $text: { $search: textSearchQuery },
      })
      .project({
        score: { $meta: 'textScore' },
        title: 1,
        normalizedTitle: 1,
        'company.name': 1,
        'company.logoUrl': 1,
        'location.city': 1,
        'location.country': 1,
        'location.countryCode': 1,
        'location.remote': 1,
        'source.primary': 1,
        'source.applicationUrl': 1,
        'source.sourceUrl': 1,
        descriptionText: 1,
        skills: 1,
        postedAt: 1,
        roleFamily: 1,
        seniority: 1,
        'salary.min': 1,
        'salary.max': 1,
        'salary.currency': 1,
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
    // Text index might not exist or query might be unsupported
  }

  // ── Layer 2: Role family match ──────────────────────────────────────────
  if (query.roleFamily) {
    const familyFilter = {
      ...baseFilter,
      roleFamily: query.roleFamily,
    };

    const familyResults = await coll
      .find(familyFilter)
      .project({
        title: 1,
        normalizedTitle: 1,
        'company.name': 1,
        'company.logoUrl': 1,
        'location.city': 1,
        'location.country': 1,
        'location.countryCode': 1,
        'location.remote': 1,
        'source.primary': 1,
        'source.applicationUrl': 1,
        'source.sourceUrl': 1,
        descriptionText: 1,
        skills: 1,
        postedAt: 1,
        roleFamily: 1,
        seniority: 1,
        'salary.min': 1,
        'salary.max': 1,
        'salary.currency': 1,
      })
      .sort({ postedAt: -1 })
      .limit(options.limit * 2)
      .toArray();

    for (const doc of familyResults) {
      const id = doc._id.toString();
      if (seenIds.has(id)) continue;
      if (options.excludeJobIds?.has(id)) continue;
      seenIds.add(id);

      // Determine if this is CLOSE or RELATED based on taxonomy
      const tier = isRelatedTitle(doc.title || '', query) ? 'CLOSE' : 'RELATED';
      closeResults.push(mapToCandidate(doc, tier));
    }

    if (familyResults.length > 0) tiersUsed.push('roleFamily');
  }

  // ── Layer 3: Synonym / related role expansion ───────────────────────────
  if (query.relatedFamilies.length > 0 && closeResults.length + exactResults.length < options.limit) {
    const relatedFamilyFilter = {
      ...baseFilter,
      roleFamily: { $in: query.relatedFamilies },
    };

    const relatedResultsRaw = await coll
      .find(relatedFamilyFilter)
      .project({
        title: 1,
        normalizedTitle: 1,
        'company.name': 1,
        'company.logoUrl': 1,
        'location.city': 1,
        'location.country': 1,
        'location.countryCode': 1,
        'location.remote': 1,
        'source.primary': 1,
        'source.applicationUrl': 1,
        'source.sourceUrl': 1,
        descriptionText: 1,
        skills: 1,
        postedAt: 1,
        roleFamily: 1,
        seniority: 1,
        'salary.min': 1,
        'salary.max': 1,
        'salary.currency': 1,
      })
      .sort({ postedAt: -1 })
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
  }

  // ── Layer 4: Keyword expansion ──────────────────────────────────────────
  const totalSoFar = exactResults.length + closeResults.length + relatedResults.length + adjacentResults.length;
  if (query.keywords.length > 0 && totalSoFar < options.limit) {
    const keywordRegex = query.keywords.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    const keywordFilter = {
      ...baseFilter,
        _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
        $or: [
          { normalizedTitle: { $regex: keywordRegex, $options: 'i' } },
          { roleFamilyKeywords: { $in: query.keywords } },
          { skills: { $in: query.tokens } },
      ],
    };

    try {
      const keywordResults = await coll
        .find(keywordFilter)
        .project({
          title: 1,
          normalizedTitle: 1,
          'company.name': 1,
          'company.logoUrl': 1,
          'location.city': 1,
          'location.country': 1,
          'location.countryCode': 1,
          'location.remote': 1,
          'source.primary': 1,
          'source.applicationUrl': 1,
          'source.sourceUrl': 1,
          descriptionText: 1,
          skills: 1,
          postedAt: 1,
          roleFamily: 1,
          seniority: 1,
          'salary.min': 1,
          'salary.max': 1,
          'salary.currency': 1,
        })
        .sort({ postedAt: -1 })
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
      // ObjectId conversion might fail for some IDs
    }
  }

  // ── Layer 5: Broad regex fallback (bounded) ─────────────────────────────
  if (totalSoFar < Math.min(10, options.limit)) {
    fallbackTriggered = true;

    // Use the original query tokens for a broader search
    const broadRegex = query.tokens.join('|');
    if (broadRegex) {
      try {
        const broadFilter = {
          ...baseFilter,
          _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
          $or: [
            { normalizedTitle: { $regex: broadRegex, $options: 'i' } },
            { descriptionText: { $regex: broadRegex, $options: 'i' } },
          ],
        };

        const broadResults = await coll
          .find(broadFilter)
          .project({
            title: 1,
            normalizedTitle: 1,
            'company.name': 1,
            'company.logoUrl': 1,
            'location.city': 1,
            'location.country': 1,
            'location.countryCode': 1,
            'location.remote': 1,
            'source.primary': 1,
            'source.applicationUrl': 1,
            'source.sourceUrl': 1,
            descriptionText: 1,
            skills: 1,
            postedAt: 1,
            roleFamily: 1,
            seniority: 1,
            'salary.min': 1,
            'salary.max': 1,
            'salary.currency': 1,
          })
          .sort({ postedAt: -1 })
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
  if (totalExactClose < 5 && query.roleFamily) {
    const family = ROLE_TAXONOMY[query.roleFamily];
    if (family?.adjacent?.length > 0) {
      const adjacentFamilies = family.adjacent
        .map((kw) => resolveRoleFamily(kw))
        .filter((f): f is string => !!f && f !== query.roleFamily);

      if (adjacentFamilies.length > 0) {
        try {
          const adjacentFilter = {
            ...baseFilter,
            roleFamily: { $in: adjacentFamilies.slice(0, 3) },
        _id: { $nin: Array.from(seenIds).map((id) => new ObjectId(id)) },
          };

          const adjacentResultsRaw = await coll
            .find(adjacentFilter)
            .project({
              title: 1,
              normalizedTitle: 1,
              'company.name': 1,
              'company.logoUrl': 1,
              'location.city': 1,
              'location.country': 1,
              'location.countryCode': 1,
              'location.remote': 1,
              'source.primary': 1,
              'source.applicationUrl': 1,
              'source.sourceUrl': 1,
              descriptionText: 1,
              skills: 1,
              postedAt: 1,
              roleFamily: 1,
              seniority: 1,
              'salary.min': 1,
              'salary.max': 1,
              'salary.currency': 1,
            })
            .sort({ postedAt: -1 })
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
      query,
      tiersUsed,
      fallbackTriggered,
      totalInDatabase,
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a MongoDB document to a RetrievedCandidate.
 */
function mapToCandidate(doc: any, tier: MatchTier): RetrievedCandidate {
  const companyName = doc.company?.name || doc.company || 'Unknown';
  const locationParts = [
    doc.location?.city,
    doc.location?.country,
  ].filter(Boolean);
  const locationStr = doc.location?.city
    ? locationParts.join(', ')
    : (typeof doc.location === 'string' ? doc.location : 'Unknown');

  return {
    _id: doc._id.toString(),
    title: doc.title || 'Untitled',
    normalizedTitle: doc.normalizedTitle || '',
    company: companyName,
    companyLogo: doc.company?.logoUrl,
    location: locationStr,
    remote: doc.location?.remote ?? false,
    country: doc.location?.country || '',
    salaryMin: doc.salary?.min,
    salaryMax: doc.salary?.max,
    salaryCurrency: doc.salary?.currency,
    source: doc.source?.primary || doc.source || 'unknown',
    atsType: doc.source?.primary || 'unknown',
    applyUrl: doc.source?.applicationUrl || doc.source?.sourceUrl || '',
    postedDate: doc.postedAt,
    description: (doc.descriptionText || doc.description || '').slice(0, 800),
    keywords: doc.skills || doc.keywords || [],
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
