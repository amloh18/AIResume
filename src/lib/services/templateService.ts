import { ITemplate, IColumnLayout } from '@/types/template';

export interface ColumnConfig {
  column: 'main' | 'leftColumn' | 'rightColumn';
  width: string;
  sections: string[];
}

export interface SectionPlacement {
  sectionId: string;
  column: 'main' | 'leftColumn' | 'rightColumn';
  order: number;
}

export class TemplateService {
  static async getTemplates(): Promise<ITemplate[]> {
    const response = await fetch('/api/templates');
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    const data = await response.json();
    return data.templates;
  }

  static async getTemplate(templateId: string): Promise<ITemplate> {
    const response = await fetch(`/api/templates/${templateId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    const data = await response.json();
    return data.template;
  }

  static async createTemplate(template: Partial<ITemplate>): Promise<ITemplate> {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    
    const data = await response.json();
    return data.template;
  }

  static async updateTemplate(templateId: string, template: Partial<ITemplate>): Promise<ITemplate> {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update template');
    }
    
    const data = await response.json();
    return data.template;
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Get column configuration for a template
   */
  static getColumnConfig(template: ITemplate): ColumnConfig[] {
    const configs: ColumnConfig[] = [];
    
    if (template.columnLayout?.main) {
      configs.push({
        column: 'main',
        width: template.columnLayout.main.width,
        sections: template.columnLayout.main.sections || [],
      });
    }
    
    if (template.columnLayout?.leftColumn) {
      configs.push({
        column: 'leftColumn',
        width: template.columnLayout.leftColumn.width,
        sections: template.columnLayout.leftColumn.sections || [],
      });
    }
    
    if (template.columnLayout?.rightColumn) {
      configs.push({
        column: 'rightColumn',
        width: template.columnLayout.rightColumn.width,
        sections: template.columnLayout.rightColumn.sections || [],
      });
    }
    
    // If no column layout defined, assume single column
    if (configs.length === 0) {
      configs.push({
        column: 'main',
        width: '100%',
        sections: [],
      });
    }
    
    return configs;
  }

  /**
   * Get sections placed in each column
   */
  static getSectionPlacements(template: ITemplate): SectionPlacement[] {
    const placements: SectionPlacement[] = [];
    const columnConfig = this.getColumnConfig(template);
    
    columnConfig.forEach((config, index) => {
      config.sections.forEach((sectionId, order) => {
        placements.push({
          sectionId,
          column: config.column,
          order,
        });
      });
    });
    
    return placements;
  }

  /**
   * Update column configuration for a template
   */
  static updateColumnConfig(
    template: ITemplate,
    column: 'main' | 'leftColumn' | 'rightColumn',
    updates: Partial<{ width: string; sections: string[] }>
  ): ITemplate {
    const currentLayout = template.columnLayout || {};
    
    const updatedLayout: IColumnLayout = {
      ...currentLayout,
      [column]: {
        ...(currentLayout[column] || { width: '100%', sections: [] }),
        ...updates,
      },
    };
    
    return {
      ...template,
      columnLayout: updatedLayout,
    };
  }

  /**
   * Add a section to a specific column
   */
  static addSectionToColumn(
    template: ITemplate,
    sectionId: string,
    column: 'main' | 'leftColumn' | 'rightColumn'
  ): ITemplate {
    const currentLayout = template.columnLayout || {};
    const columnConfig = currentLayout[column] || { width: '100%', sections: [] };
    
    // Don't add if already exists
    if (columnConfig.sections.includes(sectionId)) {
      return template;
    }
    
    return this.updateColumnConfig(template, column, {
      sections: [...columnConfig.sections, sectionId],
    });
  }

  /**
   * Remove a section from a specific column
   */
  static removeSectionFromColumn(
    template: ITemplate,
    sectionId: string,
    column: 'main' | 'leftColumn' | 'rightColumn'
  ): ITemplate {
    const currentLayout = template.columnLayout || {};
    const columnConfig = currentLayout[column];
    
    if (!columnConfig || !columnConfig.sections.includes(sectionId)) {
      return template;
    }
    
    return this.updateColumnConfig(template, column, {
      sections: columnConfig.sections.filter(id => id !== sectionId),
    });
  }

  /**
   * Move a section between columns
   */
  static moveSectionToColumn(
    template: ITemplate,
    sectionId: string,
    fromColumn: 'main' | 'leftColumn' | 'rightColumn',
    toColumn: 'main' | 'leftColumn' | 'rightColumn'
  ): ITemplate {
    let updated = this.removeSectionFromColumn(template, sectionId, fromColumn);
    updated = this.addSectionToColumn(updated, sectionId, toColumn);
    return updated;
  }

  /**
   * Check if a section can be added to a column (respects max sections)
   */
  static canAddSectionToColumn(
    template: ITemplate,
    sectionId: string,
    column: 'main' | 'leftColumn' | 'rightColumn'
  ): boolean {
    const columnConfig = this.getColumnConfig(template).find(c => c.column === column);
    
    if (!columnConfig) {
      return true; // Column doesn't exist, can add
    }
    
    // Check if section already exists
    if (columnConfig.sections.includes(sectionId)) {
      return false;
    }
    
    // Check max sections limit (if defined)
    const maxSections = column === 'main' ? 10 : 5;
    return columnConfig.sections.length < maxSections;
  }

  /**
   * Get default column for a section type based on template layout
   */
  static getDefaultColumnForSection(
    template: ITemplate,
    sectionType: string
  ): 'main' | 'leftColumn' | 'rightColumn' {
    const layoutType = template.layoutType || 'one-column';
    
    // For single column layouts, always use main
    if (layoutType === 'one-column') {
      return 'main';
    }
    
    // For two-column layouts, place experience/work in main, skills in sidebar
    const mainSections = ['work', 'experience', 'projects', 'education'];
    const sidebarSections = ['skills', 'languages', 'certificates', 'awards'];
    
    if (mainSections.includes(sectionType)) {
      return 'main';
    }
    
    if (sidebarSections.includes(sectionType)) {
      return layoutType === 'two-column' ? 'rightColumn' : 'leftColumn';
    }
    
    return 'main';
  }

  /**
   * Validate snippet-column compatibility
   */
  static validateSnippetPlacement(
    template: ITemplate,
    sectionType: string,
    snippetColumnSupport: 'single' | 'double' | 'both'
  ): { valid: boolean; message?: string } {
    const layoutType = template.layoutType || 'one-column';
    
    // Single column snippets can go anywhere
    if (snippetColumnSupport === 'both') {
      return { valid: true };
    }
    
    // Single column snippet in single column layout
    if (snippetColumnSupport === 'single' && layoutType === 'one-column') {
      return { valid: true };
    }
    
    // Single column snippet in two column layout (allowed, goes in main)
    if (snippetColumnSupport === 'single' && layoutType !== 'one-column') {
      return { valid: true };
    }
    
    // Double column snippet in single column layout
    if (snippetColumnSupport === 'double' && layoutType === 'one-column') {
      return {
        valid: false,
        message: 'This snippet requires a two-column layout',
      };
    }
    
    // Double column snippet in two column layout
    if (snippetColumnSupport === 'double' && layoutType !== 'one-column') {
      return { valid: true };
    }
    
    return { valid: true };
  }

  /**
   * Create runtime column configuration for mixed layouts
   * This allows adding single-column snippets to two-column templates
   */
  static createMixedColumnConfig(
    template: ITemplate,
    sectionPlacements: Array<{ sectionId: string; column: 'main' | 'sidebar' }>
  ): IColumnLayout {
    const layoutType = template.layoutType || 'one-column';
    
    // For single column, all sections go in main
    if (layoutType === 'one-column') {
      return {
        main: {
          width: '100%',
          sections: sectionPlacements.map(p => p.sectionId),
        },
      };
    }
    
    // For two-column, split sections
    const mainSections = sectionPlacements
      .filter(p => p.column === 'main')
      .map(p => p.sectionId);
    const sidebarSections = sectionPlacements
      .filter(p => p.column === 'sidebar')
      .map(p => p.sectionId);
    
    return {
      main: {
        width: '70%',
        sections: mainSections,
      },
      rightColumn: {
        width: '30%',
        sections: sidebarSections,
      },
    };
  }
} 