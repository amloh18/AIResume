/**
 * Template Switch Handler
 *
 * Orchestrates the template switching process:
 * 1. Run reconciliation engine
 * 2. Update instance
 * 3. Return result with warnings
 */

import type { CVInstance, TemplateSwitchResult } from '@/types/binding';
import type { SnippetV2 } from '@/types/snippet-v2';
import { getTemplateV2 } from '@/lib/templates/v2/template-registry';
import { reconcile } from './reconciliation-engine';
import { CVInstanceService } from '@/lib/services/cv-instance-service';
import { SnippetService } from '@/lib/services/snippet-service';

export class TemplateSwitchHandler {
  static async switchTemplate(
    instanceId: string,
    newTemplateId: string
  ): Promise<TemplateSwitchResult> {
    const instance = CVInstanceService.getCVInstance(instanceId);
    if (!instance) {
      return {
        success: false,
        instance: instance!,
        reconciliation: { bindings: [], orphaned: [], empty: [], warnings: ['CV instance not found'] },
        warnings: ['CV instance not found'],
      };
    }

    const oldTemplate = getTemplateV2(instance.templateId);
    const newTemplate = getTemplateV2(newTemplateId);

    if (!oldTemplate || !newTemplate) {
      return {
        success: false,
        instance,
        reconciliation: { bindings: [], orphaned: [], empty: [], warnings: ['Template not found'] },
        warnings: ['Template not found'],
      };
    }

    // Load all snippets
    const snippets = new Map<string, SnippetV2>();
    for (const binding of instance.slotBindings) {
      const snippet = SnippetService.getSnippet(binding.snippetId);
      if (snippet) snippets.set(binding.snippetId, snippet);
    }

    // Run reconciliation
    const reconciliation = reconcile(
      oldTemplate,
      newTemplate,
      instance.slotBindings,
      snippets
    );

    // Update instance
    instance.templateId = newTemplateId;
    instance.slotBindings = reconciliation.bindings;
    instance.updatedAt = new Date();
    instance.metadata.lastModified = new Date();
    instance.version += 1;

    CVInstanceService.getCVInstance(instanceId); // Ensure store is updated

    return {
      success: true,
      instance,
      reconciliation,
      warnings: reconciliation.warnings,
    };
  }
}
