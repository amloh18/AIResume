import { SnippetDefinition, SnippetCategory } from '@/types/snippets';

/**
 * Registry of all available snippets, organized by category.
 * Each entry defines a design variant that can be applied to a section type.
 */
export const SNIPPET_REGISTRY: Record<SnippetCategory, SnippetDefinition[]> = {
  skills: [
    {
      id: 'skills-inline',
      category: 'skills',
      name: 'Inline List',
      description: 'Category: skill1, skill2, skill3',
      compatibleLayouts: ['two-column', 'single-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'skills-tags',
      category: 'skills',
      name: 'Tags',
      description: 'Pill-shaped tags grouped by category',
      compatibleLayouts: ['single-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'single',
    },
    {
      id: 'skills-bars',
      category: 'skills',
      name: 'Progress Bars',
      description: 'Category with progress bars',
      compatibleLayouts: ['two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'double',
    },
    {
      id: 'skills-columns',
      category: 'skills',
      name: 'Multi-Column',
      description: 'Grid layout with categories',
      compatibleLayouts: ['single-column', 'two-column'],
      columnSupport: 'both',
    },
  ],

  dates: [
    {
      id: 'date-mmm-yyyy',
      category: 'dates',
      name: 'Month Year',
      description: 'Jan 2024 - Present',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'date-mm-yyyy',
      category: 'dates',
      name: 'MM/YYYY',
      description: '01/2024 - Present',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'date-full',
      category: 'dates',
      name: 'Full Month',
      description: 'January 2024 - Present',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'date-iso',
      category: 'dates',
      name: 'ISO Format',
      description: '2024-01 - Present',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
  ],

  sectionTitle: [
    {
      id: 'title-bordered',
      category: 'sectionTitle',
      name: 'Bordered',
      description: 'Uppercase with bottom border',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'title-minimal',
      category: 'sectionTitle',
      name: 'Minimal',
      description: 'Plain uppercase, no border',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'title-accent',
      category: 'sectionTitle',
      name: 'Accent Bar',
      description: 'With left accent bar',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'title-spaced',
      category: 'sectionTitle',
      name: 'Spaced',
      description: 'With decorative line after text',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
  ],

  summary: [
    {
      id: 'summary-justified',
      category: 'summary',
      name: 'Justified',
      description: 'Full-width justified text block',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'summary-spaced',
      category: 'summary',
      name: 'Spaced',
      description: 'With paragraph spacing',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'summary-highlighted',
      category: 'summary',
      name: 'Highlighted',
      description: 'With highlighted key phrases',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
  ],

  basic: [
    {
      id: 'basic-inline-bar',
      category: 'basic',
      name: 'Inline Bar',
      description: 'email | phone | location with icons',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
    {
      id: 'basic-stacked',
      category: 'basic',
      name: 'Stacked',
      description: 'Vertical list with icons',
      compatibleLayouts: ['single-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'single',
    },
    {
      id: 'basic-minimal',
      category: 'basic',
      name: 'Minimal',
      description: 'Text only, no icons',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      columnSupport: 'both',
    },
  ],

  // Extended categories for section snippets
  experience: [],
  education: [],
  projects: [],
  certificates: [],
  languages: [],
};

/**
 * Get the default snippet ID for a category
 */
export function getDefaultSnippetId(category: SnippetCategory): string {
  const defaults: Record<SnippetCategory, string> = {
    skills: 'skills-inline',
    dates: 'date-mmm-yyyy',
    sectionTitle: 'title-bordered',
    summary: 'summary-justified',
    basic: 'basic-inline-bar',
    experience: 'exp-standard',
    education: 'edu-standard',
    projects: 'proj-standard',
    certificates: 'cert-standard',
    languages: 'lang-standard',
  };
  return defaults[category];
}

/**
 * Map snippet date ID to DateFormatStyle
 */
export function snippetDateToDateFormat(snippetId: string): string {
  const map: Record<string, string> = {
    'date-mmm-yyyy': 'MMM_YYYY',
    'date-mm-yyyy': 'MM_YYYY',
    'date-full': 'FULL_MONTH',
    'date-iso': 'ISO',
  };
  return map[snippetId] || 'MMM_YYYY';
}
