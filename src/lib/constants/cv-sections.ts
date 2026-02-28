/**
 * CV Section Configuration
 * 
 * Centralized configuration for CV section behavior.
 * This ensures consistency across drag-and-drop, rendering, and export.
 */

/**
 * Header section types that form the header/contact area of CVs.
 * These sections:
 * - Should remain locked (not draggable) in the editor
 * - Should not be deletable
 * - Are typically rendered at the top of the CV
 * - In two-column templates, these are fixed in the sidebar
 */
export const HEADER_SECTION_TYPES = [
  'personal',
  'personal_header',
  'contact',
  'summary', // Some templates include summary as part of header
] as const;

export type HeaderSectionType = typeof HEADER_SECTION_TYPES[number];

/**
 * Check if a section type is a header section
 */
export const isHeaderSection = (sectionType: string): boolean => {
  return HEADER_SECTION_TYPES.includes(sectionType as HeaderSectionType);
};

/**
 * Sections that are fixed in the sidebar for two-column templates.
 * These sections cannot be moved to the main column.
 */
export const FIXED_SIDEBAR_SECTIONS = [
  'personal',
  'personal_header',
  'contact',
] as const;

export type FixedSidebarSectionType = typeof FIXED_SIDEBAR_SECTIONS[number];

/**
 * Check if a section type is fixed in the sidebar for two-column layouts
 */
export const isFixedSidebarSection = (sectionType: string): boolean => {
  return FIXED_SIDEBAR_SECTIONS.includes(sectionType as FixedSidebarSectionType);
};

/**
 * Default section order for new CVs
 */
export const DEFAULT_SECTION_ORDER = [
  'personal',
  'personal_header',
  'contact',
  'summary',
  'work',
  'education',
  'skills',
  'projects',
  'languages',
  'certificates',
  'awards',
  'volunteer',
  'publications',
  'interests',
  'references',
] as const;

/**
 * Core sections that should always be visible in a CV.
 * These sections are considered essential for a complete CV.
 */
export const CORE_SECTIONS_LIST = [
  'personal',
  'personal_header',
  'contact',
  'summary',
  'work',
  'education',
  'skills',
] as const;

export type CoreSectionType = typeof CORE_SECTIONS_LIST[number];

/**
 * Section type to display name mapping
 */
export const SECTION_DISPLAY_NAMES: Record<string, string> = {
  personal: 'Personal Information',
  personal_header: 'Header',
  contact: 'Contact',
  summary: 'Professional Summary',
  work: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  languages: 'Languages',
  certificates: 'Certificates',
  awards: 'Awards',
  volunteer: 'Volunteer Experience',
  publications: 'Publications',
  interests: 'Interests',
  references: 'References',
};

/**
 * Get display name for a section type
 */
export const getSectionDisplayName = (sectionType: string): string => {
  return SECTION_DISPLAY_NAMES[sectionType] || sectionType;
};

/**
 * Section registry entry with full metadata
 */
export interface SectionRegistryEntry {
  id: string;
  label: string;
  iconName: string;
  category: 'header' | 'experience' | 'education' | 'skills' | 'other';
  description: string;
}

/**
 * Full section registry with all metadata
 * Used by selectors to get section information
 */
export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  personal: {
    id: 'personal',
    label: 'Personal Information',
    iconName: 'User',
    category: 'header',
    description: 'Your personal details and contact information'
  },
  personal_header: {
    id: 'personal_header',
    label: 'Header',
    iconName: 'User',
    category: 'header',
    description: 'Your name and professional title'
  },
  contact: {
    id: 'contact',
    label: 'Contact',
    iconName: 'Mail',
    category: 'header',
    description: 'Contact information including email, phone, and location'
  },
  summary: {
    id: 'summary',
    label: 'Professional Summary',
    iconName: 'FileText',
    category: 'header',
    description: 'A brief overview of your professional background'
  },
  work: {
    id: 'work',
    label: 'Work Experience',
    iconName: 'Briefcase',
    category: 'experience',
    description: 'Your work history and professional experience'
  },
  education: {
    id: 'education',
    label: 'Education',
    iconName: 'GraduationCap',
    category: 'education',
    description: 'Your educational background and qualifications'
  },
  skills: {
    id: 'skills',
    label: 'Skills',
    iconName: 'Wrench',
    category: 'skills',
    description: 'Your technical and professional skills'
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    iconName: 'Folder',
    category: 'experience',
    description: 'Notable projects you have worked on'
  },
  languages: {
    id: 'languages',
    label: 'Languages',
    iconName: 'Globe',
    category: 'skills',
    description: 'Languages you speak and proficiency levels'
  },
  certificates: {
    id: 'certificates',
    label: 'Certificates',
    iconName: 'Award',
    category: 'education',
    description: 'Professional certifications and courses'
  },
  awards: {
    id: 'awards',
    label: 'Awards',
    iconName: 'Trophy',
    category: 'other',
    description: 'Awards and recognition you have received'
  },
  volunteer: {
    id: 'volunteer',
    label: 'Volunteer Experience',
    iconName: 'Heart',
    category: 'experience',
    description: 'Volunteer work and community involvement'
  },
  publications: {
    id: 'publications',
    label: 'Publications',
    iconName: 'Book',
    category: 'other',
    description: 'Published articles, papers, or books'
  },
  interests: {
    id: 'interests',
    label: 'Interests',
    iconName: 'Smile',
    category: 'other',
    description: 'Personal interests and hobbies'
  },
  references: {
    id: 'references',
    label: 'References',
    iconName: 'Users',
    category: 'other',
    description: 'Professional references'
  }
};

/**
 * Get a section registry entry by section type
 * @param sectionType - The section type to look up
 * @returns The registry entry or undefined if not found
 */
export const getSectionRegistryEntry = (sectionType: string): SectionRegistryEntry | undefined => {
  return SECTION_REGISTRY[sectionType];
};
