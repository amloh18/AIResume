/**
 * Template Utilities
 * 
 * Utility functions for working with templates, including hardcoded templates
 */

import { ALL_TEMPLATE_V2 } from './v2/template-definitions';
import { CANVAS_TEMPLATES } from '@/components/cv-builder-pro/registry';
import { ITemplate } from '@/types/template';

// Map TemplateV2 to ITemplate for legacy support
function mapV2ToITemplate(v2: any): ITemplate {
  return {
    id: v2.id,
    _id: v2.id,
    name: v2.name,
    description: v2.description,
    thumbnail: v2.thumbnail,
    category: v2.category === 'professional' || v2.category === 'creative' || v2.category === 'minimal' || v2.category === 'academic' ? 'cv' : 'custom',
    categories: [v2.category],
    tier: v2.tier,
    layoutType: v2.layout.type === 'single-column' ? 'one-column' : v2.layout.type === 'sidebar-left' || v2.layout.type === 'sidebar-right' ? 'two-column' : 'custom',
    globalStyles: {
      fontFamily: v2.stylePreset.typography.bodyText?.fontFamily || 'Inter, sans-serif',
      primaryColor: v2.stylePreset.colors.primary,
      secondaryColor: v2.stylePreset.colors.secondary,
      backgroundColor: v2.stylePreset.colors.background,
      fontSize: v2.stylePreset.typography.bodyText?.fontSize || '10pt',
      lineHeight: v2.stylePreset.typography.bodyText?.lineHeight || '1.5',
      spacing: v2.stylePreset.spacing.sectionGap,
      borderRadius: '4px',
      boxShadow: 'none',
      customCSS: ''
    },
    availableSections: [],
    isActive: true,
    isDefault: v2.id === 'professional-extended-v2',
    isPublished: true,
    globalAccess: true,
    version: 2
  };
}

// Map CanvasTemplate to ITemplate for backward compatibility
function mapCanvasTemplateToITemplate(canvasTemplate: any): ITemplate {
  return {
    id: canvasTemplate.id,
    _id: canvasTemplate.id,
    name: canvasTemplate.name,
    description: `A ${canvasTemplate.type} layout template`,
    thumbnail: '', 
    category: 'cv',
    categories: ['cv'],
    tier: 'free',
    layoutType: canvasTemplate.type === '1-col' ? 'one-column' : 'two-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '10pt',
      lineHeight: '1.5',
      spacing: 16,
      borderRadius: '4px',
      boxShadow: 'none',
      customCSS: ''
    },
    availableSections: [],
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 3
  };
}

/**
 * Get template data by ID, checking both hardcoded templates and database
 */
export function getTemplateById(templateId: string): ITemplate | null {
  if (!templateId) {
    return null;
  }

  const v2Template = ALL_TEMPLATE_V2.find(t => t.id === templateId);
  if (v2Template) {
    return mapV2ToITemplate(v2Template);
  }

  const canvasTemplate = CANVAS_TEMPLATES.find(t => t.id === templateId);
  if (canvasTemplate) {
    return mapCanvasTemplateToITemplate(canvasTemplate);
  }

  return null;
}

/**
 * Get all available templates (hardcoded + database)
 * Templates are returned with resolved thumbnail URLs
 */
export function getAllTemplates(): ITemplate[] {
  const v2Templates = ALL_TEMPLATE_V2.map(mapV2ToITemplate);
  const canvasTemplates = CANVAS_TEMPLATES.map(mapCanvasTemplateToITemplate);
  return [...v2Templates, ...canvasTemplates];
}

/**
 * Check if a template ID refers to a hardcoded template
 */
export function isHardcodedTemplate(templateId: string): boolean {
  return ALL_TEMPLATE_V2.some(t => t.id === templateId) || CANVAS_TEMPLATES.some(t => t.id === templateId);
}