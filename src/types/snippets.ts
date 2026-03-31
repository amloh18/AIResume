import { LayoutType } from '@/lib/templates/template-definition';
import { DateFormatStyle } from '@/lib/utils/textFormatting';

/**
 * Snippet categories — which section type the snippet applies to
 * Extended to support full section snippets for drag-and-drop
 */
export type SnippetCategory = 
  | 'skills' 
  | 'dates' 
  | 'sectionTitle' 
  | 'summary' 
  | 'basic'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certificates'
  | 'languages';

/**
 * Section snippet types for drag-and-drop
 */
export type SectionSnippetType = 'experience' | 'education' | 'skills' | 'projects' | 'certificates' | 'languages';

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
  /** Optional config passed to snippet component */
  config?: Record<string, any>;
  /** Preview image URL for gallery cards */
  previewImage?: string;
  /** Whether this is a full section snippet */
  isSection?: boolean;
  /** Column layout compatibility */
  columnSupport?: 'single' | 'double' | 'both';
  /** Default content for section snippets */
  defaultContent?: any;
}

/**
 * Section snippet with full block content for drag-and-drop
 */
export interface SectionSnippetDefinition extends SnippetDefinition {
  isSection: true;
  sectionType: SectionSnippetType;
  defaultContent: any;
  previewImage: string;
  columnSupport: 'single' | 'double' | 'both';
  /** Category for the snippet gallery */
  galleryCategory: 'basics' | 'skills' | 'experience' | 'education' | 'projects' | 'other';
}

/**
 * Active snippets stored per-document — maps category to snippet ID
 * Extended to track active section snippets
 */
export interface SnippetOverrides {
  skills?: string;
  dates?: string;
  sectionTitle?: string;
  summary?: string;
  basic?: string;
  experience?: string;
  education?: string;
  projects?: string;
  certificates?: string;
  languages?: string;
}

/**
 * Gallery item for snippet picker
 */
export interface GalleryItem {
  id: string;
  name: string;
  description: string;
  category: SnippetCategory;
  galleryCategory: 'basics' | 'skills' | 'experience' | 'education' | 'projects' | 'other';
  previewImage?: string;
  isSection: boolean;
  sectionType?: SectionSnippetType;
  compatibleLayouts: LayoutType[];
  columnSupport: 'single' | 'double' | 'both';
  config?: Record<string, any>;
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
