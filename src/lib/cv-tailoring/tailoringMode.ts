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
 */
export function extractAtsKeywords(jobDescription: string, limit = 28): string[] {
  if (!jobDescription?.trim()) return [];

  const lower = jobDescription.toLowerCase();
  const hits: string[] = [];

  for (const phrase of KNOWN_ATS_PHRASES) {
    if (lower.includes(phrase)) hits.push(phrase);
  }

  const counts = new Map<string, number>();
  for (const token of tokenizeJd(jobDescription)) {
    if (token.length < 4) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  const ranked = [...counts.entries()]
    .filter(([token, count]) => count >= 1 && !/^\d+$/.test(token))
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  for (const token of ranked) {
    if (hits.length >= limit) break;
    if (!hits.includes(token)) hits.push(token);
  }

  return hits.slice(0, limit);
}

export function buildCvTailoringPrompt(params: {
  mode: CvTailoringMode;
  cvData: unknown;
  jobTitle: string;
  company: string;
  jobDescription: string;
  atsKeywords: string[];
}): string {
  const { mode, cvData, jobTitle, company, jobDescription, atsKeywords } = params;
  const keywordBlock = atsKeywords.length > 0 ? atsKeywords.join(', ') : 'none extracted';
  const modeRules =
    mode === 'standout' ? STAND_OUT_CV_RULES : STANDARD_CV_RULES;

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

function cvTextBlob(cvData: unknown): string {
  try {
    return JSON.stringify(cvData).toLowerCase();
  } catch {
    return '';
  }
}

function titleCaseKeyword(keyword: string): string {
  if (keyword === keyword.toUpperCase() && keyword.length <= 5) return keyword;
  if (keyword.includes('.')) return keyword;
  return keyword.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * After the model rewrite, pin exact JD tokens into skills/summary when they
 * already exist somewhere on the Master/tailored CV. Parsers reward literal overlap.
 */
export function applyDeterministicAtsPass(
  cvData: unknown,
  params: { jobTitle: string; atsKeywords: string[]; mode: CvTailoringMode }
): unknown {
  if (!cvData || typeof cvData !== 'object') return cvData;

  const next = JSON.parse(JSON.stringify(cvData)) as {
    basics?: { summary?: string };
    skills?: Array<{ category?: string; skills?: string[] }>;
  };
  const blob = cvTextBlob(next);
  const keywordLimit = params.mode === 'standout' ? 14 : 8;
  const evidenced = params.atsKeywords
    .filter((keyword) => blob.includes(keyword.toLowerCase()))
    .slice(0, keywordLimit);

  if (!Array.isArray(next.skills) || next.skills.length === 0) {
    next.skills = [{ category: 'Core skills', skills: [] }];
  }

  const group = next.skills[0];
  if (!Array.isArray(group.skills)) group.skills = [];
  const existing = new Set(group.skills.map((skill) => skill.toLowerCase()));
  for (const keyword of evidenced) {
    if (existing.has(keyword.toLowerCase())) continue;
    group.skills.push(titleCaseKeyword(keyword));
    existing.add(keyword.toLowerCase());
  }

  const summary = next.basics?.summary || '';
  const jobTitle = params.jobTitle?.trim();
  if (jobTitle && next.basics && !summary.toLowerCase().includes(jobTitle.toLowerCase())) {
    next.basics.summary = summary
      ? `${jobTitle}. ${summary}`
      : `${jobTitle} with experience aligned to this role.`;
  }

  return next;
}
