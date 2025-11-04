/**
 * CV Data Validation Utilities
 * 
 * Robust validation functions for CV section data.
 * These are used by the migration and selector utilities to determine
 * if a section contains actual, meaningful data.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { SECTION_REGISTRY } from '@/lib/constants/cv-sections';

/**
 * Check if a value is empty or consists only of whitespace
 */
function isEmptyString(value: any): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * Check if an object is empty or contains only empty values
 */
function isEmptyObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return true;
  }
  
  // Check if all values are empty
  return Object.values(obj).every(value => {
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object' && value !== null) {
      return isEmptyObject(value);
    }
    return isEmptyString(value);
  });
}

/**
 * Check if an array contains any meaningful data
 * Returns false for: [], [{}], [{ name: "" }], [""], etc.
 */
function hasArrayData(arr: any[]): boolean {
  if (!Array.isArray(arr) || arr.length === 0) {
    return false;
  }
  
  return arr.some(item => {
    // String items
    if (typeof item === 'string') {
      return !isEmptyString(item);
    }
    
    // Object items
    if (typeof item === 'object' && item !== null) {
      return !isEmptyObject(item);
    }
    
    // Other types (numbers, booleans, etc.) are considered data
    return item !== null && item !== undefined;
  });
}

/**
 * ROBUST SECTION DATA VALIDATION
 * 
 * This is the bedrock validation function that determines if a section
 * has actual, meaningful data vs. just default/empty structures.
 * 
 * Returns false for:
 * - undefined/null
 * - []
 * - [{}]
 * - [{ field: "" }]
 * - [""]
 * - Objects with all empty string values
 * 
 * Returns true for:
 * - Arrays with at least one non-empty item
 * - Objects with at least one non-empty field
 */
export function hasSectionData(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): boolean {
  if (!cvData) return false;
  
  const registryEntry = SECTION_REGISTRY[sectionType];
  if (!registryEntry) return false;
  
  const dataKey = registryEntry.dataKey as keyof UnifiedCVDataStructure;
  const data = cvData[dataKey];
  
  // Handle personal_header / basics specially
  if (sectionType === 'personal_header') {
    const basics = data as UnifiedCVDataStructure['basics'];
    if (!basics) return false;
    
    // Check if at least one key field has data
    return !!(
      !isEmptyString(basics.name) ||
      !isEmptyString(basics.email) ||
      !isEmptyString(basics.phone) ||
      !isEmptyString(basics.summary) ||
      !isEmptyString(basics.label)
    );
  }
  
  // Handle work experience
  if (sectionType === 'work_experience') {
    const work = data as UnifiedCVDataStructure['work'];
    if (!hasArrayData(work)) return false;
    
    return work.some(item =>
      !isEmptyString(item.name) ||
      !isEmptyString(item.position) ||
      !isEmptyString(item.summary) ||
      hasArrayData(item.highlights)
    );
  }
  
  // Handle education
  if (sectionType === 'education') {
    const education = data as UnifiedCVDataStructure['education'];
    if (!hasArrayData(education)) return false;
    
    return education.some(item =>
      !isEmptyString(item.institution) ||
      !isEmptyString(item.area) ||
      !isEmptyString(item.studyType) ||
      !isEmptyString(item.score)
    );
  }
  
  // Handle skills
  if (sectionType === 'skills') {
    const skills = data as UnifiedCVDataStructure['skills'];
    if (!hasArrayData(skills)) return false;
    
    return skills.some(item =>
      !isEmptyString(item.category) ||
      hasArrayData(item.skills)
    );
  }
  
  // Handle projects
  if (sectionType === 'projects') {
    const projects = data as UnifiedCVDataStructure['projects'];
    if (!hasArrayData(projects)) return false;
    
    return projects.some(item =>
      !isEmptyString(item.name) ||
      !isEmptyString(item.description) ||
      hasArrayData(item.highlights) ||
      hasArrayData(item.keywords)
    );
  }
  
  // Handle certificates
  if (sectionType === 'certificates') {
    const certificates = data as UnifiedCVDataStructure['certificates'];
    if (!hasArrayData(certificates)) return false;
    
    return certificates.some(item =>
      !isEmptyString(item.name) ||
      !isEmptyString(item.issuer)
    );
  }
  
  // Handle languages
  if (sectionType === 'languages') {
    const languages = data as UnifiedCVDataStructure['languages'];
    if (!hasArrayData(languages)) return false;
    
    return languages.some(item =>
      !isEmptyString(item.language)
    );
  }
  
  // Handle volunteer
  if (sectionType === 'volunteer') {
    const volunteer = data as UnifiedCVDataStructure['volunteer'];
    if (!hasArrayData(volunteer)) return false;
    
    return volunteer.some(item =>
      !isEmptyString(item.organization) ||
      !isEmptyString(item.position) ||
      !isEmptyString(item.summary)
    );
  }
  
  // Handle awards
  if (sectionType === 'awards') {
    const awards = data as UnifiedCVDataStructure['awards'];
    if (!hasArrayData(awards)) return false;
    
    return awards.some(item =>
      !isEmptyString(item.title) ||
      !isEmptyString(item.awarder)
    );
  }
  
  // Handle publications
  if (sectionType === 'publications') {
    const publications = data as UnifiedCVDataStructure['publications'];
    if (!hasArrayData(publications)) return false;
    
    return publications.some(item =>
      !isEmptyString(item.name) ||
      !isEmptyString(item.publisher)
    );
  }
  
  // Handle interests
  if (sectionType === 'interests') {
    const interests = data as UnifiedCVDataStructure['interests'];
    if (!hasArrayData(interests)) return false;
    
    return interests.some(item =>
      !isEmptyString(item.name) ||
      hasArrayData(item.keywords)
    );
  }
  
  // Handle references
  if (sectionType === 'references') {
    const references = data as UnifiedCVDataStructure['references'];
    if (!hasArrayData(references)) return false;
    
    return references.some(item =>
      !isEmptyString(item.name) ||
      !isEmptyString(item.reference)
    );
  }
  
  return false;
}

/**
 * Check if a section has been initialized (array/object exists)
 * This is used to detect sections that were just added but not yet filled
 */
export function isSectionInitialized(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): boolean {
  if (!cvData) return false;
  
  const registryEntry = SECTION_REGISTRY[sectionType];
  if (!registryEntry) return false;
  
  const dataKey = registryEntry.dataKey as keyof UnifiedCVDataStructure;
  const data = cvData[dataKey];
  
  if (registryEntry.isList) {
    return Array.isArray(data);
  } else {
    // For non-list sections like basics
    return data !== null && data !== undefined;
  }
}