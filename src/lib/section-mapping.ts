/**
 * Section Mapping Dictionary
 * 
 * This file provides mapping between different section naming conventions:
 * 1. Frontend/Studio section IDs (used in CV Studio interface)
 * 2. Template section keys (used in template system)
 * 3. Data structure keys (used in CV data structure)
 * 4. Display names (shown to users)
 */

export interface SectionMapping {
  frontendId: string;
  templateKey: string;
  dataKey: keyof import('@/types/unified-cv-schema').UnifiedCVDataStructure;
  displayName: string;
  description: string;
  icon: string;
  category: string;
  isRequired: boolean;
  isList: boolean;
}

export const SECTION_MAPPING: Record<string, SectionMapping> = {
  // Personal Information / Header
  'personal_header': {
    frontendId: 'personal_header',
    templateKey: 'personal_header',
    dataKey: 'basics',
    displayName: 'Personal Information',
    description: 'Name, contact details, and professional summary',
    icon: '👤',
    category: 'header',
    isRequired: true,
    isList: false
  },
  
  // Work Experience
  'work_experience': {
    frontendId: 'work_experience',
    templateKey: 'work_experience',
    dataKey: 'work',
    displayName: 'Work Experience',
    description: 'Professional work history and achievements',
    icon: '💼',
    category: 'experience',
    isRequired: false,
    isList: true
  },
  
  // Education
  'education': {
    frontendId: 'education',
    templateKey: 'education',
    dataKey: 'education',
    displayName: 'Education',
    description: 'Academic qualifications and degrees',
    icon: '🎓',
    category: 'education',
    isRequired: false,
    isList: true
  },
  
  // Skills
  'skills': {
    frontendId: 'skills',
    templateKey: 'skills',
    dataKey: 'skills',
    displayName: 'Skills',
    description: 'Technical and professional skills',
    icon: '🛠️',
    category: 'skills',
    isRequired: false,
    isList: false
  },
  
  // Projects
  'projects': {
    frontendId: 'projects',
    templateKey: 'projects',
    dataKey: 'projects',
    displayName: 'Projects',
    description: 'Personal and professional projects',
    icon: '🚀',
    category: 'projects',
    isRequired: false,
    isList: true
  },
  
  // Certificates
  'certificates': {
    frontendId: 'certificates',
    templateKey: 'certificates',
    dataKey: 'certificates',
    displayName: 'Certificates',
    description: 'Professional certifications and awards',
    icon: '📜',
    category: 'certificates',
    isRequired: false,
    isList: true
  },
  
  // Languages
  'languages': {
    frontendId: 'languages',
    templateKey: 'languages',
    dataKey: 'languages',
    displayName: 'Languages',
    description: 'Language proficiencies',
    icon: '🌐',
    category: 'languages',
    isRequired: false,
    isList: true
  },
  
  // Volunteer Experience
  'volunteer': {
    frontendId: 'volunteer',
    templateKey: 'volunteer',
    dataKey: 'volunteer',
    displayName: 'Volunteer Experience',
    description: 'Volunteer work and community involvement',
    icon: '🤝',
    category: 'experience',
    isRequired: false,
    isList: true
  },
  
  // Awards
  'awards': {
    frontendId: 'awards',
    templateKey: 'awards',
    dataKey: 'awards',
    displayName: 'Awards & Recognition',
    description: 'Professional awards and recognition',
    icon: '🏆',
    category: 'awards',
    isRequired: false,
    isList: true
  },
  
  // Publications
  'publications': {
    frontendId: 'publications',
    templateKey: 'publications',
    dataKey: 'publications',
    displayName: 'Publications',
    description: 'Published works and research',
    icon: '📚',
    category: 'publications',
    isRequired: false,
    isList: true
  }
};

/**
 * Get section mapping by frontend ID
 */
export function getSectionMapping(frontendId: string): SectionMapping | undefined {
  return SECTION_MAPPING[frontendId];
}

/**
 * Get section mapping by template key
 */
export function getSectionMappingByTemplateKey(templateKey: string): SectionMapping | undefined {
  return Object.values(SECTION_MAPPING).find(mapping => mapping.templateKey === templateKey);
}

/**
 * Get section mapping by data key
 */
export function getSectionMappingByDataKey(dataKey: string): SectionMapping | undefined {
  return Object.values(SECTION_MAPPING).find(mapping => mapping.dataKey === dataKey);
}

/**
 * Get all section mappings
 */
export function getAllSectionMappings(): SectionMapping[] {
  return Object.values(SECTION_MAPPING);
}

/**
 * Get section mappings by category
 */
export function getSectionMappingsByCategory(category: string): SectionMapping[] {
  return Object.values(SECTION_MAPPING).filter(mapping => mapping.category === category);
}

/**
 * Get required sections
 */
export function getRequiredSections(): SectionMapping[] {
  return Object.values(SECTION_MAPPING).filter(mapping => mapping.isRequired);
}

/**
 * Get list sections
 */
export function getListSections(): SectionMapping[] {
  return Object.values(SECTION_MAPPING).filter(mapping => mapping.isList);
}

/**
 * Convert frontend section order to template section order
 */
export function convertToTemplateSectionOrder(frontendOrder: string[]): string[] {
  return frontendOrder.map(frontendId => {
    const mapping = getSectionMapping(frontendId);
    return mapping ? mapping.templateKey : frontendId;
  });
}

/**
 * Convert template section order to frontend section order
 */
export function convertToFrontendSectionOrder(templateOrder: string[]): string[] {
  return templateOrder.map(templateKey => {
    const mapping = getSectionMappingByTemplateKey(templateKey);
    return mapping ? mapping.frontendId : templateKey;
  });
}

/**
 * Get section display name by any key type
 */
export function getSectionDisplayName(key: string, keyType: 'frontend' | 'template' | 'data' = 'frontend'): string {
  let mapping: SectionMapping | undefined;
  
  switch (keyType) {
    case 'frontend':
      mapping = getSectionMapping(key);
      break;
    case 'template':
      mapping = getSectionMappingByTemplateKey(key);
      break;
    case 'data':
      mapping = getSectionMappingByDataKey(key);
      break;
  }
  
  return mapping ? mapping.displayName : key;
}
