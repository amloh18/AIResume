/**
 * CV Section Selectors - The "Harmony" Selectors
 *
 * These are the TWO core selectors that drive section visibility across the entire app:
 * 1. getVisibleCVSections() - The "Conductor" - returns visible sections in order
 * 2. getAddableCVSections() - The "Palette" - returns sections that can be added
 *
 * IMPORTANT: These selectors assume cvData has ALREADY been migrated.
 * The migration should run in CVStudio.tsx when data is first loaded.
 *
 * NOTE: These selectors return icon NAMES (strings), not React components.
 * Components should map icon names to Lucide components to avoid SSR issues.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { SECTION_REGISTRY, getSectionRegistryEntry, DEFAULT_SECTION_ORDER } from '@/lib/constants/cv-sections';
import { hasSectionData, isSectionInitialized } from '@/lib/utils/cv-data-validation';

/**
 * Visible section metadata
 */
export interface VisibleCVSection {
  id: string;           // Section ID (from structure)
  type: string;         // Section type (e.g., 'work_experience')
  label: string;        // Display label
  iconName: string;     // Icon name (e.g., 'User', 'Briefcase')
  order: number;        // Position in structure array
}

/**
 * Addable section metadata
 */
export interface AddableCVSection {
  id: string;           // Section type ID
  label: string;        // Display label
  iconName: string;     // Icon name (e.g., 'User', 'Briefcase')
  category: string;     // Section category
  description: string;  // Section description
}

/**
 * THE CONDUCTOR
 * 
 * Get visible CV sections in the correct order.
 * 
 * This function is SIMPLE because the migration guarantees:
 * - cvData.structure.sections always exists
 * - sections are already in the correct order
 * - visibility is already determined
 * 
 * Logic:
 * - Filter structure.sections where visible === true
 * - Map to enriched metadata using SECTION_REGISTRY
 * - Return array in structure order
 * 
 * @param cvData - CV data (must be migrated)
 * @param documentType - Document type ('cv' or 'cover-letter')
 * @returns Array of visible sections in order
 */
export function getVisibleCVSections(
  cvData: UnifiedCVDataStructure | null,
  documentType: 'cv' | 'cover-letter' = 'cv'
): VisibleCVSection[] {
  // Cover letters have no CV sections
  if (documentType === 'cover-letter' || !cvData) {
    return [];
  }

  // Migration should have already run, but provide fallback for legacy CVs
  if (!cvData.structure?.sections || cvData.structure.sections.length === 0) {
    console.warn('getVisibleCVSections: cvData.structure.sections is missing. Using legacy fallback.');
    
    // Fallback: Show sections that have data or are initialized (legacy CVs)
    const legacySections: VisibleCVSection[] = [];
    
    // Always include personal_header (users need to fill it)
    const personalHeaderEntry = getSectionRegistryEntry('personal_header');
    if (personalHeaderEntry) {
      legacySections.push({
        id: 'personal_header',
        type: 'personal_header',
        label: personalHeaderEntry.label,
        iconName: personalHeaderEntry.iconName,
        order: 0
      });
    }
    
    // Add other sections that have actual data
    // Empty sections should NOT appear in sidebar - they should appear in "Add Section" modal
    for (let i = 0; i < DEFAULT_SECTION_ORDER.length; i++) {
      const sectionId = DEFAULT_SECTION_ORDER[i];
      if (sectionId === 'personal_header') continue; // Already added
      
      const registryEntry = getSectionRegistryEntry(sectionId);
      if (!registryEntry) continue;
      
      // ONLY include if section has actual data (not just initialized with empty array)
      // This matches the migration logic: visible = hasData (not hasData || isInitialized)
      const hasData = hasSectionData(cvData, sectionId);
      
      if (hasData) {
        legacySections.push({
          id: sectionId,
          type: sectionId,
          label: registryEntry.label,
          iconName: registryEntry.iconName,
          order: i
        });
      }
    }
    
    return legacySections;
  }

  // Filter visible sections and enrich with metadata
  return cvData.structure.sections
    .map((section, index) => {
      const registryEntry = getSectionRegistryEntry(section.type);
      
      if (!registryEntry) {
        console.warn(`getVisibleCVSections: Unknown section type "${section.type}"`);
        return null;
      }

      return {
        id: section.id,
        type: section.type,
        label: registryEntry.label,
        iconName: registryEntry.iconName,
        order: index
      };
    })
    .filter((section): section is VisibleCVSection => 
      section !== null && section.type !== undefined
    )
    .filter(section => {
      // Check visibility from structure
      const structureSection = cvData.structure!.sections.find(s => s.id === section.id);
      return structureSection?.visible !== false;
    });
}

/**
 * THE PALETTE
 * 
 * Get sections that can be added (not currently visible).
 * 
 * This selector uses the "Inverse Dependency" pattern:
 * - It does NOT call getVisibleCVSections()
 * - It independently checks cvData.structure.sections
 * - This prevents circular dependencies
 * 
 * Logic:
 * 1. Get visible section types from structure
 * 2. Get all section IDs from registry
 * 3. Return registry entries NOT in visible set
 * 
 * @param cvData - CV data (must be migrated)
 * @returns Array of sections that can be added
 */
export function getAddableCVSections(
  cvData: UnifiedCVDataStructure | null
): AddableCVSection[] {
  if (!cvData) {
    return [];
  }

  // Get currently visible section types
  const visibleSectionTypes = new Set<string>();
  
  if (cvData.structure?.sections && cvData.structure.sections.length > 0) {
    // Use structure to determine visible sections
    cvData.structure.sections.forEach(section => {
      if (section.visible !== false) {
        visibleSectionTypes.add(section.type);
      }
    });
  } else {
    // Fallback for legacy CVs: use getVisibleCVSections to determine what's visible
    // This ensures consistency even if structure hasn't been created yet
    const visibleSections = getVisibleCVSections(cvData, 'cv');
    visibleSections.forEach(section => {
      visibleSectionTypes.add(section.type);
    });
  }

  // Get all section IDs from registry
  const allSectionIds = Object.keys(SECTION_REGISTRY);

  // Filter to sections NOT currently visible
  return allSectionIds
    .filter(sectionId => !visibleSectionTypes.has(sectionId))
    .map(sectionId => {
      const registryEntry = SECTION_REGISTRY[sectionId];
      
      return {
        id: sectionId,
        label: registryEntry.label,
        iconName: registryEntry.iconName,
        category: registryEntry.category,
        description: registryEntry.description
      };
    })
    .sort((a, b) => {
      // Sort by category, then label
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.label.localeCompare(b.label);
    });
}

/**
 * Helper: Check if a specific section is visible
 * 
 * @param cvData - CV data
 * @param sectionType - Section type to check
 * @returns true if section is visible
 */
export function isSectionVisible(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): boolean {
  if (!cvData?.structure?.sections) {
    return false;
  }

  return cvData.structure.sections.some(
    section => section.type === sectionType && section.visible !== false
  );
}

/**
 * Helper: Get section count by type
 * 
 * @param cvData - CV data
 * @param sectionType - Section type
 * @returns Number of instances of this section type
 */
export function getSectionCount(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): number {
  if (!cvData?.structure?.sections) {
    return 0;
  }

  return cvData.structure.sections.filter(
    section => section.type === sectionType && section.visible !== false
  ).length;
}