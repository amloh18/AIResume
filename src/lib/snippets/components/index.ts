export { SkillsInlineSnippet } from './SkillsInlineSnippet';
export { SkillsTagsSnippet } from './SkillsTagsSnippet';
export { SkillsBarsSnippet } from './SkillsBarsSnippet';
export { SkillsColumnsSnippet } from './SkillsColumnsSnippet';
export {
  TitleBorderedSnippet,
  TitleMinimalSnippet,
  TitleAccentSnippet,
  TitleSpacedSnippet,
} from './TitleSnippets';
export {
  SummaryJustifiedSnippet,
  SummarySpacedSnippet,
  SummaryHighlightedSnippet,
} from './SummarySnippets';
export {
  BasicInlineBarSnippet,
  BasicStackedSnippet,
  BasicMinimalSnippet,
} from './BasicSnippets';

import { SkillsInlineSnippet } from './SkillsInlineSnippet';
import { SkillsTagsSnippet } from './SkillsTagsSnippet';
import { SkillsBarsSnippet } from './SkillsBarsSnippet';
import { SkillsColumnsSnippet } from './SkillsColumnsSnippet';
import { TitleBorderedSnippet, TitleMinimalSnippet, TitleAccentSnippet, TitleSpacedSnippet } from './TitleSnippets';
import { SummaryJustifiedSnippet, SummarySpacedSnippet, SummaryHighlightedSnippet } from './SummarySnippets';
import { BasicInlineBarSnippet, BasicStackedSnippet, BasicMinimalSnippet } from './BasicSnippets';
import { SnippetCategory } from '@/types/snippets';

/**
 * Map of snippet ID to React component for rendering
 */
export const SNIPPET_COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'skills-inline': SkillsInlineSnippet,
  'skills-tags': SkillsTagsSnippet,
  'skills-bars': SkillsBarsSnippet,
  'skills-columns': SkillsColumnsSnippet,
  'title-bordered': TitleBorderedSnippet,
  'title-minimal': TitleMinimalSnippet,
  'title-accent': TitleAccentSnippet,
  'title-spaced': TitleSpacedSnippet,
  'summary-justified': SummaryJustifiedSnippet,
  'summary-spaced': SummarySpacedSnippet,
  'summary-highlighted': SummaryHighlightedSnippet,
  'basic-inline-bar': BasicInlineBarSnippet,
  'basic-stacked': BasicStackedSnippet,
  'basic-minimal': BasicMinimalSnippet,
};

/**
 * Get the default snippet component for a category
 */
export function getDefaultSnippetComponent(category: SnippetCategory): React.ComponentType<any> {
  const defaults: Record<SnippetCategory, string> = {
    skills: 'skills-inline',
    dates: 'date-mmm-yyyy',
    sectionTitle: 'title-bordered',
    summary: 'summary-justified',
    basic: 'basic-inline-bar',
  };
  return SNIPPET_COMPONENT_MAP[defaults[category]] || SkillsInlineSnippet;
}

/**
 * Get a snippet component by ID, falling back to the default for the category
 */
export function getSnippetComponent(snippetId: string | undefined, category: SnippetCategory): React.ComponentType<any> {
  if (snippetId && SNIPPET_COMPONENT_MAP[snippetId]) {
    return SNIPPET_COMPONENT_MAP[snippetId];
  }
  return getDefaultSnippetComponent(category);
}
