/**
 * Binding Validator
 *
 * Validates binding integrity between CVInstance and TemplateV2.
 */

import type { TemplateV2, SlotDefinition } from '@/types/template-v2';
import type { CVInstance, SlotBinding, BindingValidationWarning } from '@/types/binding';
import type { SnippetV2 } from '@/types/snippet-v2';
import { isSnippetCompatibleWithSlot } from '@/lib/templates/v2/slot-compatibility';

export class BindingValidator {
  static validate(
    instance: CVInstance,
    template: TemplateV2,
    snippets: Map<string, SnippetV2>
  ): BindingValidationWarning[] {
    const warnings: BindingValidationWarning[] = [];
    const slotCounts = new Map<string, number>();

    for (const binding of instance.slotBindings) {
      if (!binding.visible) continue;

      const slot = template.slots.find((s) => s.id === binding.slotId);
      const snippet = snippets.get(binding.snippetId);

      // Orphaned binding — slot doesn't exist in template
      if (!slot) {
        warnings.push({
          slotId: binding.slotId,
          snippetId: binding.snippetId,
          type: 'orphaned',
          message: `Slot "${binding.slotId}" does not exist in template "${template.name}"`,
        });
        continue;
      }

      // Missing snippet
      if (!snippet) {
        warnings.push({
          slotId: binding.slotId,
          snippetId: binding.snippetId,
          type: 'required_empty',
          message: `Snippet "${binding.snippetId}" not found`,
        });
        continue;
      }

      // Type mismatch
      if (!isSnippetCompatibleWithSlot(snippet.type, slot)) {
        warnings.push({
          slotId: binding.slotId,
          snippetId: binding.snippetId,
          type: 'type_mismatch',
          message: `Snippet type "${snippet.type}" not allowed in slot "${slot.label}"`,
        });
      }

      // Count for repeatable check
      slotCounts.set(binding.slotId, (slotCounts.get(binding.slotId) || 0) + 1);
    }

    // Check repeatable limits
    for (const [slotId, count] of slotCounts) {
      const slot = template.slots.find((s) => s.id === slotId);
      if (slot?.repeatable && slot.maxInstances && count > slot.maxInstances) {
        warnings.push({
          slotId,
          type: 'max_exceeded',
          message: `Slot "${slot.label}" has ${count} items but max is ${slot.maxInstances}`,
        });
      }
    }

    // Check required slots
    for (const slot of template.slots) {
      if (slot.required) {
        const hasBinding = instance.slotBindings.some(
          (b) => b.slotId === slot.id && b.visible
        );
        if (!hasBinding) {
          warnings.push({
            slotId: slot.id,
            type: 'required_empty',
            message: `Required slot "${slot.label}" has no bound snippet`,
          });
        }
      }
    }

    return warnings;
  }
}
