// @ts-nocheck
/**
 * Slot Compatibility Checker
 *
 * Validates whether snippets can be bound to template slots.
 */

import type { TemplateV2, SlotDefinition } from '@/types/template-v2';
import type { SnippetType, SnippetV2 } from '@/types/snippet-v2';
import type { SlotBinding } from '@/types/binding';

/**
 * Check if a snippet type is compatible with a slot.
 */
export function isSnippetCompatibleWithSlot(
  snippetType: SnippetType,
  slot: SlotDefinition
): boolean {
  return slot.constraints.allowedSnippetTypes.includes(snippetType);
}

/**
 * Check if a specific snippet is compatible with a slot.
 */
export function isSnippetV2CompatibleWithSlot(
  snippet: SnippetV2,
  slot: SlotDefinition
): boolean {
  return isSnippetCompatibleWithSlot(snippet.type, slot);
}

/**
 * Get all slots in a template that accept a given snippet type.
 */
export function getCompatibleSlots(
  template: TemplateV2,
  snippetType: SnippetType
): SlotDefinition[] {
  return template.slots.filter((slot) =>
    isSnippetCompatibleWithSlot(snippetType, slot)
  );
}

/**
 * Validate all bindings against a template.
 * Returns list of issues.
 */
export function validateBindings(
  template: TemplateV2,
  bindings: SlotBinding[],
  snippets: Map<string, SnippetV2>
): Array<{ slotId: string; snippetId?: string; type: string; message: string }> {
  const issues: Array<{ slotId: string; snippetId?: string; type: string; message: string }> = [];
  const slotCounts = new Map<string, number>();

  for (const binding of bindings) {
    if (!binding.visible) continue;

    const slot = template.slots.find((s) => s.id === binding.slotId);
    const snippet = snippets.get(binding.snippetId);

    if (!slot) {
      issues.push({
        slotId: binding.slotId,
        snippetId: binding.snippetId,
        type: 'orphaned',
        message: `Slot "${binding.slotId}" does not exist in template "${template.name}"`,
      });
      continue;
    }

    if (!snippet) {
      issues.push({
        slotId: binding.slotId,
        snippetId: binding.snippetId,
        type: 'missing_snippet',
        message: `Snippet "${binding.snippetId}" not found`,
      });
      continue;
    }

    if (!isSnippetCompatibleWithSlot(snippet.type, slot)) {
      issues.push({
        slotId: binding.slotId,
        snippetId: binding.snippetId,
        type: 'type_mismatch',
        message: `Snippet type "${snippet.type}" is not allowed in slot "${slot.label}" (allowed: ${slot.constraints.allowedSnippetTypes.join(', ')})`,
      });
    }

    // Count bindings per slot for repeatable check
    const count = slotCounts.get(binding.slotId) || 0;
    slotCounts.set(binding.slotId, count + 1);
  }

  // Check repeatable limits
  for (const [slotId, count] of slotCounts) {
    const slot = template.slots.find((s) => s.id === slotId);
    if (slot?.repeatable && slot.maxInstances && count > slot.maxInstances) {
      issues.push({
        slotId,
        type: 'max_exceeded',
        message: `Slot "${slot.label}" has ${count} items but max is ${slot.maxInstances}`,
      });
    }
  }

  // Check required slots
  for (const slot of template.slots) {
    if (slot.required) {
      const hasBinding = bindings.some(
        (b) => b.slotId === slot.id && b.visible
      );
      if (!hasBinding) {
        issues.push({
          slotId: slot.id,
          type: 'required_empty',
          message: `Required slot "${slot.label}" has no bound snippet`,
        });
      }
    }
  }

  return issues;
}

/**
 * Get snippet types that a slot accepts.
 */
export function getAllowedSnippetTypes(slot: SlotDefinition): SnippetType[] {
  return slot.constraints.allowedSnippetTypes;
}

/**
 * Find the best slot for a snippet type in a template.
 * Prefers exact slot type match, then compatible slots.
 */
export function findBestSlot(
  template: TemplateV2,
  snippetType: SnippetType
): SlotDefinition | undefined {
  // First: exact type match
  const exact = template.slots.find(
    (s) => s.type === snippetType && s.constraints.allowedSnippetTypes.includes(snippetType)
  );
  if (exact) return exact;

  // Second: any compatible slot
  return template.slots.find((s) =>
    s.constraints.allowedSnippetTypes.includes(snippetType)
  );
}
