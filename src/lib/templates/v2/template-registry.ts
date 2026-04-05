/**
 * Template V2 Registry
 *
 * Central registry for all slot-based templates.
 */

import type { TemplateV2, SlotType } from '@/types/template-v2';
import type { SnippetType } from '@/types/snippet-v2';
import {
  ALL_TEMPLATE_V2,
  PROFESSIONAL_EXTENDED_V2,
  MODERN_MINIMAL_V2,
  TWO_COLUMN_SIDEBAR_V2,
  CREATIVE_BOLD_V2,
  ACADEMIC_CV_V2,
} from './template-definitions';

const templateMap = new Map<string, TemplateV2>();

for (const template of ALL_TEMPLATE_V2) {
  templateMap.set(template.id, template);
}

export function getTemplateV2(id: string): TemplateV2 | undefined {
  return templateMap.get(id);
}

export function getAllTemplatesV2(): TemplateV2[] {
  return ALL_TEMPLATE_V2;
}

export function getTemplatesByCategory(
  category: TemplateV2['category']
): TemplateV2[] {
  return ALL_TEMPLATE_V2.filter((t) => t.category === category);
}

export function getTemplatesByTier(tier: TemplateV2['tier']): TemplateV2[] {
  return ALL_TEMPLATE_V2.filter((t) => t.tier === tier);
}

export function getCompatibleTemplates(
  snippetTypes: SnippetType[]
): TemplateV2[] {
  return ALL_TEMPLATE_V2.filter((t) =>
    snippetTypes.every((st) => t.compatibleSnippetTypes.includes(st))
  );
}

export function getRequiredSlots(template: TemplateV2): TemplateV2['slots'] {
  return template.slots.filter((s) => s.required);
}

export function getRepeatableSlots(template: TemplateV2): TemplateV2['slots'] {
  return template.slots.filter((s) => s.repeatable);
}

export function getSlotsByColumn(
  template: TemplateV2,
  column: 'main' | 'sidebar'
): TemplateV2['slots'] {
  return template.slots
    .filter((s) => s.column === column)
    .sort((a, b) => a.order - b.order);
}

export function getDefaultTemplateV2(): TemplateV2 {
  return PROFESSIONAL_EXTENDED_V2;
}

export {
  PROFESSIONAL_EXTENDED_V2,
  MODERN_MINIMAL_V2,
  TWO_COLUMN_SIDEBAR_V2,
  CREATIVE_BOLD_V2,
  ACADEMIC_CV_V2,
};
