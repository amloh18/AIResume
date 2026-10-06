/**
 * CV Layout Rules — Shared Schema
 *
 * Central definition of all CV formatting rules. Consumed by:
 * - Template Layer (CSS enforcement via shared-layout-css.ts)
 * - Preview Layer (real-time validation via cv-preview-validator.ts)
 */

// ─── SECTION FORMAT RULES ──────────────────────────────────

export type SectionFormat = 'paragraph' | 'bullets' | 'inline-tags' | 'multi-line-stack' | 'compact-grid';

export interface SectionFormatRule {
  sectionType: string;
  format: SectionFormat;
  displayAs: 'p' | 'ul' | 'inline-pills' | 'stack';
  constraints: {
    maxCharacters?: number;
    maxLines?: number;
    maxBullets?: number;
    maxWordsPerItem?: number;
    requireActionVerb?: boolean;
  };
}

// ─── LAYOUT RULES ─────────────────────────────────────────

export interface DateTitleAnchorRules {
  enabled: boolean;
  container: 'flex-justify-space-between';
  dateContainer: { whiteSpace: 'nowrap' };
  dateFlexShrink: boolean;
  titleTruncation: 'ellipsis' | 'wrap';
}

export interface TwoThirdsRule {
  enabled: boolean;
  maxWidthPercent: number; // 75
}

export interface VerticalRhythmRules {
  sectionSpacing: string; // e.g., '24px'
  itemSpacing: string; // e.g., '12px'
  ratio: number; // sectionSpacing / itemSpacing, typically 2.0
}

export interface ContactInfoRules {
  format: 'single-line' | 'compact-grid';
  separator: 'pipe' | 'dot' | 'slash';
  noWrapFields: string[]; // ['email', 'url']
  truncateStrategy: 'hyperlink' | 'shorten' | 'full';
  maxDisplayLength: number; // e.g., 30
}

export interface DateRules {
  noWrap: boolean;
  useNonBreakingSpace: boolean;
  format: 'MMM YYYY' | 'MM/YYYY' | 'YYYY';
}

export interface PageBreakRules {
  preventOrphanedHeaders: boolean; // break-after: avoid on h2
  preventSplitEntries: boolean; // break-inside: avoid on entry blocks
  minContentOnPage2: number; // min items before page break
}

export interface OrphanPreventionRules {
  enabled: boolean;
  minWordsOnLastLine: number; // 2
  strategy: 'widows-css' | 'nbsp';
  orphans: number;
  widows: number;
}

export interface LayoutRules {
  dateTitleAnchor: DateTitleAnchorRules;
  twoThirds: TwoThirdsRule;
  verticalRhythm: VerticalRhythmRules;
  contactInfo: ContactInfoRules;
  dates: DateRules;
  pageBreaks: PageBreakRules;
  orphanPrevention: OrphanPreventionRules;
}

// ─── TYPOGRAPHY RULES ─────────────────────────────────────

export interface TypographyLevel {
  fontSize: string;
  fontWeight: string;
  casing: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}

export interface TypographyRules {
  hierarchy: {
    sectionHeading: TypographyLevel;
    entryTitle: TypographyLevel;
    entrySubtitle: TypographyLevel;
    bodyText: TypographyLevel;
  };
  sectionHeaderConsistency: {
    enforceSameSize: boolean;
    enforceSameWeight: boolean;
    enforceSameCasing: 'uppercase' | 'title-case' | 'none';
  };
}

// ─── EDGE CASE RULES ──────────────────────────────────────

export interface EmptyStateRules {
  hideEmptyFields: boolean;
  hideSurroundingSeparators: boolean;
  hideEmptyGPA: boolean;
  hideEmptyLocation: boolean;
  hideEmptyEndDate: boolean;
}

export interface URLHandlingRules {
  shortenLongURLs: boolean;
  maxDisplayLength: number;
  displayAs: 'domain/path' | 'custom-text' | 'full';
}

export interface SkillsFormattingRules {
  maxWordsPerSkill: number;
  grouping: 'by-category' | 'flat';
  displayAs: 'comma-separated' | 'pills' | 'list';
  noWrapSkillNames: boolean;
}

export interface EdgeCaseRules {
  emptyStates: EmptyStateRules;
  urlHandling: URLHandlingRules;
  skillsFormatting: SkillsFormattingRules;
}

// ─── COMPOSITE RULES OBJECT ───────────────────────────────

export interface CVLayoutRules {
  sectionFormats: Record<string, SectionFormatRule>;
  layout: LayoutRules;
  typography: TypographyRules;
  edgeCases: EdgeCaseRules;
}
