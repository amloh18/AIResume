/**
 * Legacy Adapter
 *
 * Bridges old custom renderers to accept CVInstance + snippets.
 * During migration, this wraps existing renderers without rewriting them.
 */

import type { CVInstance } from '@/types/binding';
import type { SnippetV2 } from '@/types/snippet-v2';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { snippetsToUnifiedCV } from '@/lib/snippets/v2/snippet-transformer';

/**
 * Convert CVInstance + snippets to legacy UnifiedCVDataStructure format.
 * This allows existing custom renderers to keep working.
 */
export function adaptToLegacyFormat(
  instance: CVInstance,
  snippets: Map<string, SnippetV2>
): UnifiedCVDataStructure {
  return snippetsToUnifiedCV(instance, snippets);
}

/**
 * Check if a CV is in V2 format.
 */
export function isV2Format(instance: CVInstance): boolean {
  return instance.schemaVersion === 2;
}

/**
 * Get template name from template ID for legacy renderer lookup.
 */
export function getLegacyRendererName(templateId: string): string | undefined {
  const mapping: Record<string, string> = {
    'professional-extended-v2': 'ProfessionalExtended',
    'modern-minimal-v2': 'ProfessionalMinimal',
    'two-column-sidebar-v2': 'DataDrivenPro',
    'creative-bold-v2': 'DesignerModern',
    'academic-cv-v2': 'AcademicCV',
  };
  return mapping[templateId];
}
