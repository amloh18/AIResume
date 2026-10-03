/**
 * Keyword Strategy Service
 *
 * Builds a tiered keyword strategy for ATS optimization.
 * Keywords are prioritized into 4 tiers with specific usage guidelines.
 *
 * This is the "what words must appear in the CV" intelligence layer.
 */

import {
  JobTargetProfile,
  EvidenceProfile,
  GapAnalysis,
  KeywordStrategy,
  KeywordTier,
} from './types';

// ─── Known ATS Phrases ────────────────────────────────────────────────

const KNOWN_ATS_PHRASES = new Set([
  'machine learning', 'deep learning', 'natural language processing', 'nlp',
  'computer vision', 'data science', 'artificial intelligence',
  'ci/cd', 'continuous integration', 'continuous deployment',
  'rest api', 'restful api', 'graphql', 'microservices',
  'agile methodology', 'scrum', 'kanban',
  'test driven development', 'tdd', 'behavior driven development', 'bdd',
  'object oriented', 'oop', 'functional programming',
  'design patterns', 'system design', 'architecture',
  'cloud computing', 'serverless', 'containerization',
  'version control', 'code review', 'pair programming',
  'technical documentation', 'stakeholder management',
  'cross-functional', 'cross-functional teams',
  'full stack', 'full-stack', 'frontend', 'backend', 'front-end', 'back-end',
  'api design', 'database design', 'schema design',
  'performance optimization', 'scalability', 'reliability',
  'monitoring', 'observability', 'logging',
  'security', 'authentication', 'authorization',
  'devops', 'infrastructure', 'deployment',
  'product management', 'product strategy', 'roadmap',
  'user experience', 'ux', 'user interface', 'ui',
  'a/b testing', 'data analysis', 'analytics',
  'project management', 'program management',
  'leadership', 'mentoring', 'coaching',
  'communication', 'collaboration', 'teamwork',
  'problem solving', 'critical thinking',
  'attention to detail', 'time management',
]);

// ─── Stop Words ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'their', 'they',
  'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her',
  'our', 'their', 'your', 'my', 'his', 'her', 'its',
  'about', 'above', 'after', 'again', 'all', 'also', 'any', 'because',
  'before', 'between', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'than', 'too', 'very', 'just', 'not', 'only',
  'own', 'same', 'so', 'still', 'then', 'there', 'through', 'under',
  'until', 'up', 'while',
]);

// ─── Tokenization ─────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/#+.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  const lower = text.toLowerCase();

  // Check for known ATS phrases
  for (const phrase of KNOWN_ATS_PHRASES) {
    if (lower.includes(phrase)) {
      phrases.push(phrase);
    }
  }

  return phrases;
}

// ─── Keyword Scoring ──────────────────────────────────────────────────

interface ScoredKeyword {
  keyword: string;
  score: number;
  source: 'jd' | 'required' | 'preferred' | 'ats' | 'contextual';
}

function scoreKeywords(
  jobTargetProfile: JobTargetProfile,
  gapAnalysis: GapAnalysis
): ScoredKeyword[] {
  const scored: Map<string, ScoredKeyword> = new Map();

  const addOrUpdate = (keyword: string, score: number, source: ScoredKeyword['source']) => {
    const existing = scored.get(keyword);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      if (source === 'required' || source === 'ats') {
        existing.source = source;
      }
    } else {
      scored.set(keyword, { keyword, score, source });
    }
  };

  // Tier 1: Hard requirements (highest priority)
  for (const req of jobTargetProfile.hardRequirements) {
    const tokens = tokenize(req.text);
    for (const token of tokens) {
      addOrUpdate(token, 100, 'required');
    }
    // Also add the full requirement as a phrase if it's a known ATS phrase
    const phrases = extractPhrases(req.text);
    for (const phrase of phrases) {
      addOrUpdate(phrase, 100, 'required');
    }
  }

  // Tier 2: Preferred requirements
  for (const req of jobTargetProfile.preferredRequirements) {
    const tokens = tokenize(req.text);
    for (const token of tokens) {
      addOrUpdate(token, 70, 'preferred');
    }
  }

  // Tier 3: ATS keywords from JD
  for (const kw of jobTargetProfile.likelyATSKeywords) {
    addOrUpdate(kw, 60, 'ats');
  }

  // Tier 4: Technologies and tools mentioned
  for (const tech of jobTargetProfile.technologies) {
    addOrUpdate(tech, 50, 'jd');
  }
  for (const tool of jobTargetProfile.tools) {
    addOrUpdate(tool, 50, 'jd');
  }

  // Boost keywords that are matched in gap analysis
  for (const item of gapAnalysis.matched) {
    const tokens = tokenize(item.requirement);
    for (const token of tokens) {
      const existing = scored.get(token);
      if (existing) {
        existing.score += 10; // Small boost for matched items
      }
    }
  }

  // Reduce score for missing items (they need attention but shouldn't dominate)
  for (const item of gapAnalysis.missing) {
    const tokens = tokenize(item.requirement);
    for (const token of tokens) {
      const existing = scored.get(token);
      if (existing && existing.score > 30) {
        existing.score -= 5; // Slight reduction — still important but don't over-use
      }
    }
  }

  return Array.from(scored.values()).sort((a, b) => b.score - a.score);
}

// ─── Tier Assignment ──────────────────────────────────────────────────

function assignTiers(
  scoredKeywords: ScoredKeyword[],
  mode: 'standard' | 'standout'
): KeywordTier[] {
  const maxOccurrences = mode === 'standout' ? 3 : 2;

  // Tier 1: Mandatory (score >= 90)
  const tier1 = scoredKeywords
    .filter(k => k.score >= 90)
    .map(k => k.keyword);

  // Tier 2: Major (score >= 60 and < 90)
  const tier2 = scoredKeywords
    .filter(k => k.score >= 60 && k.score < 90)
    .map(k => k.keyword);

  // Tier 3: Contextual (score >= 40 and < 60)
  const tier3 = scoredKeywords
    .filter(k => k.score >= 40 && k.score < 60)
    .map(k => k.keyword);

  // Tier 4: Filler (score < 40)
  const tier4 = scoredKeywords
    .filter(k => k.score < 40)
    .map(k => k.keyword);

  return [
    {
      tier: 1,
      tierName: 'mandatory',
      keywords: tier1,
      maxOccurrences: maxOccurrences + 1, // One extra for mandatory
    },
    {
      tier: 2,
      tierName: 'major',
      keywords: tier2,
      maxOccurrences,
    },
    {
      tier: 3,
      tierName: 'contextual',
      keywords: tier3,
      maxOccurrences: Math.max(1, maxOccurrences - 1),
    },
    {
      tier: 4,
      tierName: 'filler',
      keywords: tier4.slice(0, 20), // Limit filler to top 20
      maxOccurrences: 1,
    },
  ];
}

// ─── Main Service ─────────────────────────────────────────────────────

/**
 * Build a tiered keyword strategy for document generation.
 */
export function buildKeywordStrategy(params: {
  jobTargetProfile: JobTargetProfile;
  evidenceProfile: any; // EvidenceProfile but avoiding circular import
  gapAnalysis: GapAnalysis;
  mode: 'standard' | 'standout';
}): KeywordStrategy {
  const { jobTargetProfile, gapAnalysis, mode } = params;

  // Score all keywords
  const scoredKeywords = scoreKeywords(jobTargetProfile, gapAnalysis);

  // Assign to tiers
  const tiers = assignTiers(scoredKeywords, mode);

  // Calculate coverage target based on mode
  const coverageTarget = mode === 'standout' ? 0.85 : 0.70;

  // Total keywords across all tiers
  const totalKeywords = tiers.reduce((sum, t) => sum + t.keywords.length, 0);

  return {
    tiers,
    totalKeywords,
    coverageTarget,
    mode,
  };
}

/**
 * Get keywords for a specific tier.
 */
export function getKeywordsForTier(
  strategy: KeywordStrategy,
  tier: 1 | 2 | 3 | 4
): string[] {
  return strategy.tiers.find(t => t.tier === tier)?.keywords || [];
}

/**
 * Get all keywords flattened with their max occurrences.
 */
export function getAllKeywords(strategy: KeywordStrategy): Array<{
  keyword: string;
  tier: number;
  maxOccurrences: number;
}> {
  return strategy.tiers.flatMap(t =>
    t.keywords.map(kw => ({
      keyword: kw,
      tier: t.tier,
      maxOccurrences: t.maxOccurrences,
    }))
  );
}
