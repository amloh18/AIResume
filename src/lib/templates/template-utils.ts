// @ts-nocheck
/**
 * Template Utilities
 * 
 * Utility functions for working with templates, including hardcoded templates
 */

import { ALL_TEMPLATE_V2 } from './v2/template-definitions';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { ITemplate } from '@/types/template';

// ─── ATS Safety Classification ────────────────────────────────────────
//
// Single source of truth for "is this template safe for ATS parsers?".
// ATS parsers read a PDF as a linear text stream, so multi-column and
// sidebar layouts are the main structural risk. Creative palettes are a
// secondary risk (decorative headings, accent bars, coloured headings can
// break section detection).
//
// This drives three things:
//   1. Which template auto-generated Journey CVs are pinned to.
//   2. The `atsScoreCap` written onto a CV.
//   3. The formatting/parsability penalties in CentralScoreManager.

export type AtsSafety = 'safe' | 'caution' | 'risky';

/** Template used for auto-generated documents unless the source is already safe. */
export const ATS_SAFE_DEFAULT_TEMPLATE_ID = 'modern-minimal-v2';

/** Maximum ATS score achievable on a template of each safety class. */
export const ATS_SAFETY_CAPS: Record<AtsSafety, number> = {
  safe: 100,
  caution: 85,
  risky: 70,
};

export interface TemplateAtsProfile {
  /** The ID that was asked for. */
  requestedId: string;
  /** The template ID actually resolved (may be the ATS-safe default). */
  resolvedId: string;
  /** Normalised layout: single-column | two-column | sidebar-left | sidebar-right | unknown */
  layoutType: string;
  category: string;
  safety: AtsSafety;
  /** ATS score ceiling for this template. */
  cap: number;
  reason: string;
}

function normalizeCanvasLayout(type: string | undefined): string {
  switch (type) {
    case '1-col':
      return 'single-column';
    case '2-col':
    case 'hybrid-split':
      return 'two-column';
    case 'sidebar-left':
    case 'sidebar-left-dark':
    case 'top-sidebar-left':
      return 'sidebar-left';
    case 'sidebar-right':
    case 'top-sidebar-right':
      return 'sidebar-right';
    default:
      return 'unknown';
  }
}

function resolveTemplateShape(templateId: string): { layoutType: string; category: string } {
  const v2 = ALL_TEMPLATE_V2.find(t => t.id === templateId);
  if (v2) {
    return { layoutType: v2.layout?.type || 'unknown', category: v2.category || 'unknown' };
  }

  const canvas = CANVAS_TEMPLATES.find(t => t.id === templateId);
  if (canvas) {
    return {
      layoutType: normalizeCanvasLayout((canvas as any).type),
      category: (canvas as any).type === 'sidebar-left-dark' ? 'creative' : 'professional',
    };
  }

  return { layoutType: 'unknown', category: 'unknown' };
}

/**
 * True when the ID is a MongoDB ObjectId hex string (a database template
 * reference rather than a hardcoded template id).
 */
function looksLikeObjectId(templateId: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(templateId);
}

function classify(layoutType: string, category: string): { safety: AtsSafety; reason: string } {
  if (layoutType === 'unknown') {
    return { safety: 'caution', reason: 'Unknown template layout — treating as caution' };
  }

  if (layoutType === 'single-column') {
    if (category === 'creative') {
      return {
        safety: 'caution',
        reason: 'Single-column but creative styling — decorative headings can reduce parse accuracy',
      };
    }
    return { safety: 'safe', reason: 'Single-column, standard section flow' };
  }

  return {
    safety: 'risky',
    reason: `${layoutType} layout — multi-column text confuses linear ATS parsing`,
  };
}

/**
 * Resolve the ATS safety profile for a template ID.
 * Accepts canonical V2 IDs, canonical canvas IDs, and legacy aliases.
 */
export function getTemplateAtsProfile(templateId?: string | null): TemplateAtsProfile {
  const requested = (templateId || '').trim();

  if (!requested) {
    const shape = resolveTemplateShape(ATS_SAFE_DEFAULT_TEMPLATE_ID);
    const { safety, reason } = classify(shape.layoutType, shape.category);
    return {
      requestedId: '',
      resolvedId: ATS_SAFE_DEFAULT_TEMPLATE_ID,
      layoutType: shape.layoutType,
      category: shape.category,
      safety,
      cap: ATS_SAFETY_CAPS[safety],
      reason,
    };
  }

  const directShape = resolveTemplateShape(requested);

  // Only consult the legacy map when the ID is an EXPLICIT alias. Falling back
  // to `migrateLegacyTemplateId` for arbitrary strings was a safety bug: it maps
  // anything unknown to 'tpl-1' (single-column), so an unrecognised template was
  // classified `safe` and claimed a 100 ATS cap. Unknown must mean unknown.
  const alias = resolveLegacyTemplateId(requested);
  const shape =
    directShape.layoutType !== 'unknown' || !alias
      ? directShape
      : resolveTemplateShape(alias);

  const { safety, reason } = classify(shape.layoutType, shape.category);

  return {
    requestedId: requested,
    resolvedId: shape === directShape ? requested : alias!,
    layoutType: shape.layoutType,
    category: shape.category,
    safety,
    cap: ATS_SAFETY_CAPS[safety],
    reason,
  };
}

/**
 * Decide which template an auto-generated Journey CV should use.
 *
 * Keeps the Master CV's template when it is already ATS-safe. Otherwise pins
 * to the ATS-safe default so generated documents are never structurally
 * unparseable, and reports what was overridden for auditability.
 */
export function resolveAtsSafeTemplateId(templateId?: string | null): {
  templateId: string;
  pinnedFrom?: string;
  profile: TemplateAtsProfile;
} {
  const profile = getTemplateAtsProfile(templateId);

  if (!profile.requestedId || profile.safety === 'safe') {
    return { templateId: profile.resolvedId, profile };
  }

  const safeProfile = getTemplateAtsProfile(ATS_SAFE_DEFAULT_TEMPLATE_ID);
  return {
    templateId: ATS_SAFE_DEFAULT_TEMPLATE_ID,
    pinnedFrom: profile.requestedId,
    profile: safeProfile,
  };
}

// Map TemplateV2 to ITemplate for legacy support
function mapV2ToITemplate(v2: any): ITemplate {
  return {
    id: v2.id,
    _id: v2.id,
    name: v2.name,
    description: v2.description,
    thumbnail: v2.thumbnail,
    category: v2.category === 'professional' || v2.category === 'creative' || v2.category === 'minimal' || v2.category === 'academic' ? 'cv' : 'custom',
    categories: [v2.category],
    tier: v2.tier,
    layoutType: v2.layout.type === 'single-column' ? 'one-column' : v2.layout.type === 'sidebar-left' || v2.layout.type === 'sidebar-right' ? 'two-column' : 'custom',
    globalStyles: {
      fontFamily: v2.stylePreset.typography.bodyText?.fontFamily || 'Inter, sans-serif',
      primaryColor: v2.stylePreset.colors.primary,
      secondaryColor: v2.stylePreset.colors.secondary,
      backgroundColor: v2.stylePreset.colors.background,
      fontSize: v2.stylePreset.typography.bodyText?.fontSize || '10pt',
      lineHeight: v2.stylePreset.typography.bodyText?.lineHeight || '1.5',
      spacing: v2.stylePreset.spacing.sectionGap,
      borderRadius: '4px',
      boxShadow: 'none',
      customCSS: ''
    },
    availableSections: [],
    isActive: true,
    isDefault: v2.id === ATS_SAFE_DEFAULT_TEMPLATE_ID,
    isPublished: true,
    globalAccess: true,
    version: 2
  };
}

// Map CanvasTemplate to ITemplate for backward compatibility
function mapCanvasTemplateToITemplate(canvasTemplate: any): ITemplate {
  return {
    id: canvasTemplate.id,
    _id: canvasTemplate.id,
    name: canvasTemplate.name,
    description: `A ${canvasTemplate.type} layout template`,
    thumbnail: '', 
    category: 'cv',
    categories: ['cv'],
    tier: 'free',
    layoutType: canvasTemplate.type === '1-col' ? 'one-column' : 'two-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '10pt',
      lineHeight: '1.5',
      spacing: 16,
      borderRadius: '4px',
      boxShadow: 'none',
      customCSS: ''
    },
    availableSections: [],
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 3
  };
}

/**
 * Explicit legacy/alias -> canonical canvas template id mapping.
 *
 * Kept as data (not inlined in the resolver) so callers can tell the difference
 * between "this alias maps to tpl-N" and "we have no idea what this is".
 */
const LEGACY_TEMPLATE_ID_MAP: Record<string, string> = {
  // V1 legacy templates
  'data-driven-pro-template': 'tpl-2',
  'designer-modern-template': 'tpl-7',
  'elegant-timeline-template': 'tpl-14',
  'executive-professional-layout-template': 'tpl-3',
  'executive-standard-template': 'tpl-6',
  'tech-pro-blue-template': 'tpl-8',
  'the-modern-cv-template': 'tpl-2',
  'executive-minimal-template': 'tpl-1',
  'header-professional-template': 'tpl-6',
  'minimal-professional-template': 'tpl-1',
  'one-pager-professional-template': 'tpl-1',
  'professional-minimal-template': 'tpl-1',
  'professional-extended-template': 'tpl-3',

  // V2 legacy templates
  'professional-extended-v2': 'tpl-3',
  'modern-minimal-v2': 'tpl-1',
  'two-column-sidebar-v2': 'tpl-2',
  'creative-bold-v2': 'tpl-9',
  'academic-cv-v2': 'tpl-14',

  // Cover letter templates incorrectly used as CV templates
  'zurich-minimalist': 'tpl-1',
  'oxford-traditional': 'tpl-6',
  'london-corporate': 'tpl-3',
  'paris-creative': 'tpl-9',
  'silicon-valley-tech': 'tpl-8',

  // Fallbacks
  'default': 'tpl-1',
  'generic': 'tpl-1',
};

/**
 * Resolve an explicit legacy alias. Returns `null` when the ID is not a known
 * alias — callers that need to know whether a mapping really exists must use
 * this rather than {@link migrateLegacyTemplateId}, which silently falls back
 * to `tpl-1` and therefore cannot distinguish "mapped" from "unknown".
 */
export function resolveLegacyTemplateId(templateId: string | null | undefined): string | null {
  if (!templateId) return null;
  const id = String(templateId).trim();
  if (!id) return null;
  if (id.startsWith('tpl-')) return id;
  return LEGACY_TEMPLATE_ID_MAP[id] ?? null;
}

/**
 * Maps legacy template IDs (V1, V2, cover letters, custom strings) to the new canvas template system (tpl-1 to tpl-15)
 */
export function migrateLegacyTemplateId(templateId: string | null | undefined): string {
  if (!templateId) return 'tpl-1';

  const templateIdStr = String(templateId).trim();
  const resolved = resolveLegacyTemplateId(templateIdStr);
  if (resolved) return resolved;

  // Unknown / unmapped ID — log a warning so developers can add the mapping and fall back safely to tpl-1
  if (templateIdStr && !looksLikeObjectId(templateIdStr)) {
    console.warn(`[migrateLegacyTemplateId] Unmapped legacy template ID: "${templateIdStr}" — falling back to tpl-1. Add this ID to legacyMap if it should map to a different template.`);
  }
  return 'tpl-1';
}

/**
 * Get template data by ID, checking both hardcoded templates and database
 *
 * Resolution order matters: canonical V2 IDs are matched directly BEFORE the
 * legacy remap. Previously every ID went through migrateLegacyTemplateId first,
 * which meant 'professional-extended-v2' (declared single-column) was remapped
 * to 'tpl-3' (a sidebar layout) and the V2 definition became unreachable.
 */
export function getTemplateById(templateId: string): ITemplate | null {
  if (!templateId) {
    return null;
  }

  // 1. Canonical V2 template ID — honour the declared layout.
  const v2Direct = ALL_TEMPLATE_V2.find(t => t.id === templateId);
  if (v2Direct) {
    return mapV2ToITemplate(v2Direct);
  }

  // 2. Canonical canvas template ID.
  const canvasDirect = CANVAS_TEMPLATES.find(t => t.id === templateId);
  if (canvasDirect) {
    return mapCanvasTemplateToITemplate(canvasDirect);
  }

  // 3. Legacy / alias ID -> canonical canvas ID.
  const cleanId = migrateLegacyTemplateId(templateId);

  const v2Template = ALL_TEMPLATE_V2.find(t => t.id === cleanId);
  if (v2Template) {
    return mapV2ToITemplate(v2Template);
  }

  const canvasTemplate = CANVAS_TEMPLATES.find(t => t.id === cleanId);
  if (canvasTemplate) {
    return mapCanvasTemplateToITemplate(canvasTemplate);
  }

  return null;
}

/**
 * Get all available templates (hardcoded + database)
 * Templates are returned with resolved thumbnail URLs
 */
export function getAllTemplates(): ITemplate[] {
  const v2Templates = ALL_TEMPLATE_V2.map(mapV2ToITemplate);
  const canvasTemplates = CANVAS_TEMPLATES.map(mapCanvasTemplateToITemplate);
  return [...v2Templates, ...canvasTemplates];
}

/**
 * Check if a template ID refers to a hardcoded template
 */
export function isHardcodedTemplate(templateId: string): boolean {
  const cleanId = migrateLegacyTemplateId(templateId);
  return ALL_TEMPLATE_V2.some(t => t.id === cleanId) || CANVAS_TEMPLATES.some(t => t.id === cleanId);
}