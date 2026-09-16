import { extractCvEvidenceText } from '@/lib/utils/cv-text-extractor';

export const CV_TAILORING_MODES = ['standard', 'standout'] as const;

export type CvTailoringMode = (typeof CV_TAILORING_MODES)[number];

export const DEFAULT_CV_TAILORING_MODE: CvTailoringMode = 'standard';

export const CV_TAILORING_MODE_LABELS: Record<
  CvTailoringMode,
  { short: string; full: string; description: string }
> = {
  standard: {
    short: 'Normal',
    full: 'Normal',
    description:
      'Stay close to your Master CV. Improve bullets and add only evidenced missing keywords to raise ATS score.',
  },
  standout: {
    short: 'Standout',
    full: 'Standout',
    description:
      'Position you as a top candidate: retitle roles to JD language, fill transferable gaps, and maximise ATS match.',
  },
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'your',
  'are',
  'our',
  'will',
  'this',
  'that',
  'from',
  'have',
  'has',
  'been',
  'were',
  'their',
  'they',
  'them',
  'who',
  'what',
  'when',
  'where',
  'which',
  'into',
  'about',
  'over',
  'such',
  'than',
  'then',
  'also',
  'more',
  'most',
  'other',
  'able',
  'work',
  'role',
  'team',
  'using',
  'including',
  'across',
  'within',
  'must',
  'should',
  'required',
  'preferred',
  'experience',
  'years',
  'plus',
  'etc',
]);

const KNOWN_ATS_PHRASES = [
  'machine learning',
  'data analysis',
  'project management',
  'product management',
  'customer success',
  'full stack',
  'front end',
  'frontend',
  'back end',
  'backend',
  'ci/cd',
  'rest api',
  'graphql',
  'node.js',
  'react native',
  'google cloud',
  'amazon web services',
  'stakeholder management',
  'cross-functional',
  'go-to-market',
  'key account',
  'salesforce',
  'hubspot',
];

export function parseCvTailoringMode(value: unknown): CvTailoringMode {
  if (value === 'standout' || value === 'standard') return value;
  if (value === 'aggressive' || value === 'spotlight' || value === 'front-runner' || value === 'better') {
    return 'standout';
  }
  if (value === 'normal' || value === 'match' || value === 'faithful' || value === 'ats-match') {
    return 'standard';
  }
  return DEFAULT_CV_TAILORING_MODE;
}

function tokenizeJd(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\-\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

/**
 * Pull ATS-relevant phrases from a job description without an extra model call.
 * Exact JD wording matters: parsers score literal token overlap.
 *
 * Ranking is FREQUENCY-WEIGHTED. A term a JD repeats five times is more central
 * to the role than a term mentioned once, and the previous implementation let
 * the fixed KNOWN_ATS_PHRASES list occupy the top slots purely because of its
 * order. Multi-word known phrases get a small bonus because an exact phrase
 * match is worth more to a parser than a single token, but they no longer
 * outrank a term the JD actually emphasises.
 */
export function extractAtsKeywords(jobDescription: string, limit = 28): string[] {
  if (!jobDescription?.trim()) return [];

  const lower = jobDescription.toLowerCase();

  // Score every candidate. Counts are token occurrences in the JD.
  const scores = new Map<string, number>();

  const tokenCounts = new Map<string, number>();
  for (const token of tokenizeJd(jobDescription)) {
    if (token.length < 4) continue;
    if (/^\d+$/.test(token)) continue;
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }
  for (const [token, count] of tokenCounts) {
    scores.set(token, count);
  }

  // Known multi-word phrases: score by how often the phrase appears, with a
  // bonus so an exact phrase beats an equally frequent bare token.
  const PHRASE_BONUS = 1.5;
  for (const phrase of KNOWN_ATS_PHRASES) {
    const occurrences = lower.split(phrase).length - 1;
    if (occurrences === 0) continue;
    scores.set(phrase, occurrences + PHRASE_BONUS);
  }

  // A single-token known phrase that is also a token should not be double counted.
  const ranked = [...scores.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      // Deterministic tie-break: longer phrase first, then alphabetical.
      if (b[0].length !== a[0].length) return b[0].length - a[0].length;
      return a[0].localeCompare(b[0]);
    })
    .map(([term]) => term);

  return ranked.slice(0, limit);
}

/**
 * Refinement seed block for the CV tailoring prompt.
 *
 * The seed is a prior CV for a comparable role. It is used ONLY to tell the
 * model which of this job's keywords are reachable — never to copy wording or
 * claims. See CVRefinementSeed for why no free text crosses the boundary.
 */
export interface CvRefinementSeedInput {
  seedCVTitle: string;
  confidence: number;
  alreadyEvidencedKeywords: string[];
  stillMissingKeywords: string[];
  notes: string[];
}

function buildRefinementSeedBlock(seed?: CvRefinementSeedInput | null): string {
  if (!seed) return '';

  const evidenced =
    seed.alreadyEvidencedKeywords.length > 0
      ? seed.alreadyEvidencedKeywords.join(', ')
      : 'none';
  const missing =
    seed.stillMissingKeywords.length > 0
      ? seed.stillMissingKeywords.join(', ')
      : 'none';

  return `
### REFINEMENT SEED (IMPORTANT — READ CAREFULLY)
A previous CV of this candidate ("${seed.seedCVTitle}", ${Math.round(
    seed.confidence * 100
  )}% comparable to this role) already evidences some of this job's keywords.

Already evidenced by that CV: ${evidenced}
Still unevidenced anywhere: ${missing}

Rules for using the seed:
- Use it as a TARGET LIST only. Your job is to make THIS CV reach at least the
  same keyword coverage, using this candidate's own Master CV evidence.
- Do NOT copy sentences, bullets, or phrasing from that CV. It may contain
  hand-edits that the Master CV does not support, and copying them would put
  unverified claims into a document the candidate is about to send.
- A keyword counts as "evidenced" only when the Master CV shows the candidate
  actually did that work. If a keyword appears in "still unevidenced", leave it
  out rather than inventing support for it.
${seed.notes.length > 0 ? seed.notes.map((n) => `- ${n}`).join('\n') : ''}
`;
}

export function buildCvTailoringPrompt(params: {
  mode: CvTailoringMode;
  cvData: unknown;
  jobTitle: string;
  company: string;
  jobDescription: string;
  atsKeywords: string[];
  refinementSeed?: CvRefinementSeedInput | null;
}): string {
  const { mode, cvData, jobTitle, company, jobDescription, atsKeywords, refinementSeed } =
    params;
  const keywordBlock = atsKeywords.length > 0 ? atsKeywords.join(', ') : 'none extracted';
  const modeRules =
    mode === 'standout' ? STAND_OUT_CV_RULES : STANDARD_CV_RULES;
  const seedBlock = buildRefinementSeedBlock(refinementSeed);

  return `**Role**: ATS-aware resume writer.
**Mode**: ${mode === 'standout' ? 'STANDOUT' : 'NORMAL'}
**Goal**: Return a tailored UnifiedCVDataStructure JSON that raises ATS keyword match while staying truthful to the Master CV.

### ATS LOGIC (APPLY IN BOTH MODES)
- Mirror the job description's exact tokens when the candidate already has that skill or a close synonym in the Master CV (e.g. "JS" → "JavaScript" if JD says JavaScript).
- Put the target job title (or a truthful close variant) in the professional summary.
- Weave critical keywords into summary, skills, and the most recent 1–2 roles. Do not keyword-stuff or invent employers, dates, or metrics.
- Keep ATS-safe structure: standard section keys, reverse chronology, no tables, no columns, no icons-as-text.
- Prefer quantified bullets: [verb] + [scope] + [result]. Improve weak bullets instead of deleting evidence.
- Never omit a role that would create a 6+ month employment gap.
- Preserve every number that already exists on the Master CV.
${seedBlock}
${modeRules}

### TARGET JOB
Title: ${jobTitle}
Company: ${company}
Priority ATS keywords: ${keywordBlock}

Description:
${jobDescription}

### MASTER CV JSON
${JSON.stringify(cvData)}

### OUTPUT
Return ONLY valid JSON matching the input UnifiedCVDataStructure keys 1:1. No markdown.`;
}

const STANDARD_CV_RULES = `### NORMAL MODE RULES (CONSERVATIVE)
- Stay faithful to the Master CV. Do not invent new jobs, degrees, or tools the candidate never used.
- You MAY add a missing skill to the skills section only if it is already evidenced in a bullet, project, or tool list (including obvious synonyms).
- Lightly rewrite bullets to include JD language the candidate already earned. Do not inflate seniority.
- Do not change job titles except spelling/casing alignment (e.g. "Sr." → "Senior") when it matches the JD.
- Add at most a few supporting phrases for missing-but-evidenced skills. If a JD must-have has zero evidence, leave it out and do not fake it.
- Cover letter/CV tone: professional, accurate, not salesy.`;

const STAND_OUT_CV_RULES = `### STANDOUT RULES (POSITION AS TOP CANDIDATE)
- Still do not fabricate employers, dates, degrees, or metrics.
- Aggressively reframe transferable experience using the JD's own nouns and verbs.
- You MAY retitle roles toward the JD title when the work is genuinely the same function (e.g. "Support Lead" → "Customer Success Manager") — keep the original employer and dates.
- Fill skill gaps with adjacent, evidenced capabilities and functional synonyms. You may surface implied tools only when the Master CV clearly describes that work (e.g. SQL from "wrote reporting queries").
- Lead with the strongest, most JD-relevant bullets; reorder highlights within a role for impact.
- Write the summary as a top-1% fit: years + target title + 2 JD problem/proof points.
- If underskilled vs JD seniority, emphasise ownership, scale, and learning velocity without claiming a title the person never held at that company beyond the retitle rule above.`;

export function buildCoverLetterTailoringPrompt(params: {
  mode: CvTailoringMode;
  jobTitle: string;
  company: string;
  experience: string;
  jobDescription: string;
  atsKeywords: string[];
}): string {
  const { mode, jobTitle, company, experience, jobDescription, atsKeywords } = params;
  const keywordBlock = atsKeywords.length > 0 ? atsKeywords.join(', ') : 'none extracted';
  const modeLine =
    mode === 'standout'
      ? `STANDOUT: Position the candidate as the obvious hire. Be assertive, map experience to the company's stated problems, and use JD language. Do not invent facts. Open with the company challenge, not "I am applying".`
      : `NORMAL: Stay close to the Master CV. Connect real experience to the role with modest emphasis. Integrate a few exact JD keywords naturally. Do not invent facts. Open with the company, not "I am applying".`;

  return `Write a cover letter for ${jobTitle} at ${company}.
${modeLine}

Keep the body under 220 words. End with a short sign-off and the candidate's name if present in the experience block.

Priority ATS keywords to weave in naturally: ${keywordBlock}

Candidate experience:
${experience}

Job description:
${jobDescription}`;
}

function titleCaseKeyword(keyword: string): string {
  if (keyword === keyword.toUpperCase() && keyword.length <= 5) return keyword;
  if (keyword.includes('.')) return keyword;
  return keyword.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Does a piece of evidence text support this keyword?
 *
 * Word-boundary aware for single tokens so "Java" does not match "JavaScript"
 * and "Go" does not match "going". Multi-word keywords are matched as phrases.
 * Kept in sync with `textEvidencesKeyword` in the refinement engine so the
 * refinement seed and this pass never disagree about what counts as evidenced.
 */
function evidenceSupportsKeyword(evidenceText: string, keyword: string): boolean {
  if (!evidenceText || !keyword) return false;

  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;

  if (/\s/.test(kw)) {
    return evidenceText.includes(kw);
  }

  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}($|[^a-z0-9+#.])`, 'i').test(evidenceText);
}

export interface DeterministicAtsPassResult<T = any> {
  cvData: T;
  /** Keywords that were added to the skills section by this pass. */
  pinnedKeywords: string[];
  /** Keywords deliberately NOT pinned because nothing in the CV evidences them. */
  skippedKeywords: string[];
}

/**
 * After the model rewrite, pin exact JD tokens into skills/summary when the
 * candidate's EXPERIENCE genuinely evidences them. Parsers reward literal
 * overlap, so this closes the gap between "the CV describes doing X" and "the
 * CV contains the token X".
 *
 * Evidence test (important):
 *   The previous implementation searched `JSON.stringify(cvData).toLowerCase()`
 *   — the entire document, including object KEYS and the skills list itself.
 *   That made the check both too loose (a keyword matched if it appeared as a
 *   field name or anywhere in the JSON, even in unrelated metadata) and circular
 *   (a keyword already in skills counted as its own evidence).
 *
 *   It now searches `extractCvEvidenceText(cvData)` — work experience, projects,
 *   certifications, volunteer work, and coursework only. Skills and the summary
 *   are excluded on purpose: the summary is written by the same generation pass,
 *   so letting it self-certify keywords would make this pass meaningless.
 *
 * The pass never fabricates: a keyword with no supporting evidence is reported
 * in `skippedKeywords` and left out of the CV.
 */
export function applyDeterministicAtsPass(
  cvData: unknown,
  params: { jobTitle: string; atsKeywords: string[]; mode: CvTailoringMode }
): DeterministicAtsPassResult {
  if (!cvData || typeof cvData !== 'object') {
    return { cvData, pinnedKeywords: [], skippedKeywords: [] };
  }

  const next = JSON.parse(JSON.stringify(cvData)) as {
    basics?: { summary?: string };
    skills?: Array<{ category?: string; skills?: string[] }>;
  };

  const evidenceText = extractCvEvidenceText(next);
  const keywordLimit = params.mode === 'standout' ? 14 : 8;

  const evidenced: string[] = [];
  const skipped: string[] = [];
  for (const keyword of params.atsKeywords) {
    if (evidenceSupportsKeyword(evidenceText, keyword)) {
      evidenced.push(keyword);
    } else {
      skipped.push(keyword);
    }
  }

  const toPin = evidenced.slice(0, keywordLimit);

  if (!Array.isArray(next.skills) || next.skills.length === 0) {
    next.skills = [{ category: 'Core skills', skills: [] }];
  }

  const group = next.skills[0];
  if (!Array.isArray(group.skills)) group.skills = [];
  const existing = new Set(group.skills.map((skill) => String(skill).toLowerCase()));
  const pinnedKeywords: string[] = [];
  for (const keyword of toPin) {
    if (existing.has(keyword.toLowerCase())) continue;
    group.skills.push(titleCaseKeyword(keyword));
    existing.add(keyword.toLowerCase());
    pinnedKeywords.push(keyword);
  }

  const summary = next.basics?.summary || '';
  const jobTitle = params.jobTitle?.trim();
  if (jobTitle && next.basics && !summary.toLowerCase().includes(jobTitle.toLowerCase())) {
    next.basics.summary = summary
      ? `${jobTitle}. ${summary}`
      : `${jobTitle} with experience aligned to this role.`;
  }

  return {
    cvData: next,
    pinnedKeywords,
    skippedKeywords: skipped,
  };
}
