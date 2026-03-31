'use client';

import { create } from 'zustand';
import { SnippetOverrides, SnippetCategory, SnippetDefinition, SectionSnippetDefinition, GalleryItem } from '@/types/snippets';
import { SNIPPET_REGISTRY } from '@/lib/snippets/snippet-registry';
import { SECTION_SNIPPET_REGISTRY } from '@/lib/snippets/section-snippet-registry';
import { isSnippetCompatibleWithLayout } from '@/lib/snippets/layout-compatibility';
import { LayoutType } from '@/lib/templates/template-definition';

interface SnippetStore {
  activeSnippets: SnippetOverrides;
  /** Currently dragging snippet for drag-and-drop */
  draggingSnippet: GalleryItem | null;
  /** Gallery picker state */
  galleryOpen: boolean;
  galleryCategory: SnippetCategory | null;

  setSnippet: (category: SnippetCategory, snippetId: string) => void;
  clearSnippet: (category: SnippetCategory) => void;
  clearAllSnippets: () => void;
  getAvailableSnippets: (category: SnippetCategory, layout?: LayoutType) => SnippetDefinition[];
  getAvailableSectionSnippets: (sectionType?: string, layout?: LayoutType) => SectionSnippetDefinition[];
  getGalleryItems: (galleryCategory?: string, layout?: LayoutType) => GalleryItem[];
  isSnippetCompatible: (snippetId: string, layout: LayoutType) => boolean;
  clearIncompatibleSnippets: (layout: LayoutType) => SnippetCategory[];
  
  // Drag-and-drop actions
  startDragging: (snippet: GalleryItem) => void;
  stopDragging: () => void;
  
  // Gallery actions
  openGallery: (category?: SnippetCategory) => void;
  closeGallery: () => void;
}

export const useSnippetStore = create<SnippetStore>((set, get) => ({
  activeSnippets: {},
  draggingSnippet: null,
  galleryOpen: false,
  galleryCategory: null,

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

  getAvailableSectionSnippets: (sectionType, layout) => {
    const allSectionSnippets = Object.values(SECTION_SNIPPET_REGISTRY).flat();
    let snippets = allSectionSnippets;
    
    if (sectionType) {
      snippets = snippets.filter((s) => s.sectionType === sectionType);
    }
    
    if (layout) {
      snippets = snippets.filter((s) => isSnippetCompatibleWithLayout(s, layout));
    }
    
    return snippets;
  },

  getGalleryItems: (galleryCategory, layout) => {
    const items: GalleryItem[] = [];
    
    // Add style snippets from regular registry
    for (const [category, snippets] of Object.entries(SNIPPET_REGISTRY)) {
      for (const snippet of snippets) {
        if (galleryCategory && snippet.category !== galleryCategory) continue;
        if (layout && !isSnippetCompatibleWithLayout(snippet, layout)) continue;
        
        items.push({
          id: snippet.id,
          name: snippet.name,
          description: snippet.description || '',
          category: snippet.category as SnippetCategory,
          galleryCategory: 'other',
          previewImage: snippet.previewImage,
          isSection: false,
          compatibleLayouts: snippet.compatibleLayouts,
          columnSupport: 'both',
          config: snippet.config,
        });
      }
    }
    
    // Add section snippets from section registry
    for (const [sectionType, snippets] of Object.entries(SECTION_SNIPPET_REGISTRY)) {
      for (const snippet of snippets) {
        if (galleryCategory && snippet.category !== galleryCategory) continue;
        if (layout && !isSnippetCompatibleWithLayout(snippet, layout)) continue;
        
        items.push({
          id: snippet.id,
          name: snippet.name,
          description: snippet.description || '',
          category: snippet.category as SnippetCategory,
          galleryCategory: snippet.galleryCategory,
          previewImage: snippet.previewImage,
          isSection: true,
          sectionType: snippet.sectionType,
          compatibleLayouts: snippet.compatibleLayouts,
          columnSupport: snippet.columnSupport,
          config: snippet.config,
        });
      }
    }
    
    return items;
  },

  isSnippetCompatible: (snippetId, layout) => {
    // Check regular snippets
    for (const snippets of Object.values(SNIPPET_REGISTRY)) {
      const found = snippets.find((s) => s.id === snippetId);
      if (found) return isSnippetCompatibleWithLayout(found, layout);
    }
    
    // Check section snippets
    for (const snippets of Object.values(SECTION_SNIPPET_REGISTRY)) {
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

  // Drag-and-drop actions
  startDragging: (snippet) => set({ draggingSnippet: snippet }),
  stopDragging: () => set({ draggingSnippet: null }),

  // Gallery actions
  openGallery: (category) => set({ galleryOpen: true, galleryCategory: category || null }),
  closeGallery: () => set({ galleryOpen: false, galleryCategory: null }),
}));
