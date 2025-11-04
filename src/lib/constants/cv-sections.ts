/**
 * CV Section Registry
 *
 * This is the MASTER SECTION REGISTRY - the single source of truth for all CV sections.
 * All section-related logic should reference this registry.
 *
 * NOTE: Icons are stored as string names to avoid importing React components
 * in utility files (which can cause SSR/middleware issues).
 */

/**
 * Section Registry Entry
 */
export interface SectionRegistryEntry {
  label: string;
  iconName: string;  // Icon name (not component) to avoid React imports
  category: 'header' | 'experience' | 'education' | 'skills' | 'competencies' | 'other';
  dataKey: string;  // Key in UnifiedCVDataStructure
  isList: boolean;  // Whether this section contains an array
  isRequired: boolean;
  description: string;
}

/**
 * SECTION REGISTRY
 * The master list of all available CV sections
 */
export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  personal_header: {
    label: 'Personal Information',
    iconName: 'User',
    category: 'header',
    dataKey: 'basics',
    isList: false,
    isRequired: true,
    description: 'Name, contact details, and professional summary'
  },
  work_experience: {
    label: 'Work Experience',
    iconName: 'Briefcase',
    category: 'experience',
    dataKey: 'work',
    isList: true,
    isRequired: false,
    description: 'Professional work history and achievements'
  },
  education: {
    label: 'Education',
    iconName: 'GraduationCap',
    category: 'education',
    dataKey: 'education',
    isList: true,
    isRequired: false,
    description: 'Academic qualifications and degrees'
  },
  skills: {
    label: 'Skills',
    iconName: 'Code',
    category: 'skills',
    dataKey: 'skills',
    isList: true,
    isRequired: false,
    description: 'Technical and professional skills'
  },
  projects: {
    label: 'Projects',
    iconName: 'FolderOpen',
    category: 'competencies',
    dataKey: 'projects',
    isList: true,
    isRequired: false,
    description: 'Personal and professional projects'
  },
  certificates: {
    label: 'Certificates',
    iconName: 'Award',
    category: 'competencies',
    dataKey: 'certificates',
    isList: true,
    isRequired: false,
    description: 'Professional certifications and credentials'
  },
  languages: {
    label: 'Languages',
    iconName: 'Globe',
    category: 'competencies',
    dataKey: 'languages',
    isList: true,
    isRequired: false,
    description: 'Language proficiencies'
  },
  volunteer: {
    label: 'Volunteer Experience',
    iconName: 'Heart',
    category: 'experience',
    dataKey: 'volunteer',
    isList: true,
    isRequired: false,
    description: 'Volunteer work and community involvement'
  },
  awards: {
    label: 'Awards & Recognition',
    iconName: 'Star',
    category: 'competencies',
    dataKey: 'awards',
    isList: true,
    isRequired: false,
    description: 'Professional awards and recognition'
  },
  publications: {
    label: 'Publications',
    iconName: 'BookOpen',
    category: 'competencies',
    dataKey: 'publications',
    isList: true,
    isRequired: false,
    description: 'Published works and research'
  },
  interests: {
    label: 'Interests',
    iconName: 'Users',
    category: 'other',
    dataKey: 'interests',
    isList: true,
    isRequired: false,
    description: 'Personal interests and hobbies'
  },
  references: {
    label: 'References',
    iconName: 'Users',
    category: 'other',
    dataKey: 'references',
    isList: true,
    isRequired: false,
    description: 'Professional references'
  }
};

/**
 * DEFAULT SECTION ORDER
 * The default order for sections when no custom order is specified
 */
export const DEFAULT_SECTION_ORDER = [
  'personal_header',
  'work_experience',
  'education',
  'skills',
  'projects',
  'certificates',
  'languages',
  'volunteer',
  'awards',
  'publications',
  'interests',
  'references'
] as const;

/**
 * Get section registry entry
 */
export function getSectionRegistryEntry(sectionId: string): SectionRegistryEntry | undefined {
  return SECTION_REGISTRY[sectionId];
}

/**
 * Get all section IDs
 */
export function getAllSectionIds(): string[] {
  return Object.keys(SECTION_REGISTRY);
}

/**
 * Get sections by category
 */
export function getSectionsByCategory(category: SectionRegistryEntry['category']): string[] {
  return Object.entries(SECTION_REGISTRY)
    .filter(([_, entry]) => entry.category === category)
    .map(([id]) => id);
}