/**
 * Template Utilities
 * 
 * Utility functions for working with templates, including hardcoded templates
 */

import { HARDCODED_TEMPLATES, resolveTemplateThumbnail } from './hardcoded-templates';
import { ITemplate } from '@/types/template';

/**
 * Get template data by ID, checking both hardcoded templates and database
 */
export function getTemplateById(templateId: string): ITemplate | null {
  if (!templateId) {
    return null;
  }

  // First check hardcoded templates
  const hardcodedTemplate = HARDCODED_TEMPLATES.find(
    template => template.id === templateId || template._id === templateId
  );

  if (hardcodedTemplate) {
    // Resolve thumbnail URL at runtime to ensure S3 URLs are properly set
    return resolveTemplateThumbnail(hardcodedTemplate);
  }

  // If not found in hardcoded templates, return null
  // The API will handle database lookup separately
  return null;
}

/**
 * Get all available templates (hardcoded + database)
 * Templates are returned with resolved thumbnail URLs
 */
export function getAllTemplates(): ITemplate[] {
  return HARDCODED_TEMPLATES.map(template => resolveTemplateThumbnail(template));
}

/**
 * Check if a template ID refers to a hardcoded template
 */
export function isHardcodedTemplate(templateId: string): boolean {
  return HARDCODED_TEMPLATES.some(
    template => template.id === templateId || template._id === templateId
  );
}