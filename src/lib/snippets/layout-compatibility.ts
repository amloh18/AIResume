import { LayoutType } from '@/lib/templates/template-definition';
import { SnippetDefinition, SnippetOverrides, SnippetCategory } from '@/types/snippets';

/**
 * Check if a snippet is compatible with a given layout type
 */
export function isSnippetCompatibleWithLayout(
  snippet: SnippetDefinition,
  layoutType: LayoutType
): boolean {
  // If snippet has column support defined, check it
  if (snippet.columnSupport) {
    const layoutColumnMap: Record<LayoutType, 'single' | 'double'> = {
      'single-column': 'single',
      'two-column': 'double',
      'sidebar-left': 'double',
      'sidebar-right': 'double',
    };
    
    const layoutColumn = layoutColumnMap[layoutType];
    
    // Snippet supports both layouts
    if (snippet.columnSupport === 'both') return true;
    
    // Snippet supports single column and layout is single
    if (snippet.columnSupport === 'single' && layoutColumn === 'single') return true;
    
    // Snippet supports double column and layout is double
    if (snippet.columnSupport === 'double' && layoutColumn === 'double') return true;
    
    return false;
  }
  
  // Fallback to compatible layouts check
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

/**
 * Check if a snippet can be added to a template with mixed column support
 * For example, adding a single-column snippet to a two-column template
 */
export function canAddSnippetToMixedLayout(
  snippet: SnippetDefinition,
  targetLayout: LayoutType,
  existingSections: Array<{ type: string; column: 'main' | 'sidebar' }>
): boolean {
  // If snippet supports both layouts, it can always be added
  if (snippet.columnSupport === 'both') return true;
  
  // If snippet is single-column only
  if (snippet.columnSupport === 'single') {
    // Can be added to single-column templates
    if (targetLayout === 'single-column') return true;
    
    // Can be added to two-column templates (will be placed in main column)
    if (targetLayout === 'two-column' || targetLayout === 'sidebar-left' || targetLayout === 'sidebar-right') {
      return true;
    }
  }
  
  // If snippet is double-column only
  if (snippet.columnSupport === 'double') {
    // Cannot be added to single-column templates
    if (targetLayout === 'single-column') return false;
    
    // Can be added to two-column templates
    return true;
  }
  
  // Fallback to compatible layouts check
  return snippet.compatibleLayouts.includes(targetLayout);
}

/**
 * Determine which column a snippet should be placed in for mixed layouts
 */
export function getSnippetColumn(
  snippet: SnippetDefinition,
  templateLayout: LayoutType
): 'main' | 'sidebar' {
  // Single-column snippets always go in main column for two-column layouts
  if (snippet.columnSupport === 'single') {
    return 'main';
  }
  
  // Double-column snippets go in appropriate column based on template
  if (snippet.columnSupport === 'double') {
    if (templateLayout === 'sidebar-left') {
      return 'sidebar';
    }
    return 'main';
  }
  
  // Default to main column
  return 'main';
}
