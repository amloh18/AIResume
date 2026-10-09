/**
 * CV Data Normalizer & Validator
 *
 * Central module for ensuring CV data has stable IDs, consistent structure,
 * and valid descriptions. Used at controlled boundaries:
 * - After loading from database
 * - Before editing
 * - After AI editing
 * - Before saving
 * - Before rendering/exporting
 *
 * Backward-compatible: existing CVs without IDs are normalized in-memory.
 * Original database records are NOT modified until explicit save.
 */

import { generateCVId, ensureId } from './cv-edit-ops';
import { DESCRIPTION_SECTION_FIELDS, materializeRecordDescriptionViews } from '@/lib/utils/cv-description-blocks';

// ============================================================================
// NORMALIZE: Add IDs to legacy CV data
// ============================================================================

/**
 * Normalize a full CV data structure to ensure all items have stable IDs
 * and descriptions are in canonical format.
 *
 * This is a pure function — it returns a new object, never mutates input.
 */
export function normalizeCvData(cvData: any): any {
  if (!cvData || typeof cvData !== 'object') return cvData;

  const next = JSON.parse(JSON.stringify(cvData));

  // Normalize basics
  if (next.basics) {
    next.basics = normalizeBasics(next.basics);
  }

  // Normalize array sections
  const arraySections = [
    'work', 'experience', 'education', 'skills', 'projects', 'certificates',
    'languages', 'awards', 'publications', 'volunteer',
    'interests', 'references'
  ];

  for (const sectionKey of arraySections) {
    if (Array.isArray(next[sectionKey])) {
      next[sectionKey] = next[sectionKey].map((item: any, index: number) =>
        normalizeRecord(item, sectionKey, index)
      );
    }
  }

  return next;
}

/**
 * Normalize basics section — ensure location and profiles have IDs
 */
function normalizeBasics(basics: any): any {
  if (!basics || typeof basics !== 'object') return basics;

  const next = { ...basics };

  // Ensure location has an ID
  if (next.location && typeof next.location === 'object') {
    next.location = ensureId(next.location);
  }

  // Ensure profiles have IDs
  if (Array.isArray(next.profiles)) {
    next.profiles = next.profiles.map((p: any, i: number) => ensureId(p));
  }

  return next;
}

/**
 * Normalize a record (item within a section array).
 * Ensures the record has an ID and converts legacy description formats.
 */
function normalizeRecord(item: any, sectionKey: string, index: number): any {
  if (!item || typeof item !== 'object') return item;

  const next = { ...item };

  // Ensure record has an ID
  if (!next.id || next.id.length === 0) {
    next.id = `${sectionKey}-${generateCVId().substring(0, 8)}`;
  }

  /* Combined description model — paragraphs and bullets live in ONE ordered
   * `descriptions` array.
   *
   * Reconcile it against the legacy fields on every normalization so Mori
   * always sees the CURRENT text: when the two views disagree, the legacy
   * summary/highlights/description are the ones external writers (CV Surgeon,
   * tailoring, patches) just edited, so they win; when they agree, the ordered
   * blocks are kept so mixed ordering survives. Records with blocks but no
   * legacy content at all keep their blocks (an AI-only write).
   *
   * The call also materializes the legacy fields back from the blocks, which is
   * what keeps the two views in agreement. */
  if (DESCRIPTION_SECTION_FIELDS[sectionKey]) {
    materializeRecordDescriptionViews(next, DESCRIPTION_SECTION_FIELDS[sectionKey], {
      previousDescriptions: Array.isArray(item.descriptions) ? item.descriptions : undefined,
    });
  }

  // Ensure skills items have IDs
  if (sectionKey === 'skills' && Array.isArray(next.skills)) {
    next.skills = next.skills.map((s: any) => {
      if (typeof s === 'string') return { id: generateCVId(), name: s };
      return ensureId(s);
    });
  }

  // Ensure education courses have IDs (if they exist as objects)
  if (sectionKey === 'education' && Array.isArray(next.courses)) {
    // Courses are typically strings, leave as-is
  }

  return next;
}

// ============================================================================
// VALIDATE: Check CV data integrity
// ============================================================================

export interface CVValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate CV data structure.
 * Checks for missing IDs, duplicate IDs, invalid structures.
 */
export function validateCvData(cvData: any): CVValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cvData || typeof cvData !== 'object') {
    return { valid: false, errors: ['CV data is null or not an object'], warnings: [] };
  }

  // Check basics
  if (!cvData.basics || typeof cvData.basics !== 'object') {
    errors.push('Missing or invalid basics section');
  }

  // Track IDs for duplicate detection
  const seenIds = new Set<string>();

  // Validate array sections
  const arraySections = [
    'work', 'education', 'skills', 'projects', 'certificates',
    'languages', 'awards', 'publications', 'volunteer',
    'interests', 'references'
  ];

  for (const sectionKey of arraySections) {
    if (!Array.isArray(cvData[sectionKey])) continue;

    for (let i = 0; i < cvData[sectionKey].length; i++) {
      const item = cvData[sectionKey][i];
      const path = `${sectionKey}[${i}]`;

      // Check record ID
      if (!item.id) {
        warnings.push(`${path}: Missing record ID (will be assigned on normalize)`);
      } else if (seenIds.has(item.id)) {
        errors.push(`${path}: Duplicate record ID "${item.id}"`);
      } else {
        seenIds.add(item.id);
      }

      // Check descriptions
      if (Array.isArray(item.descriptions)) {
        for (let j = 0; j < item.descriptions.length; j++) {
          const desc = item.descriptions[j];
          const descPath = `${path}.descriptions[${j}]`;

          if (!desc.id) {
            warnings.push(`${descPath}: Missing description ID`);
          } else if (seenIds.has(desc.id)) {
            errors.push(`${descPath}: Duplicate description ID "${desc.id}"`);
          } else {
            seenIds.add(desc.id);
          }

          if (!['paragraph', 'bullet'].includes(desc.type)) {
            errors.push(`${descPath}: Invalid description type "${desc.type}"`);
          }

          if (typeof desc.content !== 'string') {
            errors.push(`${descPath}: Description content must be a string`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// READINESS CHECK: Is CV data ready for AI editing?
// ============================================================================

/**
 * Check if CV data is ready for AI editing (has stable IDs).
 * If not, normalize it first.
 */
export function ensureCvReadyForEditing(cvData: any): { cvData: any; wasNormalized: boolean } {
  const validation = validateCvData(cvData);

  // If there are missing IDs (warnings only), normalize
  if (validation.warnings.some(w => w.includes('Missing'))) {
    return { cvData: normalizeCvData(cvData), wasNormalized: true };
  }

  // If there are errors, still normalize (best effort)
  if (!validation.valid) {
    return { cvData: normalizeCvData(cvData), wasNormalized: true };
  }

  return { cvData, wasNormalized: false };
}
