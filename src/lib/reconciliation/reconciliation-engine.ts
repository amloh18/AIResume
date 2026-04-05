/**
 * Reconciliation Engine
 *
 * Handles the 5 edge cases when switching templates:
 * 1. Slot exists in new template → Map existing snippet
 * 2. Slot missing → Move to orphan pool
 * 3. New slot introduced → Suggest snippet or leave empty
 * 4. Slot type changed → Check compatibility
 * 5. Repeatable slot count changed → Trim or pad
 */

import type { TemplateV2, SlotDefinition } from '@/types/template-v2';
import type { SlotBinding, ReconciliationResult } from '@/types/binding';
import type { SnippetV2, SnippetType } from '@/types/snippet-v2';
import { isSnippetCompatibleWithSlot } from '@/lib/templates/v2/slot-compatibility';

export function reconcile(
  oldTemplate: TemplateV2,
  newTemplate: TemplateV2,
  bindings: SlotBinding[],
  snippets: Map<string, SnippetV2>
): ReconciliationResult {
  const newBindings: SlotBinding[] = [];
  const orphaned: ReconciliationResult['orphaned'] = [];
  const empty: ReconciliationResult['empty'] = [];
  const warnings: string[] = [];

  const newSlotMap = new Map<string, SlotDefinition>();
  for (const slot of newTemplate.slots) {
    newSlotMap.set(slot.id, slot);
  }

  const usedNewSlots = new Set<string>();

  // Process each existing binding
  for (const binding of bindings) {
    if (!binding.visible) continue;

    const snippet = snippets.get(binding.snippetId);
    const newSlot = newSlotMap.get(binding.slotId);

    // Case 1: Same slot ID exists in new template
    if (newSlot) {
      if (snippet && isSnippetCompatibleWithSlot(snippet.type, newSlot)) {
        newBindings.push(binding);
        usedNewSlots.add(binding.slotId);
      } else if (snippet) {
        // Case 4: Type mismatch
        warnings.push(
          `Snippet "${snippet.type}" in slot "${binding.slotId}" may not render correctly in new template`
        );
        newBindings.push(binding);
        usedNewSlots.add(binding.slotId);
      }
      continue;
    }

    // Case 2: Slot doesn't exist in new template — find compatible slot
    if (snippet) {
      const compatibleSlot = newTemplate.slots.find(
        (s) => s.constraints.allowedSnippetTypes.includes(snippet.type)
      );

      if (compatibleSlot) {
        // Remap to compatible slot
        newBindings.push({
          slotId: compatibleSlot.id,
          snippetId: binding.snippetId,
          order: binding.order,
          visible: true,
        });
        usedNewSlots.add(compatibleSlot.id);
        warnings.push(
          `Moved "${snippet.type}" from old slot "${binding.slotId}" to "${compatibleSlot.label}"`
        );
      } else {
        // Truly orphaned
        orphaned.push({
          snippetId: binding.snippetId,
          snippetType: snippet.type,
          reason: `No compatible slot in new template`,
        });
      }
    }
  }

  // Case 3: New slots with no bindings
  for (const slot of newTemplate.slots) {
    if (!usedNewSlots.has(slot.id)) {
      empty.push({
        slotId: slot.id,
        slotDefinition: slot,
        suggestions: [],
      });
    }
  }

  // Case 5: Check repeatable limits
  const slotCounts = new Map<string, number>();
  const toRemove: number[] = [];

  for (let i = 0; i < newBindings.length; i++) {
    const binding = newBindings[i];
    const slot = newSlotMap.get(binding.slotId);
    if (!slot?.repeatable || !slot.maxInstances) continue;

    const count = (slotCounts.get(binding.slotId) || 0) + 1;
    slotCounts.set(binding.slotId, count);

    if (count > slot.maxInstances) {
      toRemove.push(i);
      const snippet = snippets.get(binding.snippetId);
      orphaned.push({
        snippetId: binding.snippetId,
        snippetType: snippet?.type || 'experience',
        reason: `Exceeded max instances (${slot.maxInstances}) for slot "${slot.label}"`,
      });
    }
  }

  // Remove excess bindings (reverse order to maintain indices)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    newBindings.splice(toRemove[i], 1);
  }

  return {
    bindings: newBindings,
    orphaned,
    empty,
    warnings,
  };
}
