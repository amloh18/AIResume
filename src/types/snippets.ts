import { LayoutType } from '@/lib/templates/template-definition';
import { DateFormatStyle } from '@/lib/utils/textFormatting';

/**
 * Snippet categories — which section type the snippet applies to
 */
export type SnippetCategory = 'skills' | 'dates' | 'sectionTitle' | 'summary' | 'basic';

/**
 * Each snippet is a render variant for a category
 */
export interface SnippetDefinition {
  id: string;
  category: SnippetCategory;
  name: string;
  description?: string;
  icon?: string;
  compatibleLayouts: LayoutType[];
  /** Optional config passed to the snippet component */
  config?: Record<string, any>;
}

/**
 * Active snippets stored per-document — maps category to snippet ID
 */
export interface SnippetOverrides {
  skills?: string;
  dates?: string;
  sectionTitle?: string;
  summary?: string;
  basic?: string;
}

/**
 * Section title style options
 */
export type SectionTitleStyle = 'bordered' | 'minimal' | 'accent' | 'spaced';

/**
 * Summary style options
 */
export type SummaryStyle = 'justified' | 'spaced' | 'highlighted';

/**
 * Basic/contact section style options
 */
export type BasicStyle = 'inline-bar' | 'stacked' | 'minimal';

/**
 * Global format state — applied consistently across the entire document
 */
export interface FormatState {
  dateFormat: DateFormatStyle;
  sectionTitleStyle: SectionTitleStyle;
  summaryStyle: SummaryStyle;
  showContactIcons: boolean;
}
