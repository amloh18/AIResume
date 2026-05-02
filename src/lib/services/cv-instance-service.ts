// @ts-nocheck
/**
 * CV Instance Service — Manages CVInstance + SlotBinding lifecycle
 */

import { v4 as uuidv4 } from 'uuid';
import type { CVInstance, SlotBinding } from '@/types/binding';
import type { SnippetV2 } from '@/types/snippet-v2';
import type { TemplateV2 } from '@/types/template-v2';
import { SnippetService } from './snippet-service';
import { getTemplateV2 } from '@/lib/templates/v2/template-registry';

// In-memory store (will be replaced with MongoDB)
const instanceStore = new Map<string, CVInstance>();

export class CVInstanceService {
  static createCVInstance(
    userId: string,
    title: string,
    templateId: string,
    cvType: 'master' | 'journey' | 'standalone' = 'standalone'
  ): CVInstance {
    const now = new Date();
    const instance: CVInstance = {
      id: uuidv4(),
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
        lastModified: now,
        tags: [],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
        starred: false,
        cvType,
      },
      createdAt: now,
      updatedAt: now,
    };
    instanceStore.set(instance.id, instance);
    return instance;
  }

  static getCVInstance(id: string): CVInstance | undefined {
    return instanceStore.get(id);
  }

  static getUserInstances(userId: string): CVInstance[] {
    const results: CVInstance[] = [];
    for (const instance of instanceStore.values()) {
      if (instance.userId === userId) results.push(instance);
    }
    return results;
  }

  /**
   * Bind a snippet to a template slot.
   */
  static bindSnippet(
    instanceId: string,
    slotId: string,
    snippetId: string,
    order?: number
  ): CVInstance | undefined {
    const instance = instanceStore.get(instanceId);
    if (!instance) return undefined;

    const template = getTemplateV2(instance.templateId);
    const slot = template?.slots.find((s) => s.id === slotId);
    if (!slot) return undefined;

    // Calculate order for repeatable slots
    let bindingOrder = order ?? 0;
    if (slot.repeatable && order === undefined) {
      const existing = instance.slotBindings.filter((b) => b.slotId === slotId);
      bindingOrder = existing.length;
    }

    // Check max instances
    if (slot.repeatable && slot.maxInstances) {
      const count = instance.slotBindings.filter((b) => b.slotId === slotId && b.visible).length;
      if (count >= slot.maxInstances) return instance;
    }

    instance.slotBindings.push({
      slotId,
      snippetId,
      order: bindingOrder,
      visible: true,
    });
    instance.updatedAt = new Date();
    instance.metadata.lastModified = new Date();

    instanceStore.set(instanceId, instance);
    return instance;
  }

  /**
   * Unbind a snippet from a slot (hide it, don't delete).
   */
  static unbindSnippet(instanceId: string, slotId: string, snippetId: string): CVInstance | undefined {
    const instance = instanceStore.get(instanceId);
    if (!instance) return undefined;

    const binding = instance.slotBindings.find(
      (b) => b.slotId === slotId && b.snippetId === snippetId
    );
    if (binding) {
      binding.visible = false;
      instance.updatedAt = new Date();
      instance.metadata.lastModified = new Date();
    }

    instanceStore.set(instanceId, instance);
    return instance;
  }

  /**
   * Reorder bindings within a repeatable slot.
   */
  static reorderBindings(
    instanceId: string,
    slotId: string,
    snippetIds: string[]
  ): CVInstance | undefined {
    const instance = instanceStore.get(instanceId);
    if (!instance) return undefined;

    snippetIds.forEach((snippetId, index) => {
      const binding = instance.slotBindings.find(
        (b) => b.slotId === slotId && b.snippetId === snippetId
      );
      if (binding) binding.order = index;
    });

    instance.updatedAt = new Date();
    instanceStore.set(instanceId, instance);
    return instance;
  }

  /**
   * Delete a CV instance and optionally its snippets.
   */
  static deleteCVInstance(instanceId: string, deleteSnippets: boolean = false): boolean {
    const instance = instanceStore.get(instanceId);
    if (!instance) return false;

    if (deleteSnippets) {
      for (const binding of instance.slotBindings) {
        SnippetService.deleteSnippet(binding.snippetId);
      }
    }

    return instanceStore.delete(instanceId);
  }

  /**
   * Duplicate a CV instance with all snippets cloned.
   */
  static duplicateCVInstance(instanceId: string, newTitle: string): CVInstance | undefined {
    const original = instanceStore.get(instanceId);
    if (!original) return undefined;

    const now = new Date();
    const newInstance: CVInstance = {
      ...original,
      id: uuidv4(),
      title: newTitle,
      status: 'draft',
      version: 1,
      slotBindings: [],
      metadata: {
        ...original.metadata,
        isMaster: false,
        lastModified: now,
        createdFrom: original.id,
        starred: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Clone all snippets and create new bindings
    for (const binding of original.slotBindings) {
      const clone = SnippetService.cloneSnippet(binding.snippetId, original.userId);
      if (clone) {
        newInstance.slotBindings.push({
          ...binding,
          snippetId: clone.id,
        });
      }
    }

    instanceStore.set(newInstance.id, newInstance);
    return newInstance;
  }

  /**
   * Update style overrides for a CV instance.
   */
  static updateStyleOverrides(
    instanceId: string,
    overrides: Record<string, any>
  ): CVInstance | undefined {
    const instance = instanceStore.get(instanceId);
    if (!instance) return undefined;

    instance.styleOverrides = { ...instance.styleOverrides, ...overrides };
    instance.updatedAt = new Date();
    instance.metadata.lastModified = new Date();

    instanceStore.set(instanceId, instance);
    return instance;
  }

  /**
   * Get CV instance with all snippets loaded.
   */
  static async getCVWithSnippets(
    instanceId: string
  ): Promise<{ instance: CVInstance; snippets: Map<string, SnippetV2> } | undefined> {
    const instance = instanceStore.get(instanceId);
    if (!instance) return undefined;

    const snippets = new Map<string, SnippetV2>();
    for (const binding of instance.slotBindings) {
      const snippet = SnippetService.getSnippet(binding.snippetId);
      if (snippet) snippets.set(binding.snippetId, snippet);
    }

    return { instance, snippets };
  }
}
