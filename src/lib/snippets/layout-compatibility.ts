import { LayoutType } from '@/lib/templates/template-definition';
import { SnippetDefinition, SnippetOverrides, SnippetCategory } from '@/types/snippets';

/**
 * Check if a snippet is compatible with a given layout type
 */
export function isSnippetCompatibleWithLayout(
  snippet: SnippetDefinition,
  layoutType: LayoutType
): boolean {
  return snippet.compatibleLayouts.includes(layoutType);
}

/**
 * Get all snippet categories where the active snippet is incompatible with the new layout
 */
export function getIncompatibleSnippets(
  snippets: SnippetOverrides,
  layoutType: LayoutType,
  registry: Record<SnippetCategory, SnippetDefinition[]>
): SnippetCategory[] {
  const incompatible: SnippetCategory[] = [];

  for (const [category, snippetId] of Object.entries(snippets)) {
    if (!snippetId) continue;
    const snippetsForCategory = registry[category as SnippetCategory] || [];
    const snippet = snippetsForCategory.find((s) => s.id === snippetId);
    if (snippet && !isSnippetCompatibleWithLayout(snippet, layoutType)) {
      incompatible.push(category as SnippetCategory);
    }
  }

  return incompatible;
}

/**
 * Date format snippets are layout-agnostic — always compatible
 */
export function isLayoutAgnostic(category: SnippetCategory): boolean {
  return category === 'dates' || category === 'sectionTitle';
}
