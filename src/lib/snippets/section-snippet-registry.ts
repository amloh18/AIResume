import { SectionSnippetDefinition, SectionSnippetType } from '@/types/snippets';

/**
 * Registry of full section snippets for drag-and-drop
 * Each entry defines a section block that can be added to the CV
 */
export const SECTION_SNIPPET_REGISTRY: Record<SectionSnippetType, SectionSnippetDefinition[]> = {
  experience: [
    {
      id: 'exp-standard',
      category: 'experience',
      name: 'Standard Experience',
      description: 'Company, position, dates, bullet points',
      icon: '💼',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      isSection: true,
      sectionType: 'experience',
      previewImage: '/images/snippets/experience-standard.png',
      columnSupport: 'both',
      galleryCategory: 'experience',
      defaultContent: {
        type: 'experienceBlock',
        attrs: {
          id: '',
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          current: false,
        },
        content: [
          {
            type: 'bulletNode',
            attrs: { id: '' },
          },
        ],
      },
    },
    {
      id: 'exp-compact',
      category: 'experience',
      name: 'Compact Experience',
      description: 'Minimal layout with inline dates',
      icon: '📋',
      compatibleLayouts: ['single-column', 'two-column'],
      isSection: true,
      sectionType: 'experience',
      previewImage: '/images/snippets/experience-compact.png',
      columnSupport: 'both',
      galleryCategory: 'experience',
      defaultContent: {
        type: 'experienceBlock',
        attrs: {
          id: '',
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          current: false,
        },
        content: [
          {
            type: 'bulletNode',
            attrs: { id: '' },
          },
        ],
      },
    },
    {
      id: 'exp-detailed',
      category: 'experience',
      name: 'Detailed Experience',
      description: 'Extended layout with highlights section',
      icon: '📊',
      compatibleLayouts: ['single-column'],
      isSection: true,
      sectionType: 'experience',
      previewImage: '/images/snippets/experience-detailed.png',
      columnSupport: 'single',
      galleryCategory: 'experience',
      defaultContent: {
        type: 'experienceBlock',
        attrs: {
          id: '',
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          current: false,
        },
        content: [
          {
            type: 'bulletNode',
            attrs: { id: '' },
          },
        ],
      },
    },
  ],

  education: [
    {
      id: 'edu-standard',
      category: 'education',
      name: 'Standard Education',
      description: 'Institution, degree, dates, achievements',
      icon: '🎓',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      isSection: true,
      sectionType: 'education',
      previewImage: '/images/snippets/education-standard.png',
      columnSupport: 'both',
      galleryCategory: 'education',
      defaultContent: {
        type: 'educationBlock',
        attrs: {
          id: '',
          institution: '',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          score: '',
        },
      },
    },
    {
      id: 'edu-compact',
      category: 'education',
      name: 'Compact Education',
      description: 'Minimal layout for experienced professionals',
      icon: '📚',
      compatibleLayouts: ['single-column', 'two-column'],
      isSection: true,
      sectionType: 'education',
      previewImage: '/images/snippets/education-compact.png',
      columnSupport: 'both',
      galleryCategory: 'education',
      defaultContent: {
        type: 'educationBlock',
        attrs: {
          id: '',
          institution: '',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          score: '',
        },
      },
    },
    {
      id: 'edu-academic',
      category: 'education',
      name: 'Academic Education',
      description: 'Extended layout with thesis and publications',
      icon: '🏫',
      compatibleLayouts: ['single-column'],
      isSection: true,
      sectionType: 'education',
      previewImage: '/images/snippets/education-academic.png',
      columnSupport: 'single',
      galleryCategory: 'education',
      defaultContent: {
        type: 'educationBlock',
        attrs: {
          id: '',
          institution: '',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          score: '',
        },
      },
    },
  ],

  skills: [
    {
      id: 'skills-categories',
      category: 'skills',
      name: 'Skill Categories',
      description: 'Grouped by category with skill lists',
      icon: '⚡',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      isSection: true,
      sectionType: 'skills',
      previewImage: '/images/snippets/skills-categories.png',
      columnSupport: 'both',
      galleryCategory: 'skills',
      defaultContent: {
        type: 'skillsBlock',
        attrs: {
          id: '',
          name: 'Technical Skills',
          level: 'Expert',
          keywords: [],
        },
      },
    },
    {
      id: 'skills-tags',
      category: 'skills',
      name: 'Skill Tags',
      description: 'Pill-shaped tags for modern layouts',
      icon: '🏷️',
      compatibleLayouts: ['single-column', 'two-column'],
      isSection: true,
      sectionType: 'skills',
      previewImage: '/images/snippets/skills-tags.png',
      columnSupport: 'both',
      galleryCategory: 'skills',
      defaultContent: {
        type: 'skillsBlock',
        attrs: {
          id: '',
          name: 'Technical Skills',
          level: 'Expert',
          keywords: [],
        },
      },
    },
    {
      id: 'skills-bars',
      category: 'skills',
      name: 'Skill Bars',
      description: 'Visual progress bars for proficiency',
      icon: '📶',
      compatibleLayouts: ['two-column', 'sidebar-left', 'sidebar-right'],
      isSection: true,
      sectionType: 'skills',
      previewImage: '/images/snippets/skills-bars.png',
      columnSupport: 'double',
      galleryCategory: 'skills',
      defaultContent: {
        type: 'skillsBlock',
        attrs: {
          id: '',
          name: 'Technical Skills',
          level: 'Expert',
          keywords: [],
        },
      },
    },
    {
      id: 'skills-grid',
      category: 'skills',
      name: 'Skills Grid',
      description: 'Multi-column grid layout',
      icon: '🔲',
      compatibleLayouts: ['single-column', 'two-column'],
      isSection: true,
      sectionType: 'skills',
      previewImage: '/images/snippets/skills-grid.png',
      columnSupport: 'both',
      galleryCategory: 'skills',
      defaultContent: {
        type: 'skillsBlock',
        attrs: {
          id: '',
          name: 'Technical Skills',
          level: 'Expert',
          keywords: [],
        },
      },
    },
  ],

  projects: [
    {
      id: 'proj-standard',
      category: 'projects',
      name: 'Standard Project',
      description: 'Project name, description, technologies',
      icon: '🚀',
      compatibleLayouts: ['single-column', 'two-column'],
      isSection: true,
      sectionType: 'projects',
      previewImage: '/images/snippets/projects-standard.png',
      columnSupport: 'both',
      galleryCategory: 'projects',
      defaultContent: {
        type: 'projectsBlock',
        attrs: {
          id: '',
          name: '',
          description: '',
        },
        content: [
          {
            type: 'bulletNode',
            attrs: { id: '' },
          },
        ],
      },
    },
    {
      id: 'proj-portfolio',
      category: 'projects',
      name: 'Portfolio Project',
      description: 'Extended layout with links and images',
      icon: '🎨',
      compatibleLayouts: ['single-column'],
      isSection: true,
      sectionType: 'projects',
      previewImage: '/images/snippets/projects-portfolio.png',
      columnSupport: 'single',
      galleryCategory: 'projects',
      defaultContent: {
        type: 'projectsBlock',
        attrs: {
          id: '',
          name: '',
          description: '',
        },
        content: [
          {
            type: 'bulletNode',
            attrs: { id: '' },
          },
        ],
      },
    },
  ],

  certificates: [
    {
      id: 'cert-standard',
      category: 'certificates',
      name: 'Standard Certificate',
      description: 'Name, issuer, date, credential ID',
      icon: '📜',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      isSection: true,
      sectionType: 'certificates',
      previewImage: '/images/snippets/certificates-standard.png',
      columnSupport: 'both',
      galleryCategory: 'other',
      defaultContent: {
        type: 'paragraph',
        content: [{ type: 'text', text: '' }],
      },
    },
  ],

  languages: [
    {
      id: 'lang-standard',
      category: 'languages',
      name: 'Language List',
      description: 'Language with fluency level',
      icon: '🌍',
      compatibleLayouts: ['single-column', 'two-column', 'sidebar-left', 'sidebar-right'],
      isSection: true,
      sectionType: 'languages',
      previewImage: '/images/snippets/languages-standard.png',
      columnSupport: 'both',
      galleryCategory: 'other',
      defaultContent: {
        type: 'paragraph',
        content: [{ type: 'text', text: '' }],
      },
    },
  ],
};

/**
 * Get default section snippet for a section type
 */
export function getDefaultSectionSnippetId(sectionType: SectionSnippetType): string {
  const defaults: Record<SectionSnippetType, string> = {
    experience: 'exp-standard',
    education: 'edu-standard',
    skills: 'skills-categories',
    projects: 'proj-standard',
    certificates: 'cert-standard',
    languages: 'lang-standard',
  };
  return defaults[sectionType];
}

/**
 * Get all section snippet IDs for a section type
 */
export function getSectionSnippetIds(sectionType: SectionSnippetType): string[] {
  return SECTION_SNIPPET_REGISTRY[sectionType].map((s) => s.id);
}
