/**
 * Template Resolution Service
 * 
 * Provides unified template resolution with clear priority order and logging.
 * Consolidates template lookup logic that was previously scattered across multiple files.
 */

import { ITemplate } from '@/types/template';
import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';
import Template from '@/models/Template';
import mongoose from 'mongoose';
import { logger } from '@/lib/structured-logger';

export interface TemplateResolutionResult {
  template: ITemplate | null;
  source: 'cv-embedded' | 'hardcoded-customRenderer' | 'hardcoded-id' | 'database' | 'default';
  templateId: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface CVWithTemplate {
  templateId?: string | mongoose.Types.ObjectId;
  template?: Partial<ITemplate> & {
    customRenderer?: string;
    name?: string;
  };
}

/**
 * Template Resolution Service
 * 
 * Priority order for template resolution:
 * 1. CV-embedded template with customRenderer -> find matching hardcoded template
 * 2. Hardcoded template by ID
 * 3. Database template by ID
 * 4. Default template (fallback)
 */
export class TemplateResolutionService {
  private static instance: TemplateResolutionService;

  private constructor() {}

  static getInstance(): TemplateResolutionService {
    if (!TemplateResolutionService.instance) {
      TemplateResolutionService.instance = new TemplateResolutionService();
    }
    return TemplateResolutionService.instance;
  }

  /**
   * Resolve template from CV data with full priority chain
   */
  async resolveTemplate(cvWithTemplate: CVWithTemplate): Promise<TemplateResolutionResult> {
    const templateIdStr = cvWithTemplate.templateId?.toString() || '';
    
    logger.info('TemplateResolution: Starting resolution', {
      templateId: templateIdStr,
      hasEmbeddedTemplate: !!cvWithTemplate.template,
      customRenderer: cvWithTemplate.template?.customRenderer
    });

    // Priority 1: CV-embedded template with customRenderer
    if (cvWithTemplate.template?.customRenderer) {
      const result = this.findHardcodedByCustomRenderer(
        cvWithTemplate.template.customRenderer,
        cvWithTemplate.template.name,
        templateIdStr
      );
      
      if (result) {
        logger.info('TemplateResolution: Found by customRenderer', {
          templateName: result.name,
          customRenderer: result.customRenderer
        });
        return {
          template: result,
          source: 'hardcoded-customRenderer',
          templateId: templateIdStr,
          confidence: 'high'
        };
      }
    }

    // Priority 2: Hardcoded template by ID
    const hardcodedById = this.findHardcodedById(templateIdStr);
    if (hardcodedById) {
      logger.info('TemplateResolution: Found hardcoded by ID', {
        templateName: hardcodedById.name,
        templateId: templateIdStr
      });
      return {
        template: hardcodedById,
        source: 'hardcoded-id',
        templateId: templateIdStr,
        confidence: 'high'
      };
    }

    // Priority 3: Database template
    if (templateIdStr && mongoose.Types.ObjectId.isValid(templateIdStr)) {
      try {
        const dbTemplate = await Template.findById(templateIdStr);
        if (dbTemplate) {
          logger.info('TemplateResolution: Found in database', {
            templateName: dbTemplate.name,
            templateId: templateIdStr
          });
          return {
            template: dbTemplate.toObject() as ITemplate,
            source: 'database',
            templateId: templateIdStr,
            confidence: 'high'
          };
        }
      } catch (error) {
        logger.warn('TemplateResolution: Database lookup failed', {
          templateId: templateIdStr,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Priority 4: Default template fallback
    const defaultTemplate = this.getDefaultTemplate();
    logger.info('TemplateResolution: Using default template', {
      templateName: defaultTemplate.name
    });
    
    return {
      template: defaultTemplate,
      source: 'default',
      templateId: templateIdStr || 'default',
      confidence: 'low'
    };
  }

  /**
   * Find hardcoded template by customRenderer, name, or ID
   */
  private findHardcodedByCustomRenderer(
    customRenderer: string,
    name?: string,
    id?: string
  ): ITemplate | null {
    return HARDCODED_TEMPLATES.find(t => 
      t.customRenderer === customRenderer ||
      (name && t.name === name) ||
      (id && (t.id === id || t._id === id))
    ) || null;
  }

  /**
   * Find hardcoded template by ID
   */
  private findHardcodedById(id: string): ITemplate | null {
    if (!id) return null;
    return HARDCODED_TEMPLATES.find(t => 
      t.id === id || t._id === id
    ) || null;
  }

  /**
   * Get default template for fallback
   */
  private getDefaultTemplate(): ITemplate {
    // Return first hardcoded template or create a minimal default
    return HARDCODED_TEMPLATES[0] || {
      id: 'default',
      _id: 'default',
      name: 'Default Template',
      globalStyles: {
        primaryColor: '#059669',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11pt',
        lineHeight: '1.5'
      },
      sections: []
    };
  }

  /**
   * Validate that a template has all required properties
   */
  validateTemplate(template: ITemplate | null): { valid: boolean; missing: string[] } {
    if (!template) {
      return { valid: false, missing: ['template'] };
    }

    const missing: string[] = [];
    
    if (!template.name) missing.push('name');
    if (!template.globalStyles) missing.push('globalStyles');
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get template summary for logging
   */
  getTemplateSummary(template: ITemplate | null): Record<string, unknown> {
    if (!template) {
      return { exists: false };
    }

    return {
      exists: true,
      id: template.id || template._id,
      name: template.name,
      customRenderer: (template as any).customRenderer,
      hasGlobalStyles: !!template.globalStyles,
      hasSections: !!(template.sections && template.sections.length > 0)
    };
  }
}

// Export singleton instance
export const templateResolutionService = TemplateResolutionService.getInstance();

/**
 * Convenience function for resolving templates
 */
export async function resolveTemplate(cvWithTemplate: CVWithTemplate): Promise<TemplateResolutionResult> {
  return templateResolutionService.resolveTemplate(cvWithTemplate);
}
