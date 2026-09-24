/**
 * Canonical CV Edit Operations & Addressing System
 *
 * This module defines the deterministic contract between:
 *   CV Data ↔ Editor UI ↔ AI Editing Engine ↔ Preview/Export
 *
 * Key principles:
 * - Every editable entity has a stable ID
 * - AI edits target specific IDs, not fuzzy text matching
 * - Edits are small, deterministic patches (not full-section rewrites)
 * - All mutations are validated before commit
 * - Paragraphs and bullets coexist in a single ordered descriptions array
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// STABLE IDs
// ============================================================================

/** Generate a stable UUID v4 for CV entities */
export const generateCVId = (): string => uuidv4();

/**
 * Ensures an item has a stable ID. If missing, generates one.
 * Backward-compatible: existing IDs are preserved.
 */
export function ensureId<T extends { id?: string }>(item: T): T {
  if (item.id && item.id.length > 0) return item;
  return { ...item, id: generateCVId() };
}

// ============================================================================
// DESCRIPTION BLOCKS (Paragraphs & Bullets)
// ============================================================================

/**
 * A single description block — either a paragraph or a bullet point.
 * Both live in the same ordered array, preserving mixed ordering.
 *
 * Hybrid mode: [paragraph, bullet, bullet, paragraph, bullet]
 * Paragraph mode: [paragraph]
 * Bullets mode: [bullet, bullet, bullet]
 */
export type DescriptionBlock =
  | { id: string; type: 'paragraph'; content: string }
  | { id: string; type: 'bullet'; content: string };

/** Create a paragraph description block */
export function createParagraph(content: string, id?: string): DescriptionBlock {
  return { id: id || generateCVId(), type: 'paragraph', content };
}

/** Create a bullet description block */
export function createBullet(content: string, id?: string): DescriptionBlock {
  return { id: id || generateCVId(), type: 'bullet', content };
}

// ============================================================================
// CV ADDRESSING SYSTEM
// ============================================================================

/**
 * Precise address of an editable CV element.
 * The AI must use these addresses to target edits.
 */
export interface CVAddress {
  sectionId: string;     // e.g., "work", "education", "skills"
  recordId: string;      // e.g., "work-abc123" (the specific job/education entry)
  descriptionId?: string; // e.g., "desc-xyz789" (specific bullet/paragraph, if applicable)
  field?: string;        // e.g., "company", "position", "name" (for non-description fields)
}

/**
 * Validate that a CV address resolves to an actual element in cvData.
 * Returns the resolved element or null if invalid.
 * Includes fallback resolution when IDs don't match exactly.
 */
export function resolveCVAddress(cvData: any, address: CVAddress): { found: boolean; element?: any; error?: string } {
  const { sectionId, recordId, descriptionId, field } = address;

  // Resolve section
  const sectionData = cvData[sectionId];
  if (!sectionData) {
    return { found: false, error: `Section "${sectionId}" not found in CV` };
  }

  // For basics (object, not array), skip record resolution
  if (sectionId === 'basics') {
    if (field) {
      return { found: true, element: sectionData[field] };
    }
    return { found: true, element: sectionData };
  }

  // Resolve record within section array
  if (!Array.isArray(sectionData)) {
    return { found: false, error: `Section "${sectionId}" is not an array` };
  }

  let record = sectionData.find((r: any) => r.id === recordId);

  // Fallback: try matching by name/position/company if ID not found
  if (!record && recordId) {
    record = sectionData.find((r: any) => {
      if (!r) return false;
      const recordName = (r.name || r.company || r.position || r.role || r.title || '').toLowerCase();
      const idLower = recordId.toLowerCase();
      return recordName && (idLower.includes(recordName) || recordName.includes(idLower));
    });
  }

  // Fallback: try matching by content hash if provided in recordId
  if (!record && recordId && recordId.includes('::')) {
    const contentHint = recordId.split('::')[1]?.toLowerCase();
    if (contentHint) {
      record = sectionData.find((r: any) => {
        if (!r) return false;
        const text = JSON.stringify(r).toLowerCase();
        return text.includes(contentHint.substring(0, 20));
      });
    }
  }

  if (!record) {
    return { found: false, error: `Record "${recordId}" not found in section "${sectionId}"` };
  }

  // Resolve description within record
  if (descriptionId) {
    const descriptions = record.descriptions || [];
    let desc = descriptions.find((d: any) => d.id === descriptionId);

    // Fallback: try matching by content if ID not found
    if (!desc && descriptionId) {
      desc = descriptions.find((d: any) => {
        if (!d) return false;
        const descId = (d.id || '').toLowerCase();
        const targetId = descriptionId.toLowerCase();
        return descId && (targetId.includes(descId) || descId.includes(targetId));
      });
    }

    // Fallback: try matching by content hash
    if (!desc && descriptionId.includes('::')) {
      const contentHint = descriptionId.split('::')[1]?.toLowerCase();
      if (contentHint) {
        desc = descriptions.find((d: any) => {
          if (!d || !d.content) return false;
          return d.content.toLowerCase().includes(contentHint.substring(0, 20));
        });
      }
    }

    if (!desc) {
      return { found: false, error: `Description "${descriptionId}" not found in record "${recordId}"` };
    }
    return { found: true, element: desc };
  }

  // Resolve specific field
  if (field) {
    return { found: true, element: record[field] };
  }

  return { found: true, element: record };
}

// ============================================================================
// EDIT OPERATIONS
// ============================================================================

/**
 * Structured edit operations that the AI returns.
 * Each operation targets a specific CV element by ID.
 * The AI should return small, focused patches — not full-section rewrites.
 */
export type CVEditOperation =
  | UpdateTextOperation
  | ChangeDescriptionTypeOperation
  | AddDescriptionOperation
  | DeleteDescriptionOperation
  | UpdateFieldOperation
  | AddRecordOperation
  | DeleteRecordOperation;

export interface UpdateTextOperation {
  operation: 'update_text';
  sectionId: string;
  recordId: string;
  descriptionId: string;
  content: string;
}

export interface ChangeDescriptionTypeOperation {
  operation: 'change_description_type';
  sectionId: string;
  recordId: string;
  descriptionId: string;
  type: 'paragraph' | 'bullet';
}

export interface AddDescriptionOperation {
  operation: 'add_description';
  sectionId: string;
  recordId: string;
  afterDescriptionId?: string; // Insert after this description (omit = prepend)
  type: 'paragraph' | 'bullet';
  content: string;
}

export interface DeleteDescriptionOperation {
  operation: 'delete_description';
  sectionId: string;
  recordId: string;
  descriptionId: string;
}

export interface UpdateFieldOperation {
  operation: 'update_field';
  sectionId: string;
  recordId: string;
  field: string;
  value: any;
}

export interface AddRecordOperation {
  operation: 'add_record';
  sectionId: string;
  afterRecordId?: string; // Insert after this record (omit = append)
  record: Record<string, any>;
}

export interface DeleteRecordOperation {
  operation: 'delete_record';
  sectionId: string;
  recordId: string;
}

// ============================================================================
// EDIT RESULT
// ============================================================================

/**
 * Result of applying an edit operation.
 * Includes before/after for auditing and undo support.
 */
export interface CVEditResult {
  operation: CVEditOperation;
  success: boolean;
  before?: any;
  after?: any;
  error?: string;
}

/**
 * Complete result of an AI editing session.
 * Contains the operations, applied results, and a human-readable message.
 */
export interface CVEditSessionResult {
  message: string;
  operations: CVEditOperation[];
  results: CVEditResult[];
  cvData: any; // The modified CV data
  allSucceeded: boolean;
}

// ============================================================================
// AI RESPONSE SCHEMA
// ============================================================================

/**
 * The structured format the AI should return for CV edits.
 * This replaces the current "patch with full section replacements" approach.
 */
export interface MoriChatAIResponse {
  /** Human-readable message (no JSON/CV data) */
  message: string;
  /** Clarification options if the target is ambiguous */
  options: Array<{ label: string; prompt: string }> | null;
  /** Structured edit operations (small, targeted patches) */
  operations: CVEditOperation[] | null;
  /**
   * Legacy: full section replacements (kept for backward compat).
   * New code should prefer `operations` for targeted edits.
   */
  patch: Record<string, any> | null;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a CVEditOperation against the current CV data.
 * Returns validation result with specific error messages.
 * Uses fallback resolution when exact IDs don't match.
 */
export function validateEditOperation(cvData: any, op: CVEditOperation): { valid: boolean; error?: string } {
  // Helper: find record with fallback
  const findRecordInSection = (section: any[], recordId: string): any => {
    if (!Array.isArray(section)) return null;
    const record = section.find((r: any) => r.id === recordId);
    if (record) return record;
    return section.find((r: any) => {
      if (!r) return false;
      const recordName = (r.name || r.company || r.position || r.role || r.title || '').toLowerCase();
      const idLower = recordId.toLowerCase();
      return recordName && (idLower.includes(recordName) || recordName.includes(idLower));
    });
  };

  // Helper: find description with fallback
  const findDescriptionInRecord = (record: any, descriptionId: string): any => {
    if (!record) return null;
    const descs = record.descriptions || [];
    let desc = descs.find((d: any) => d.id === descriptionId);
    if (desc) return desc;
    if (descriptionId.includes('::')) {
      const contentHint = descriptionId.split('::')[1]?.toLowerCase();
      if (contentHint) {
        desc = descs.find((d: any) => {
          if (!d || !d.content) return false;
          return d.content.toLowerCase().includes(contentHint.substring(0, 20));
        });
        if (desc) return desc;
      }
    }
    return descs.find((d: any) => {
      if (!d) return false;
      const descId = (d.id || '').toLowerCase();
      const targetId = descriptionId.toLowerCase();
      return descId && (targetId.includes(descId) || descId.includes(targetId));
    });
  };

  switch (op.operation) {
    case 'update_text': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData || !Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" not found or not an array` };
      }
      const record = findRecordInSection(sectionData, op.recordId);
      if (!record) {
        return { valid: false, error: `Record "${op.recordId}" not found in section "${op.sectionId}"` };
      }
      const desc = findDescriptionInRecord(record, op.descriptionId);
      if (!desc) {
        return { valid: false, error: `Description "${op.descriptionId}" not found in record "${op.recordId}"` };
      }
      if (typeof op.content !== 'string' || op.content.trim().length === 0) {
        return { valid: false, error: 'Content cannot be empty' };
      }
      return { valid: true };
    }

    case 'change_description_type': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData || !Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" not found or not an array` };
      }
      const record = findRecordInSection(sectionData, op.recordId);
      if (!record) {
        return { valid: false, error: `Record "${op.recordId}" not found in section "${op.sectionId}"` };
      }
      const desc = findDescriptionInRecord(record, op.descriptionId);
      if (!desc) {
        return { valid: false, error: `Description "${op.descriptionId}" not found` };
      }
      if (!['paragraph', 'bullet'].includes(op.type)) {
        return { valid: false, error: `Invalid description type: ${op.type}` };
      }
      return { valid: true };
    }

    case 'add_description': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData || !Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" not found or not an array` };
      }
      const record = findRecordInSection(sectionData, op.recordId);
      if (!record) {
        return { valid: false, error: `Record "${op.recordId}" not found in section "${op.sectionId}"` };
      }
      if (op.afterDescriptionId) {
        const descs = record.descriptions || [];
        const refDesc = findDescriptionInRecord(record, op.afterDescriptionId);
        if (!refDesc) {
          return { valid: false, error: `Reference description "${op.afterDescriptionId}" not found` };
        }
      }
      if (!['paragraph', 'bullet'].includes(op.type)) {
        return { valid: false, error: `Invalid description type: ${op.type}` };
      }
      if (typeof op.content !== 'string' || op.content.trim().length === 0) {
        return { valid: false, error: 'Content cannot be empty' };
      }
      return { valid: true };
    }

    case 'delete_description': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData || !Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" not found or not an array` };
      }
      const record = findRecordInSection(sectionData, op.recordId);
      if (!record) {
        return { valid: false, error: `Record "${op.recordId}" not found in section "${op.sectionId}"` };
      }
      const desc = findDescriptionInRecord(record, op.descriptionId);
      if (!desc) {
        return { valid: false, error: `Description "${op.descriptionId}" not found` };
      }
      return { valid: true };
    }

    case 'update_field': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData) {
        return { valid: false, error: `Section "${op.sectionId}" not found` };
      }
      if (op.sectionId === 'basics') {
        return { valid: true };
      }
      if (!Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" is not an array` };
      }
      const record = findRecordInSection(sectionData, op.recordId);
      if (!record) {
        return { valid: false, error: `Record "${op.recordId}" not found in section "${op.sectionId}"` };
      }
      return { valid: true };
    }

    case 'add_record': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData || !Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" not found or not an array` };
      }
      if (op.afterRecordId) {
        if (!sectionData.find((r: any) => r.id === op.afterRecordId)) {
          return { valid: false, error: `Reference record "${op.afterRecordId}" not found` };
        }
      }
      return { valid: true };
    }

    case 'delete_record': {
      const sectionData = cvData[op.sectionId];
      if (!sectionData || !Array.isArray(sectionData)) {
        return { valid: false, error: `Section "${op.sectionId}" not found or not an array` };
      }
      if (!sectionData.find((r: any) => r.id === op.recordId)) {
        return { valid: false, error: `Record "${op.recordId}" not found in section "${op.sectionId}"` };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: `Unknown operation type: ${(op as any).operation}` };
  }
}

// ============================================================================
// APPLY EDIT OPERATIONS
// ============================================================================

/**
 * Apply a single edit operation to CV data (produces a new object, does not mutate).
 * Returns the modified CV data and before/after values for auditing.
 * Includes fallback ID resolution when exact IDs don't match.
 */
export function applyEditOperation(cvData: any, op: CVEditOperation): { cvData: any; before?: any; after?: any; error?: string } {
  // Deep clone to prevent mutation
  const next = JSON.parse(JSON.stringify(cvData));

  // Helper: find record with fallback
  const findRecord = (section: any[], recordId: string): any => {
    if (!Array.isArray(section)) return null;
    const record = section.find((r: any) => r.id === recordId);
    if (record) return record;
    // Fallback: match by name/position/company
    return section.find((r: any) => {
      if (!r) return false;
      const recordName = (r.name || r.company || r.position || r.role || r.title || '').toLowerCase();
      const idLower = recordId.toLowerCase();
      return recordName && (idLower.includes(recordName) || recordName.includes(idLower));
    });
  };

  // Helper: find description with fallback
  const findDescription = (record: any, descriptionId: string): any => {
    if (!record) return null;
    const descs = record.descriptions || [];
    let desc = descs.find((d: any) => d.id === descriptionId);
    if (desc) return desc;
    // Fallback: match by content hash
    if (descriptionId.includes('::')) {
      const contentHint = descriptionId.split('::')[1]?.toLowerCase();
      if (contentHint) {
        desc = descs.find((d: any) => {
          if (!d || !d.content) return false;
          return d.content.toLowerCase().includes(contentHint.substring(0, 20));
        });
        if (desc) return desc;
      }
    }
    // Fallback: match by ID similarity
    return descs.find((d: any) => {
      if (!d) return false;
      const descId = (d.id || '').toLowerCase();
      const targetId = descriptionId.toLowerCase();
      return descId && (targetId.includes(descId) || descId.includes(targetId));
    });
  };

  switch (op.operation) {
    case 'update_text': {
      const section = next[op.sectionId];
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const record = findRecord(section, op.recordId);
      if (!record) return { cvData: next, error: 'Record not found' };
      const descs = record.descriptions || [];
      const descIdx = descs.findIndex((d: any) => d.id === op.descriptionId);
      if (descIdx === -1) {
        // Fallback: find by content similarity
        const fallbackDesc = findDescription(record, op.descriptionId);
        if (!fallbackDesc) return { cvData: next, error: 'Description not found' };
        const fallbackIdx = descs.indexOf(fallbackDesc);
        const before = fallbackDesc.content;
        descs[fallbackIdx] = { ...fallbackDesc, content: op.content };
        return { cvData: next, before, after: op.content };
      }
      const before = descs[descIdx].content;
      descs[descIdx] = { ...descs[descIdx], content: op.content };
      return { cvData: next, before, after: op.content };
    }

    case 'change_description_type': {
      const section = next[op.sectionId];
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const record = findRecord(section, op.recordId);
      if (!record) return { cvData: next, error: 'Record not found' };
      const descs = record.descriptions || [];
      const descIdx = descs.findIndex((d: any) => d.id === op.descriptionId);
      if (descIdx === -1) {
        const fallbackDesc = findDescription(record, op.descriptionId);
        if (!fallbackDesc) return { cvData: next, error: 'Description not found' };
        const fallbackIdx = descs.indexOf(fallbackDesc);
        const before = fallbackDesc.type;
        descs[fallbackIdx] = { ...fallbackDesc, type: op.type };
        return { cvData: next, before, after: op.type };
      }
      const before = descs[descIdx].type;
      descs[descIdx] = { ...descs[descIdx], type: op.type };
      return { cvData: next, before, after: op.type };
    }

    case 'add_description': {
      const section = next[op.sectionId];
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const record = findRecord(section, op.recordId);
      if (!record) return { cvData: next, error: 'Record not found' };
      if (!record.descriptions) record.descriptions = [];
      const newDesc: DescriptionBlock = { id: generateCVId(), type: op.type, content: op.content };
      if (op.afterDescriptionId) {
        const idx = record.descriptions.findIndex((d: any) => d.id === op.afterDescriptionId);
        if (idx === -1) {
          const fallbackDesc = findDescription(record, op.afterDescriptionId);
          if (fallbackDesc) {
            const fallbackIdx = record.descriptions.indexOf(fallbackDesc);
            record.descriptions.splice(fallbackIdx + 1, 0, newDesc);
          } else {
            return { cvData: next, error: 'Reference description not found' };
          }
        } else {
          record.descriptions.splice(idx + 1, 0, newDesc);
        }
      } else {
        record.descriptions.unshift(newDesc);
      }
      return { cvData: next, before: null, after: newDesc };
    }

    case 'delete_description': {
      const section = next[op.sectionId];
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const record = findRecord(section, op.recordId);
      if (!record) return { cvData: next, error: 'Record not found' };
      const descs = record.descriptions || [];
      const idx = descs.findIndex((d: any) => d.id === op.descriptionId);
      if (idx === -1) {
        const fallbackDesc = findDescription(record, op.descriptionId);
        if (!fallbackDesc) return { cvData: next, error: 'Description not found' };
        const fallbackIdx = descs.indexOf(fallbackDesc);
        const before = descs[fallbackIdx];
        record.descriptions = descs.filter((_: any, i: number) => i !== fallbackIdx);
        return { cvData: next, before, after: null };
      }
      const before = descs[idx];
      record.descriptions = descs.filter((_: any, i: number) => i !== idx);
      return { cvData: next, before, after: null };
    }

    case 'update_field': {
      const section = next[op.sectionId];
      if (!section) return { cvData: next, error: 'Section not found' };
      if (op.sectionId === 'basics') {
        const before = section[op.field];
        section[op.field] = op.value;
        return { cvData: next, before, after: op.value };
      }
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const record = findRecord(section, op.recordId);
      if (!record) return { cvData: next, error: 'Record not found' };
      const before = record[op.field];
      record[op.field] = op.value;
      return { cvData: next, before, after: op.value };
    }

    case 'add_record': {
      const section = next[op.sectionId];
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const newRecord = ensureId(op.record);
      if (op.afterRecordId) {
        const idx = section.findIndex((r: any) => r.id === op.afterRecordId);
        if (idx === -1) return { cvData: next, error: 'Reference record not found' };
        section.splice(idx + 1, 0, newRecord);
      } else {
        section.push(newRecord);
      }
      return { cvData: next, before: null, after: newRecord };
    }

    case 'delete_record': {
      const section = next[op.sectionId];
      if (!Array.isArray(section)) return { cvData: next, error: 'Section not found' };
      const idx = section.findIndex((r: any) => r.id === op.recordId);
      if (idx === -1) return { cvData: next, error: 'Record not found' };
      const before = section[idx];
      next[op.sectionId] = section.filter((_: any, i: number) => i !== idx);
      return { cvData: next, before, after: null };
    }

    default:
      return { cvData: next, error: `Unknown operation: ${(op as any).operation}` };
  }
}

/**
 * Apply multiple edit operations atomically.
 * If any operation fails, the entire batch is rolled back.
 */
export function applyEditOperations(
  cvData: any,
  operations: CVEditOperation[]
): CVEditSessionResult {
  const results: CVEditResult[] = [];
  let currentCv = JSON.parse(JSON.stringify(cvData));

  for (const op of operations) {
    // Validate first
    const validation = validateEditOperation(currentCv, op);
    if (!validation.valid) {
      // Rollback: return original CV
      return {
        message: `Edit failed: ${validation.error}`,
        operations,
        results: [...results, { operation: op, success: false, error: validation.error }],
        cvData, // Original, unmodified
        allSucceeded: false,
      };
    }

    // Apply
    const { cvData: modified, before, after, error } = applyEditOperation(currentCv, op);

    if (error) {
      return {
        message: `Edit failed: ${error}`,
        operations,
        results: [...results, { operation: op, success: false, error }],
        cvData,
        allSucceeded: false,
      };
    }

    currentCv = modified;
    results.push({ operation: op, success: true, before, after });
  }

  // Check if anything actually changed
  const changed = JSON.stringify(currentCv) !== JSON.stringify(cvData);

  return {
    message: changed ? 'CV updated successfully' : 'No changes were made',
    operations,
    results,
    cvData: currentCv,
    allSucceeded: true,
  };
}

// ============================================================================
// SNAPSHOT COMPARISON (for AI edit verification)
// ============================================================================

/**
 * Compare two CV states and return the paths that changed.
 * Used to verify AI edits only affected the intended targets.
 */
export function diffCVData(before: any, after: any, path = ''): Array<{ path: string; before: any; after: any }> {
  const diffs: Array<{ path: string; before: any; after: any }> = [];

  if (typeof before !== typeof after || JSON.stringify(before) === JSON.stringify(after)) {
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diffs.push({ path, before, after });
    }
    return diffs;
  }

  if (typeof before !== 'object' || before === null || after === null) {
    if (before !== after) {
      diffs.push({ path, before, after });
    }
    return diffs;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      diffs.push(...diffCVData(before[i], after[i], `${path}[${i}]`));
    }
    return diffs;
  }

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (key === 'id') continue; // IDs don't count as changes
    diffs.push(...diffCVData(before[key], after[key], path ? `${path}.${key}` : key));
  }

  return diffs;
}
