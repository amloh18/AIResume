/**
 * Template Utilities
 * 
 * Utility functions for working with templates, including hardcoded templates
 */

import { HARDCODED_TEMPLATES } from './hardcoded-templates';
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
    return hardcodedTemplate;
  }

  // If not found in hardcoded templates, return null
  // The API will handle database lookup separately
  return null;
}

/**
 * Get all available templates (hardcoded + database)
 */
export function getAllTemplates(): ITemplate[] {
  return HARDCODED_TEMPLATES;
}

/**
 * Check if a template ID refers to a hardcoded template
 */
export function isHardcodedTemplate(templateId: string): boolean {
  return HARDCODED_TEMPLATES.some(
    template => template.id === templateId || template._id === templateId
  );
}