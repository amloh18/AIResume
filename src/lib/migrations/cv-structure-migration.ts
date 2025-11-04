/**
 * CV Structure Migration Utility
 *
 * Migrates legacy CV data format to the new structure-based format.
 * This is the NON-DESTRUCTIVE in-memory migration that runs when the editor loads.
 *
 * Key Features:
 * - Runs in-memory only (no database changes)
 * - Uses robust validation to determine section visibility
 * - Respects DEFAULT_SECTION_ORDER from the registry
 * - Returns new cvData object with structure property added
 */

import { UnifiedCVDataStructure, CVStructure, CVSectionStructure } from '@/types/unified-cv-schema';
import { ITemplate, ISectionBlueprint } from '@/models/Template';
import { SECTION_REGISTRY, DEFAULT_SECTION_ORDER } from '@/lib/constants/cv-sections';
import { hasSectionData } from '@/lib/utils/cv-data-validation';


/**
 * Check if CV data has already been migrated to structure format
 */
export function hasStructure(cvData: UnifiedCVDataStructure): boolean {
  return !!(cvData.structure && Array.isArray(cvData.structure.sections) && cvData.structure.sections.length > 0);
}

/**
 * THE GREAT MIGRATION
 *
 * Migrates legacy CV data to structure-based format.
 * This is a NON-DESTRUCTIVE operation that creates a new cvData object
 * with the structure property added.
 *
 * Logic:
 * 1. Check if cvData.structure.sections already exists. If yes, return unmodified.
 * 2. If not, create new structure.sections array
 * 3. Loop through DEFAULT_SECTION_ORDER
 * 4. For each sectionId:
 *    - Call hasSectionData(cvData[sectionId]) using our robust validator
 *    - If true, add { id: sectionId, type: sectionId, visible: true }
 *    - If false, add { id: sectionId, type: sectionId, visible: false }
 * 5. Return new cvData object with structure property added
 *
 * @param cvData - Original CV data (may or may not have structure)
 * @returns New cvData object with structure property (guaranteed)
 */
export function migrateLegacyCV(
  cvData: UnifiedCVDataStructure
): UnifiedCVDataStructure {
  // Step 1: Check if already migrated
  if (hasStructure(cvData)) {
    return cvData;
  }

  // Step 2: Create new structure.sections array
  const sections: CVSectionStructure[] = [];

  // Step 3: Loop through DEFAULT_SECTION_ORDER
  // IMPORTANT: Always add ALL sections to structure, even if empty
  // This ensures the structure is complete and the selector always has sections to work with
  for (const sectionId of DEFAULT_SECTION_ORDER) {
    // Verify this section exists in registry
    const registryEntry = SECTION_REGISTRY[sectionId];
    if (!registryEntry) continue;

    // Step 4: Check if section has data using robust validation
    const hasData = hasSectionData(cvData, sectionId);

    // Step 5: Determine visibility
    // - personal_header is always visible (users need to fill it)
    // - Other sections are visible ONLY if they have actual data
    // - DO NOT mark sections as visible just because arrays exist (empty arrays should be hidden)
    // - Empty sections should appear in "Add Section" modal, not in the sidebar
    let visible = false;
    
    if (sectionId === 'personal_header') {
      // Personal header is always visible (users need to fill it)
      visible = true;
    } else {
      // For other sections, ONLY mark as visible if they have actual data
      // Empty arrays should NOT be visible - they should appear in "Add Section" modal
      visible = hasData; // Only use hasData, NOT isInitialized
    }

    // Always add section to structure (even if not visible initially)
    // This ensures the structure is complete and the selector can work with it
    sections.push({
      id: sectionId,
      type: sectionId,
      visible: visible
    });
  }

  // Step 5: Return new cvData with structure added (preserves all legacy data)
  return {
    ...cvData,
    structure: {
      sections
    }
  };
}

/**
 * Convenience alias for backward compatibility
 */
export function migrateLegacyCVToStructureFormat(
  cvData: UnifiedCVDataStructure,
  _template?: ITemplate | { availableSections?: ISectionBlueprint[] }
): UnifiedCVDataStructure {
  // Template parameter is ignored in the new simplified approach
  // The structure is determined by DEFAULT_SECTION_ORDER and data presence
  return migrateLegacyCV(cvData);
}
