/**
 * CV Structure Migration Utility
 * 
 * Migrates legacy CV data format to the new structure/content map format.
 * This enables section order and visibility to be stored in the database.
 */

import { UnifiedCVDataStructure, CVStructure, CVContentMap, CVSectionStructure } from '@/types/unified-cv-schema';
import { ITemplate, ISectionBlueprint } from '@/models/Template';
import { SECTION_MAPPING } from '@/lib/section-mapping';

/**
 * Default section order if template is not available
 */
const DEFAULT_SECTION_ORDER = [
  'personal_header',
  'work_experience',
  'education',
  'skills',
  'projects',
  'certificates',
  'languages',
  'volunteer',
  'awards',
  'publications'
];

/**
 * Check if CV data has already been migrated to structure format
 */
export function hasStructure(cvData: UnifiedCVDataStructure): boolean {
  return !!(cvData.structure && cvData.content && Array.isArray(cvData.structure.sections));
}

/**
 * Generate UUID for section (client-safe, uses crypto.randomUUID or fallback)
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Node.js environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get default empty content for a section type
 */
function getDefaultContentForSectionType(sectionType: string): any {
  const mapping = SECTION_MAPPING[sectionType];
  if (!mapping) return {};

  switch (sectionType) {
    case 'personal_header':
      return {
        name: '',
        label: '',
        image: '',
        email: '',
        phone: '',
        url: '',
        summary: '',
        location: {
          address: '',
          postalCode: '',
          city: '',
          countryCode: '',
          region: ''
        },
        profiles: []
      };
    case 'work_experience':
      return {
        name: '',
        position: '',
        url: '',
        startDate: '',
        endDate: '',
        summary: '',
        highlights: []
      };
    case 'education':
      return {
        institution: '',
        url: '',
        area: '',
        studyType: '',
        startDate: '',
        endDate: '',
        score: '',
        courses: []
      };
    case 'skills':
      return [];
    case 'projects':
      return {
        name: '',
        startDate: '',
        endDate: '',
        description: '',
        highlights: [],
        keywords: [],
        url: ''
      };
    case 'certificates':
      return {
        name: '',
        date: '',
        issuer: '',
        url: '',
        description: ''
      };
    case 'languages':
      return {
        language: '',
        fluency: ''
      };
    case 'volunteer':
      return {
        organization: '',
        position: '',
        url: '',
        startDate: '',
        endDate: '',
        summary: '',
        highlights: []
      };
    case 'awards':
      return {
        title: '',
        date: '',
        awarder: '',
        summary: ''
      };
    case 'publications':
      return {
        name: '',
        publisher: '',
        releaseDate: '',
        url: '',
        summary: ''
      };
    default:
      return {};
  }
}

/**
 * Check if a section has data in legacy format
 */
function hasLegacyData(cvData: UnifiedCVDataStructure, sectionType: string): boolean {
  const mapping = SECTION_MAPPING[sectionType];
  if (!mapping) return false;

  const dataKey = mapping.dataKey;
  const data = cvData[dataKey];

  if (mapping.isList) {
    return Array.isArray(data) && data.length > 0;
  } else {
    // For non-list sections like basics, check if key fields exist
    if (dataKey === 'basics') {
      return !!(data && (data.name || data.email || data.summary));
    }
    return !!data;
  }
}

/**
 * Migrate legacy CV data to structure/content map format
 * 
 * @param cvData - Legacy CV data structure
 * @param template - Optional template to determine section order and availability
 * @returns Migrated CV data with structure and content map
 */
export function migrateLegacyCVToStructureFormat(
  cvData: UnifiedCVDataStructure,
  template?: ITemplate | { availableSections?: ISectionBlueprint[] }
): UnifiedCVDataStructure {
  // If already migrated, return as-is
  if (hasStructure(cvData)) {
    return cvData;
  }

  const structure: CVSectionStructure[] = [];
  const content: CVContentMap = {};

  // Determine section order from template or use default
  let sectionOrder: string[] = DEFAULT_SECTION_ORDER;
  if (template?.availableSections && Array.isArray(template.availableSections)) {
    sectionOrder = template.availableSections
      .map(section => section.key)
      .filter(key => SECTION_MAPPING[key] !== undefined);
  }

  // Migrate each section type
  for (const sectionType of sectionOrder) {
    const mapping = SECTION_MAPPING[sectionType];
    if (!mapping) continue;

    const dataKey = mapping.dataKey;
    const legacyData = cvData[dataKey];

    if (mapping.isList) {
      // Array sections: create one structure entry per item
      if (Array.isArray(legacyData)) {
        for (const item of legacyData) {
          const sectionId = generateUUID();
          structure.push({
            id: sectionId,
            type: sectionType,
            visible: true
          });
          content[sectionId] = { ...item };
        }
      } else {
        // If array is empty, still create a structure entry with empty content
        const sectionId = generateUUID();
        structure.push({
          id: sectionId,
          type: sectionType,
          visible: false // Hide empty sections by default
        });
        content[sectionId] = getDefaultContentForSectionType(sectionType);
      }
    } else {
      // Non-array sections (like basics): create single entry
      const sectionId = generateUUID();
      const hasData = hasLegacyData(cvData, sectionType);
      
      structure.push({
        id: sectionId,
        type: sectionType,
        visible: hasData // Show if has data, hide if empty
      });

      if (legacyData) {
        content[sectionId] = { ...legacyData };
      } else {
        content[sectionId] = getDefaultContentForSectionType(sectionType);
      }
    }
  }

  // Ensure personal_header is always first
  const personalHeaderIndex = structure.findIndex(s => s.type === 'personal_header');
  if (personalHeaderIndex > 0) {
    const personalHeader = structure.splice(personalHeaderIndex, 1)[0];
    structure.unshift(personalHeader);
  }

  // Return migrated data (preserve legacy arrays for backward compatibility)
  return {
    ...cvData,
    structure: {
      sections: structure
    },
    content
  };
}

/**
 * Initialize CV structure from template (for new CVs)
 */
export function initializeCVStructure(
  template?: ITemplate | { availableSections?: ISectionBlueprint[] },
  existingData?: Partial<UnifiedCVDataStructure>
): { structure: CVStructure; content: CVContentMap } {
  const structure: CVSectionStructure[] = [];
  const content: CVContentMap = {};

  // Determine section order from template or use default
  let sectionOrder: string[] = DEFAULT_SECTION_ORDER;
  if (template?.availableSections && Array.isArray(template.availableSections)) {
    sectionOrder = template.availableSections
      .map(section => section.key)
      .filter(key => SECTION_MAPPING[key] !== undefined);
  }

  // Initialize each section
  for (const sectionType of sectionOrder) {
    const mapping = SECTION_MAPPING[sectionType];
    if (!mapping) continue;

    if (mapping.isList) {
      // For list sections, check if existing data has items
      const dataKey = mapping.dataKey;
      const existingItems = existingData?.[dataKey];
      
      if (Array.isArray(existingItems) && existingItems.length > 0) {
        // Create one entry per existing item
        for (const item of existingItems) {
          const sectionId = generateUUID();
          structure.push({
            id: sectionId,
            type: sectionType,
            visible: true
          });
          content[sectionId] = { ...item };
        }
      } else {
        // Create single empty entry
        const sectionId = generateUUID();
        structure.push({
          id: sectionId,
          type: sectionType,
          visible: false
        });
        content[sectionId] = getDefaultContentForSectionType(sectionType);
      }
    } else {
      // Non-array sections: create single entry
      const sectionId = generateUUID();
      const dataKey = mapping.dataKey;
      const existingItem = existingData?.[dataKey];

      structure.push({
        id: sectionId,
        type: sectionType,
        visible: !!existingItem || sectionType === 'personal_header' // Always show personal_header
      });

      if (existingItem) {
        content[sectionId] = { ...existingItem };
      } else {
        content[sectionId] = getDefaultContentForSectionType(sectionType);
      }
    }
  }

  // Ensure personal_header is always first
  const personalHeaderIndex = structure.findIndex(s => s.type === 'personal_header');
  if (personalHeaderIndex > 0) {
    const personalHeader = structure.splice(personalHeaderIndex, 1)[0];
    structure.unshift(personalHeader);
  }

  return {
    structure: { sections: structure },
    content
  };
}
