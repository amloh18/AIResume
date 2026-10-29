/**
 * Smart "what should I add next?" suggestions for the canvas.
 *
 * The add-section affordance used to be a single generic pill: hovering between
 * two sections only ever offered "Add Section", which opened a catalogue of ~70
 * styles across 14 categories and left the user to work out which section their
 * CV was missing. This module answers that question instead, from what the
 * document already contains and what it holds — deterministically, so the same
 * CV always gets the same suggestions and nothing is invented.
 *
 * It is a pure function (no React, no DOM) on purpose: the ranking is a product
 * rule, and it can be asserted directly.
 */

export interface SectionSuggestion {
  /** Snippet category, e.g. `Interests`. */
  category: string;
  /** The spec style offered when the suggestion is accepted. */
  snippetType: string;
  /** One short line explaining why this section is worth adding. */
  reason: string;
}

export interface SectionSuggestionInput {
  /** Categories already present on the canvas (e.g. ['Languages', 'Education']). */
  presentCategories: string[];
  /** The canvas CV data (used only to check whether a section has content). */
  cvData?: any;
  /**
   * Category of the section immediately ABOVE the insertion point, when there is
   * one. The strip between two sections is a positional question ("what belongs
   * here?"), and a CV reads top-to-bottom: hovering under Languages should offer
   * Interests/Publications, not "Summary", which belongs above the fold.
   */
  afterCategory?: string;
  /** How many suggestions to return. */
  limit?: number;
}

const hasContent = (cvData: any, key: string): boolean => {
  const value = cvData?.[key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value);
};

/**
 * Rules are evaluated in order and the first `limit` misses are returned.
 *
 * `weight` is context: a rule whose trigger is present in THIS CV (you already
 * list languages, you have an academic record, you have roles but no projects)
 * outranks a generic "the standard sections are missing" rule, so the panel
 * follows the document rather than a fixed checklist. Provide a short, concrete
 * reason — the panel shows it under the section name.
 */
const RULES: Array<{
  category: string;
  snippetType: string;
  reason: string;
  /** Higher first. */
  weight: number;
  /** Categories this section conventionally follows in a CV. */
  follows: string[];
  missing: (present: Set<string>) => boolean;
}> = [
  {
    category: 'Summary',
    snippetType: 'summary-clean',
    reason: 'Recruiters read this first — two lines on who you are.',
    weight: 90,
    follows: [],
    missing: (present) => !present.has('Summary'),
  },
  {
    category: 'Skills',
    snippetType: 'skills-category-inline',
    reason: 'Give ATS keywords their own, scannable section.',
    weight: 85,
    follows: ['Experience'],
    missing: (present) => !present.has('Skills'),
  },
  {
    category: 'Experience',
    snippetType: 'experience-standard',
    reason: 'The section every application is judged on.',
    weight: 80,
    follows: ['Summary'],
    missing: (present) => !present.has('Experience'),
  },
  {
    category: 'Education',
    snippetType: 'education-standard',
    reason: 'Most applications expect your education.',
    weight: 75,
    follows: ['Experience', 'Skills'],
    missing: (present) => !present.has('Education'),
  },
  {
    category: 'Interests',
    snippetType: 'interests-comma',
    reason: 'Pairs naturally with languages — a little personality.',
    weight: 70,
    follows: ['Languages', 'Skills', 'Awards'],
    missing: (present) => !present.has('Interests') && present.has('Languages'),
  },
  {
    category: 'Projects',
    snippetType: 'projects-standard',
    reason: 'Show the work behind the job titles.',
    weight: 68,
    follows: ['Experience', 'Skills'],
    missing: (present) => !present.has('Projects') && present.has('Experience'),
  },
  {
    category: 'Publications',
    snippetType: 'publications-standard',
    reason: 'An academic record reads stronger with publications listed.',
    weight: 66,
    follows: ['Education', 'Languages', 'Interests'],
    missing: (present) => !present.has('Publications') && present.has('Education'),
  },
  {
    category: 'Certifications',
    snippetType: 'certifications-standard',
    reason: 'Proof of the skills you claim.',
    weight: 60,
    follows: ['Education', 'Skills'],
    missing: (present) => !present.has('Certifications'),
  },
  {
    category: 'Volunteer',
    snippetType: 'volunteer-standard',
    reason: 'Adds dimension beyond paid roles.',
    weight: 55,
    follows: ['Projects', 'Awards'],
    missing: (present) => !present.has('Volunteer') && present.has('Experience'),
  },
  {
    category: 'Awards',
    snippetType: 'awards-standard',
    reason: 'A short, high-signal list when you have them.',
    weight: 50,
    follows: ['Projects', 'Publications', 'Experience'],
    missing: (present) => !present.has('Awards'),
  },
  {
    category: 'Languages',
    snippetType: 'languages-comma',
    reason: 'Useful for international and remote roles.',
    weight: 45,
    follows: ['Skills', 'Education'],
    missing: (present) => !present.has('Languages'),
  },
  {
    category: 'References',
    snippetType: 'references-standard',
    reason: 'Only when an employer asks — usually left off.',
    weight: 20,
    follows: ['Awards', 'Publications', 'Interests'],
    missing: (present) => !present.has('References'),
  },
];

/** Categories whose `hasContent` equivalent is in the CV data itself. */
const CONTENT_KEY: Record<string, string> = {
  Summary: 'basics',
  Skills: 'skills',
  Experience: 'experience',
  Education: 'education',
  Projects: 'projects',
  Certifications: 'certifications',
  Awards: 'awards',
  Publications: 'publications',
  Volunteer: 'volunteer',
  Languages: 'languages',
  Interests: 'interests',
  References: 'references',
};

const sectionHasContent = (cvData: any, category: string): boolean => {
  if (!cvData) return false;
  if (category === 'Summary') {
    return typeof cvData?.basics?.summary === 'string' && cvData.basics.summary.trim().length > 0;
  }
  const key = CONTENT_KEY[category];
  return key ? hasContent(cvData, key) : false;
};

/**
 * Suggest the sections this CV is most likely to want next.
 *
 * `presentCategories` is the authority on what is already on the canvas — a
 * section that exists but is empty is NOT suggested again (the user can add
 * entries to it in place). Data is only used to break ties in favour of
 * sections that have material behind them.
 */
export function suggestNextSections({
  presentCategories,
  cvData,
  afterCategory,
  limit = 3,
}: SectionSuggestionInput): SectionSuggestion[] {
  const present = new Set(
    (presentCategories || [])
      .map((category) => String(category || '').trim())
      .filter(Boolean)
  );
  const anchor = String(afterCategory || '').trim();

  return RULES.filter((rule) => rule.missing(present))
    .map((rule) => ({
      rule,
      // Position wins over the generic checklist: the strip is an insertion
      // point, so "what comes after this section" beats "what is usually first".
      boost:
        (anchor && rule.follows.includes(anchor) ? 40 : 0) +
        (sectionHasContent(cvData, rule.category) ? 6 : 0),
    }))
    .sort((a, b) => (b.rule.weight + b.boost) - (a.rule.weight + a.boost))
    .slice(0, Math.max(0, limit))
    .map(({ rule }) => ({
      category: rule.category,
      snippetType: rule.snippetType,
      reason: rule.reason,
    }));
}
