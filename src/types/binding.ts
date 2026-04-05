/**
 * BINDING SYSTEM — Connects Template Slots to Snippets
 *
 * CVInstance = template_id + slot_bindings + style_overrides
 * Never save templates with content — content lives in snippets.
 */

import { SnippetType } from './snippet-v2';
import { StylePreset, SlotDefinition, TemplateV2 } from './template-v2';

// ─── SLOT BINDING ────────────────────────────────────────

export interface SlotBinding {
  slotId: string;
  snippetId: string;
  order: number;
  visible: boolean;
}

// ─── CV INSTANCE ─────────────────────────────────────────

export interface CVMetadata {
  isMaster: boolean;
  lastModified: Date;
  createdFrom?: string;
  createdVia?: string;
  tags: string[];
  isPublic: boolean;
  viewCount: number;
  downloadCount: number;
  atsScore?: number;
  atsScoreDate?: Date;
  thumbnailUrl?: string;
  thumbnailGeneratedAt?: Date;
  starred: boolean;
  cvType?: 'master' | 'journey' | 'standalone';
  atsScoreCap?: number;
  parentMasterId?: string;
  isUserMaster?: boolean;
  fresherMode?: boolean;
}

export interface CVInstance {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  styleOverrides?: Partial<StylePreset>;
  slotBindings: SlotBinding[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  schemaVersion: 1 | 2;
  cvType: 'master' | 'journey' | 'standalone';
  journeyId?: string;
  metadata: CVMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// ─── SNIPPET EDIT RESULT ─────────────────────────────────

export interface SnippetEditResult {
  originalSnippetId: string;
  newSnippetId: string;
  slotId: string;
}

// ─── RECONCILIATION ──────────────────────────────────────

export interface ReconciliationResult {
  bindings: SlotBinding[];
  orphaned: Array<{
    snippetId: string;
    snippetType: SnippetType;
    reason: string;
  }>;
  empty: Array<{
    slotId: string;
    slotDefinition: SlotDefinition;
    suggestions: string[];
  }>;
  warnings: string[];
}

// ─── BINDING VALIDATION ──────────────────────────────────

export interface BindingValidationWarning {
  slotId: string;
  snippetId?: string;
  type: 'type_mismatch' | 'required_empty' | 'max_exceeded' | 'orphaned';
  message: string;
}

// ─── TEMPLATE SWITCH RESULT ──────────────────────────────

export interface TemplateSwitchResult {
  success: boolean;
  instance: CVInstance;
  reconciliation: ReconciliationResult;
  warnings: string[];
}

// ─── HELPERS ─────────────────────────────────────────────

export function createEmptyCVInstance(
  userId: string,
  title: string,
  templateId: string,
  cvType: 'master' | 'journey' | 'standalone' = 'standalone'
): CVInstance {
  return {
    id: crypto.randomUUID(),
    userId,
    title,
    templateId,
    slotBindings: [],
    status: 'draft',
    version: 1,
    schemaVersion: 2,
    cvType,
    metadata: {
      isMaster: cvType === 'master',
      lastModified: new Date(),
      tags: [],
      isPublic: false,
      viewCount: 0,
      downloadCount: 0,
      starred: false,
      cvType,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createSlotBinding(
  slotId: string,
  snippetId: string,
  order: number = 0,
  visible: boolean = true
): SlotBinding {
  return { slotId, snippetId, order, visible };
}

export function getBindingsForSlot(
  bindings: SlotBinding[],
  slotId: string
): SlotBinding[] {
  return bindings
    .filter((b) => b.slotId === slotId && b.visible)
    .sort((a, b) => a.order - b.order);
}

export function getSnippetIdsForSlot(
  bindings: SlotBinding[],
  slotId: string
): string[] {
  return getBindingsForSlot(bindings, slotId).map((b) => b.snippetId);
}
