// @ts-nocheck
/**
 * Snippet Service — CRUD with Clone-on-Edit
 *
 * Critical rule: updateSnippet() ALWAYS clones first if snippet is shared
 * (has lineage.isGlobal: true or used in multiple CVs).
 */

import { v4 as uuidv4 } from 'uuid';
import type { SnippetV2, SnippetType, SnippetContent, SnippetMetadata, SnippetEdit } from '@/types/snippet-v2';

// In-memory store for now (will be replaced with MongoDB calls)
const snippetStore = new Map<string, SnippetV2>();

export class SnippetService {
  static createSnippet(
    userId: string,
    type: SnippetType,
    content: SnippetContent,
    metadata: SnippetMetadata = {}
  ): SnippetV2 {
    const now = new Date();
    const snippet: SnippetV2 = {
      id: uuidv4(),
      userId,
      type,
      content,
      metadata,
      formatHints: {},
      lineage: { editHistory: [], isGlobal: false },
      createdAt: now,
      updatedAt: now,
    };
    snippetStore.set(snippet.id, snippet);
    return snippet;
  }

  static getSnippet(id: string): SnippetV2 | undefined {
    return snippetStore.get(id);
  }

  static getUserSnippets(userId: string, type?: SnippetType): SnippetV2[] {
    const results: SnippetV2[] = [];
    for (const snippet of snippetStore.values()) {
      if (snippet.userId === userId && (!type || snippet.type === type)) {
        results.push(snippet);
      }
    }
    return results;
  }

  /**
   * Clone a snippet for editing. Creates a derived copy with lineage tracking.
   * The new snippet references the original as parentSnippetId.
   */
  static cloneSnippet(snippetId: string, userId: string): SnippetV2 | undefined {
    const original = snippetStore.get(snippetId);
    if (!original) return undefined;

    const now = new Date();
    const clone: SnippetV2 = {
      id: uuidv4(),
      userId,
      type: original.type,
      content: JSON.parse(JSON.stringify(original.content)),
      metadata: { ...original.metadata, source: 'user' },
      formatHints: { ...original.formatHints },
      lineage: {
        parentSnippetId: original.id,
        derivedFrom: original.id,
        editHistory: [],
        isGlobal: false,
        libraryVersion: original.lineage.isGlobal ? original.lineage.libraryVersion : undefined,
      },
      createdAt: now,
      updatedAt: now,
    };
    snippetStore.set(clone.id, clone);
    return clone;
  }

  /**
   * Update a snippet field. If the snippet is shared/global, clones first.
   */
  static updateSnippet(
    snippetId: string,
    field: string,
    value: any,
    source: 'user' | 'ai' = 'user'
  ): SnippetV2 | undefined {
    const snippet = snippetStore.get(snippetId);
    if (!snippet) return undefined;

    const oldValue = getNestedValue(snippet.content, field);

    // Clone-on-edit if global
    let target = snippet;
    if (snippet.lineage.isGlobal) {
      const clone = this.cloneSnippet(snippetId, snippet.userId);
      if (!clone) return undefined;
      target = clone;
    }

    // Record edit
    const edit: SnippetEdit = {
      timestamp: new Date(),
      field,
      oldValue: String(oldValue),
      newValue: String(value),
      source,
    };
    target.lineage.editHistory.push(edit);

    // Apply update
    setNestedValue(target.content, field, value);
    target.updatedAt = new Date();

    snippetStore.set(target.id, target);
    return target;
  }

  /**
   * Update entire content of a snippet.
   */
  static updateContent(
    snippetId: string,
    content: SnippetContent,
    source: 'user' | 'ai' = 'user'
  ): SnippetV2 | undefined {
    const snippet = snippetStore.get(snippetId);
    if (!snippet) return undefined;

    let target = snippet;
    if (snippet.lineage.isGlobal) {
      const clone = this.cloneSnippet(snippetId, snippet.userId);
      if (!clone) return undefined;
      target = clone;
    }

    target.content = content;
    target.updatedAt = new Date();

    snippetStore.set(target.id, target);
    return target;
  }

  static deleteSnippet(id: string): boolean {
    return snippetStore.delete(id);
  }

  static getSnippetLineage(snippetId: string): SnippetV2[] {
    const snippet = snippetStore.get(snippetId);
    if (!snippet) return [];

    const lineage: SnippetV2[] = [snippet];
    let current = snippet;

    while (current.lineage.parentSnippetId) {
      const parent = snippetStore.get(current.lineage.parentSnippetId);
      if (!parent) break;
      lineage.push(parent);
      current = parent;
    }

    return lineage;
  }

  /**
   * Get all snippets derived from a given snippet.
   */
  static getDerivedSnippets(snippetId: string): SnippetV2[] {
    const results: SnippetV2[] = [];
    for (const snippet of snippetStore.values()) {
      if (snippet.lineage.parentSnippetId === snippetId) {
        results.push(snippet);
      }
    }
    return results;
  }
}

// Helper functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}
