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

import { generateCVId, ensureId, type DescriptionBlock } from './cv-edit-ops';

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
    'work', 'education', 'skills', 'projects', 'certificates',
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

  // Convert highlights (string[]) to descriptions (DescriptionBlock[]) if not present
  // This is the key backward-compatibility bridge
  if (!next.descriptions) {
    next.descriptions = convertToDescriptions(next, sectionKey);
  }

  // Ensure all description blocks have IDs and valid types
  if (Array.isArray(next.descriptions)) {
    next.descriptions = next.descriptions.map((d: any, i: number) => {
      if (!d || typeof d !== 'object') {
        return { id: generateCVId(), type: 'paragraph', content: String(d || '') };
      }
      return {
        id: d.id || generateCVId(),
        type: d.type === 'bullet' ? 'bullet' : 'paragraph',
        content: d.content || '',
      };
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

/**
 * Convert legacy highlights/summary to canonical DescriptionBlock[].
 *
 * Mapping rules:
 * - summary (string) → paragraph block(s) (split on double newlines)
 * - highlights (string[]) → bullet blocks
 * - If both exist: summary blocks come first, then bullet blocks
 * - Empty/whitespace-only content is filtered out
 */
function convertToDescriptions(item: any, sectionKey: string): DescriptionBlock[] {
  const descriptions: DescriptionBlock[] = [];

  // Get summary text (paragraph content)
  const summary = typeof item.summary === 'string' ? item.summary.trim() : '';

  // Get highlights (bullet content)
  const highlights = Array.isArray(item.highlights)
    ? item.highlights.filter((h: any) => typeof h === 'string' && h.trim().length > 0)
    : [];

  // Also check for 'description' field (used in some sections)
  const description = typeof item.description === 'string' ? item.description.trim() : '';

  // For sections that use 'description' instead of 'summary'
  const paragraphText = sectionKey === 'projects' || sectionKey === 'certificates'
    ? description
    : summary;

  // Add paragraph blocks from summary/description
  if (paragraphText) {
    // Split on double newlines for multiple paragraphs
    const paragraphs = paragraphText.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
    for (const para of paragraphs) {
      descriptions.push({
        id: generateCVId(),
        type: 'paragraph',
        content: para.trim(),
      });
    }
  }

  // Add bullet blocks from highlights
  for (const highlight of highlights) {
    descriptions.push({
      id: generateCVId(),
      type: 'bullet',
      content: highlight.trim(),
    });
  }

  // If neither summary nor highlights produced anything, return empty
  return descriptions;
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
