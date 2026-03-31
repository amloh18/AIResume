'use client';

import { create } from 'zustand';
import { SnippetOverrides, SnippetCategory, SnippetDefinition } from '@/types/snippets';
import { SNIPPET_REGISTRY } from '@/lib/snippets/snippet-registry';
import { isSnippetCompatibleWithLayout } from '@/lib/snippets/layout-compatibility';
import { LayoutType } from '@/lib/templates/template-definition';

interface SnippetStore {
  activeSnippets: SnippetOverrides;

  setSnippet: (category: SnippetCategory, snippetId: string) => void;
  clearSnippet: (category: SnippetCategory) => void;
  clearAllSnippets: () => void;
  getAvailableSnippets: (category: SnippetCategory, layout?: LayoutType) => SnippetDefinition[];
  isSnippetCompatible: (snippetId: string, layout: LayoutType) => boolean;
  clearIncompatibleSnippets: (layout: LayoutType) => SnippetCategory[];
}

export const useSnippetStore = create<SnippetStore>((set, get) => ({
  activeSnippets: {},

  setSnippet: (category, snippetId) =>
    set((state) => ({
      activeSnippets: { ...state.activeSnippets, [category]: snippetId },
    })),

  clearSnippet: (category) =>
    set((state) => {
      const next = { ...state.activeSnippets };
      delete next[category];
      return { activeSnippets: next };
    }),

  clearAllSnippets: () => set({ activeSnippets: {} }),

  getAvailableSnippets: (category, layout) => {
    const snippets = SNIPPET_REGISTRY[category] || [];
    if (!layout) return snippets;
    return snippets.filter((s) => isSnippetCompatibleWithLayout(s, layout));
  },

  isSnippetCompatible: (snippetId, layout) => {
    for (const snippets of Object.values(SNIPPET_REGISTRY)) {
      const found = snippets.find((s) => s.id === snippetId);
      if (found) return isSnippetCompatibleWithLayout(found, layout);
    }
    return false;
  },

  clearIncompatibleSnippets: (layout) => {
    const state = get();
    const cleared: SnippetCategory[] = [];
    const next = { ...state.activeSnippets };

    for (const [category, snippetId] of Object.entries(next)) {
      if (snippetId && !get().isSnippetCompatible(snippetId, layout)) {
        delete next[category as SnippetCategory];
        cleared.push(category as SnippetCategory);
      }
    }

    if (cleared.length > 0) {
      set({ activeSnippets: next });
    }
    return cleared;
  },
}));
