/**
 * Section ID Resolver
 * 
 * Resolves section IDs from section types for drag-and-drop compatibility.
 * Templates use hardcoded section types (e.g., "work", "education") but
 * CVSectionStructure uses UUIDs. This utility bridges the gap.
 */

import { UnifiedCVDataStructure, CVSectionStructure } from '@/types/unified-cv-schema';

/**
 * Get the actual section ID from cvData.structure for a given section type.
 * Falls back to the section type if no structure exists (legacy mode).
 * 
 * @param cvData - The CV data containing structure
 * @param sectionType - The section type (e.g., "work", "education", "personal")
 * @returns The actual section ID from structure, or the sectionType as fallback
 */
export function getSectionId(
  cvData: UnifiedCVDataStructure | null | undefined,
  sectionType: string
): string {
  if (!cvData?.structure?.sections) {
    return sectionType; // Fallback for legacy CVs without structure
  }

  const section = cvData.structure.sections.find(s => s.type === sectionType);
  return section?.id || sectionType;
}

/**
 * Get all section IDs mapped by type for quick lookup.
 * 
 * @param cvData - The CV data containing structure
 * @returns A map of section type to section ID
 */
export function getSectionIdMap(
  cvData: UnifiedCVDataStructure | null | undefined
): Record<string, string> {
  if (!cvData?.structure?.sections) {
    return {};
  }

  return cvData.structure.sections.reduce((map, section) => {
    map[section.type] = section.id;
    return map;
  }, {} as Record<string, string>);
}

/**
 * Create a section ID resolver function bound to specific cvData.
 * Useful for templates that need to resolve multiple section IDs.
 * 
 * @param cvData - The CV data containing structure
 * @returns A function that resolves section types to IDs
 */
export function createSectionIdResolver(
  cvData: UnifiedCVDataStructure | null | undefined
): (sectionType: string) => string {
  const idMap = getSectionIdMap(cvData);
  
  return (sectionType: string) => {
    return idMap[sectionType] || sectionType;
  };
}

/**
 * Get section structure by type
 * 
 * @param cvData - The CV data containing structure
 * @param sectionType - The section type to find
 * @returns The section structure or undefined
 */
export function getSectionByType(
  cvData: UnifiedCVDataStructure | null | undefined,
  sectionType: string
): CVSectionStructure | undefined {
  if (!cvData?.structure?.sections) {
    return undefined;
  }

  return cvData.structure.sections.find(s => s.type === sectionType);
}
