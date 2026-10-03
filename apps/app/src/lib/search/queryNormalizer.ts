/**
 * Query Normalizer
 *
 * Converts raw user search input into a structured NormalizedQuery
 * that the candidate retrieval layer can use for multi-stage search.
 *
 * Handles: case normalization, abbreviation expansion, stopword removal,
 * role family resolution, and keyword expansion.
 */

import { resolveRoleFamily, getRelatedFamilies, getFamilySearchTerms, ROLE_TAXONOMY } from '@/lib/taxonomy/roleTaxonomy';

// ── Types ───────────────────────────────────────────────────────────────────

export interface NormalizedQuery {
  original: string;
  normalized: string;
  tokens: string[];
  roleFamily: string | null;
  relatedFamilies: string[];
  keywords: string[];
  isExactRoleMatch: boolean;
  matchTier: 'EXACT' | 'CLOSE' | 'RELATED' | 'ADJACENT';
}

// ── Abbreviation Map ────────────────────────────────────────────────────────

const ABBREVIATION_MAP: Record<string, string> = {
  sr: 'senior',
  'sr.': 'senior',
  jr: 'junior',
  'jr.': 'junior',
  eng: 'engineer',
  dev: 'developer',
  pm: 'product manager',
  qa: 'quality assurance',
  sre: 'site reliability engineer',
  'swe': 'software engineer',
  fe: 'frontend',
  'fe.': 'frontend',
  be: 'backend',
  'be.': 'backend',
  fs: 'full stack',
  ui: 'user interface',
  ux: 'user experience',
  db: 'database',
  admin: 'administrator',
  ops: 'operations',
  sec: 'security',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  bi: 'business intelligence',
  devops: 'devops',
  rm: 'release manager',
  tp: 'technical program',
  tpn: 'technical program manager',
  cto: 'chief technology officer',
  ceo: 'chief executive officer',
  coo: 'chief operating officer',
  cfo: 'chief financial officer',
  vp: 'vice president',
  dir: 'director',
  hd: 'head',
  intl: 'international',
  assoc: 'associate',
  asst: 'assistant',
  exec: 'executive',
  coord: 'coordinator',
  tech: 'technical',
  'tech.': 'technical',
  sys: 'systems',
  'sys.': 'systems',
  net: 'network',
  'net.': 'network',
  infra: 'infrastructure',
  secops: 'security operations',
  finops: 'finance operations',
  noops: 'no operations',
  it: 'information technology',
  hr: 'human resources',
  pr: 'public relations',
  bd: 'business development',
  cs: 'customer success',
  cx: 'customer experience',
  saas: 'software as a service',
  paas: 'platform as a service',
  iaas: 'infrastructure as a service',
  b2b: 'business to business',
  b2c: 'business to consumer',
  etl: 'extract transform load',
  crm: 'customer relationship management',
  erp: 'enterprise resource planning',
  api: 'application programming interface',
  sdk: 'software development kit',
  cli: 'command line interface',
  gui: 'graphical user interface',
  nlp: 'natural language processing',
  cv: 'computer vision',
  iot: 'internet of things',
  ar: 'augmented reality',
  vr: 'virtual reality',
  xr: 'extended reality',
};

// ── Stopwords ───────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'jobs', 'job', 'hiring', 'careers', 'career', 'vacancy', 'vacancies',
  'position', 'role', 'opening', ' openings', 'opportunity', 'opportunities',
  'near', 'me', 'now', 'today', 'remote', 'hybrid', 'onsite', 'on-site',
  'full-time', 'part-time', 'contract', 'permanent', 'temporary',
  'entry', 'level', 'junior', 'senior', 'lead', 'principal', 'staff',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were',
  'looking', 'want', 'seeking', 'find', 'search', 'searching',
  'required', 'needed', 'wanted', 'good', 'great', 'best', 'top',
  'work', 'working', 'works', 'position', 'place',
]);

// ── Singular/Plural Normalization ────────────────────────────────────────────

const PLURAL_MAP: Record<string, string> = {
  analysts: 'analyst',
  engineers: 'engineer',
  developers: 'developer',
  designers: 'designer',
  managers: 'manager',
  specialists: 'specialist',
  consultants: 'consultant',
  architects: 'architect',
  scientists: 'scientist',
  administrators: 'administrator',
  technicians: 'technician',
  professors: 'professor',
  leads: 'lead',
  interns: 'intern',
  assistants: 'assistant',
  coordinators: 'coordinator',
  representatives: 'representative',
  executives: 'executive',
};

function normalizePlural(word: string): string {
  if (PLURAL_MAP[word]) return PLURAL_MAP[word];
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

// ── Core Normalizer ─────────────────────────────────────────────────────────

/**
 * Normalize a raw search query into a structured NormalizedQuery.
 */
export function normalizeQuery(raw: string): NormalizedQuery {
  const original = raw.trim();

  // Step 1: Basic normalization
  let normalized = original.toLowerCase().trim();

  // Step 2: Remove punctuation (keep hyphens in compound words)
  normalized = normalized.replace(/[^a-z0-9\s\-]/g, ' ');

  // Step 3: Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Step 4: Remove stopwords
  const allTokens = normalized.split(' ');
  const contentTokens = allTokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);

  // Step 5: Expand abbreviations
  const expandedTokens = contentTokens.map((t) => {
    // Check compound abbreviations first (e.g., "full stack")
    const joined = contentTokens.join(' ');
    for (const [abbr, expansion] of Object.entries(ABBREVIATION_MAP)) {
      if (joined.includes(abbr)) {
        return t.replace(abbr, expansion);
      }
    }
    return ABBREVIATION_MAP[t] || t;
  });

  // Step 6: Normalize plurals
  const singularTokens = expandedTokens.map(normalizePlural);

  // Step 7: Rebuild normalized string
  const normalizedString = singularTokens.join(' ').trim();

  // Step 8: Resolve role family
  const roleFamily = resolveRoleFamily(normalizedString);

  // Step 9: Check for exact role match against taxonomy primary titles
  let isExactRoleMatch = false;
  let matchTier: NormalizedQuery['matchTier'] = 'ADJACENT';

  if (roleFamily) {
    const family = ROLE_TAXONOMY[roleFamily];
    const normalizedForMatch = normalizedString.replace(/\s+/g, ' ').trim();

    // Check primary titles
    if (family.primary.some((t) => t === normalizedForMatch || normalizedForMatch.includes(t) || t.includes(normalizedForMatch))) {
      isExactRoleMatch = true;
      matchTier = 'EXACT';
    }
    // Check related titles
    else if (family.related.some((t) => normalizedForMatch.includes(t) || t.includes(normalizedForMatch))) {
      matchTier = 'CLOSE';
    }
    // Check keywords
    else if (family.keywords.some((kw) => normalizedForMatch.includes(kw) || kw.includes(normalizedForMatch))) {
      matchTier = 'RELATED';
    }
  }

  // Step 10: Get related families
  const relatedFamilies = roleFamily ? getRelatedFamilies(roleFamily) : [];

  // Step 11: Build expanded keyword list
  const keywords = new Set<string>(singularTokens);
  if (roleFamily) {
    const searchTerms = getFamilySearchTerms(roleFamily);
    for (const term of searchTerms) {
      keywords.add(term);
    }
  }

  return {
    original,
    normalized: normalizedString,
    tokens: singularTokens,
    roleFamily,
    relatedFamilies,
    keywords: Array.from(keywords),
    isExactRoleMatch,
    matchTier,
  };
}

/**
 * Generate search suggestions from a partial query.
 * Used by the search autocomplete API.
 */
export function getSuggestions(partial: string, limit = 5): string[] {
  const normalized = partial.toLowerCase().trim();
  if (normalized.length < 2) return [];

  const suggestions = new Set<string>();

  // Match against taxonomy primary and related titles
  for (const family of Object.values(ROLE_TAXONOMY)) {
    for (const title of family.primary) {
      if (title.includes(normalized)) {
        suggestions.add(title.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    }
    for (const title of family.related) {
      if (title.includes(normalized)) {
        suggestions.add(title.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    }
    if (suggestions.size >= limit * 2) break;
  }

  // Sort by relevance (exact prefix matches first)
  return Array.from(suggestions)
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(normalized) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.length - b.length;
    })
    .slice(0, limit);
}
