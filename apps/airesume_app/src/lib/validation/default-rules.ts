import {
  CVLayoutRules,
  SectionFormatRule,
  LayoutRules,
  TypographyRules,
  EdgeCaseRules,
} from './cv-layout-rules';

// ─── SECTION FORMAT DEFAULTS ──────────────────────────────

export const DEFAULT_SECTION_FORMATS: Record<string, SectionFormatRule> = {
  profile: {
    sectionType: 'profile',
    format: 'paragraph',
    displayAs: 'p',
    constraints: {
      maxCharacters: 500,
      maxLines: 5,
    },
  },
  work_experience: {
    sectionType: 'work_experience',
    format: 'bullets',
    displayAs: 'ul',
    constraints: {
      maxBullets: 6,
      maxCharacters: 2000,
      requireActionVerb: true,
    },
  },
  education: {
    sectionType: 'education',
    format: 'multi-line-stack',
    displayAs: 'stack',
    constraints: {
      maxCharacters: 500,
    },
  },
  skills: {
    sectionType: 'skills',
    format: 'inline-tags',
    displayAs: 'inline-pills',
    constraints: {
      maxWordsPerItem: 3,
    },
  },
  projects: {
    sectionType: 'projects',
    format: 'bullets',
    displayAs: 'ul',
    constraints: {
      maxBullets: 4,
      maxCharacters: 1500,
      requireActionVerb: true,
    },
  },
  certificates: {
    sectionType: 'certificates',
    format: 'multi-line-stack',
    displayAs: 'stack',
    constraints: {
      maxCharacters: 300,
    },
  },
  languages: {
    sectionType: 'languages',
    format: 'inline-tags',
    displayAs: 'inline-pills',
    constraints: {},
  },
  volunteer: {
    sectionType: 'volunteer',
    format: 'bullets',
    displayAs: 'ul',
    constraints: {
      maxBullets: 4,
      maxCharacters: 1000,
      requireActionVerb: true,
    },
  },
  awards: {
    sectionType: 'awards',
    format: 'multi-line-stack',
    displayAs: 'stack',
    constraints: {
      maxCharacters: 300,
    },
  },
  publications: {
    sectionType: 'publications',
    format: 'multi-line-stack',
    displayAs: 'stack',
    constraints: {
      maxCharacters: 300,
    },
  },
  personal_header: {
    sectionType: 'personal_header',
    format: 'multi-line-stack',
    displayAs: 'stack',
    constraints: {},
  },
};

// ─── LAYOUT DEFAULTS ─────────────────────────────────────

export const DEFAULT_LAYOUT_RULES: LayoutRules = {
  dateTitleAnchor: {
    enabled: true,
    container: 'flex-justify-space-between',
    dateContainer: { whiteSpace: 'nowrap' },
    dateFlexShrink: true,
    titleTruncation: 'ellipsis',
  },
  twoThirds: {
    enabled: true,
    maxWidthPercent: 75,
  },
  verticalRhythm: {
    sectionSpacing: '24px',
    itemSpacing: '12px',
    ratio: 2.0,
  },
  contactInfo: {
    format: 'single-line',
    separator: 'slash',
    noWrapFields: ['email', 'url'],
    truncateStrategy: 'shorten',
    maxDisplayLength: 30,
  },
  dates: {
    noWrap: true,
    useNonBreakingSpace: true,
    format: 'MMM YYYY',
  },
  pageBreaks: {
    preventOrphanedHeaders: true,
    preventSplitEntries: true,
    minContentOnPage2: 2,
  },
  orphanPrevention: {
    enabled: true,
    minWordsOnLastLine: 2,
    strategy: 'widows-css',
    orphans: 2,
    widows: 2,
  },
};

// ─── TYPOGRAPHY DEFAULTS ─────────────────────────────────

export const DEFAULT_TYPOGRAPHY_RULES: TypographyRules = {
  hierarchy: {
    sectionHeading: {
      fontSize: '12-14pt',
      fontWeight: 'bold',
      casing: 'uppercase',
    },
    entryTitle: {
      fontSize: '10-11pt',
      fontWeight: 'bold',
      casing: 'none',
    },
    entrySubtitle: {
      fontSize: '10pt',
      fontWeight: 'normal',
      casing: 'none',
    },
    bodyText: {
      fontSize: '9-10pt',
      fontWeight: 'normal',
      casing: 'none',
    },
  },
  sectionHeaderConsistency: {
    enforceSameSize: true,
    enforceSameWeight: true,
    enforceSameCasing: 'uppercase',
  },
};

// ─── EDGE CASE DEFAULTS ──────────────────────────────────

export const DEFAULT_EDGE_CASE_RULES: EdgeCaseRules = {
  emptyStates: {
    hideEmptyFields: true,
    hideSurroundingSeparators: true,
    hideEmptyGPA: true,
    hideEmptyLocation: true,
    hideEmptyEndDate: true,
  },
  urlHandling: {
    shortenLongURLs: true,
    maxDisplayLength: 30,
    displayAs: 'domain/path',
  },
  skillsFormatting: {
    maxWordsPerSkill: 3,
    grouping: 'by-category',
    displayAs: 'comma-separated',
    noWrapSkillNames: true,
  },
};

// ─── COMPOSITE DEFAULT ───────────────────────────────────

export const DEFAULT_CV_LAYOUT_RULES: CVLayoutRules = {
  sectionFormats: DEFAULT_SECTION_FORMATS,
  layout: DEFAULT_LAYOUT_RULES,
  typography: DEFAULT_TYPOGRAPHY_RULES,
  edgeCases: DEFAULT_EDGE_CASE_RULES,
};
