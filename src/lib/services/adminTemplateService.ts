// @ts-nocheck
/**
 * Admin Template Service
 * 
 * Service for fetching templates from the primary app database
 * This centralizes template management across the platform
 */

import getConnection from '@/lib/database';
import Template from '@/models/Template';
import { ITemplate } from '@/models/Template';
import mongoose from 'mongoose';
import { isHardcodedTemplate, getTemplateById as getHardcodedTemplateById } from '@/lib/templates/template-utils';

export class AdminTemplateService {
  /**
   * Get all available templates from primary database
   */
  static async getAllTemplates(options: {
    category?: string;
    tier?: 'free' | 'premium';
    isActive?: boolean;
  } = {}): Promise<ITemplate[]> {
    try {
      await getConnection();
      
      const query: any = {};
      
      if (options.category) {
        query.category = options.category;
      }
      
      if (options.tier) {
        query.tier = options.tier;
      }
      
      if (options.isActive !== undefined) {
        query.isActive = options.isActive;
      }
      
      const templates = await Template.find(query)
        .sort({ name: 1 })
        .lean()
        .exec();
      
      const templatesArray = Array.isArray(templates) ? templates : [templates];
      console.log(`📋 Retrieved ${templatesArray.length} templates from primary database`);
      
      return templatesArray.map((template: any) => ({
        ...template,
        id: template._id?.toString() || '',
        _id: template._id?.toString() || ''
      })) as ITemplate[];
      
    } catch (error) {
      console.error('❌ Error fetching templates:', error);
      console.log('🔄 Falling back to static templates');
      return this.getFallbackTemplates(options);
    }
  }

  /**
   * Get a specific template by ID from primary database
   */
  static async getTemplateById(templateId: string): Promise<ITemplate | null> {
    try {
      await getConnection();
      
      if (!templateId || templateId === 'fallback') {
        console.log('📋 Using fallback template');
        const fallbackTemplates = this.getFallbackTemplates();
        return fallbackTemplates[0] || null;
      }
      
      // First check if it's a hardcoded template (string ID)
      if (isHardcodedTemplate(templateId)) {
        const hardcodedTemplate = getHardcodedTemplateById(templateId);
        if (hardcodedTemplate) {
          console.log(`📋 Retrieved hardcoded template: ${hardcodedTemplate.name}`);
          return hardcodedTemplate;
        }
      }
      
      // Only query database if templateId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        console.log(`📋 Template ID "${templateId}" is not a valid ObjectId and not found in hardcoded templates, using fallback`);
        const fallbackTemplates = this.getFallbackTemplates();
        return fallbackTemplates[0] || null;
      }
      
      const template = await Template.findById(templateId)
        .lean()
        .exec();
      
      if (!template) {
        console.log('📋 Template not found in database, using fallback');
        const fallbackTemplates = this.getFallbackTemplates();
        return fallbackTemplates[0] || null;
      }
      
      const templateDoc = Array.isArray(template) ? template[0] : template;
      if (!templateDoc) {
        const fallbackTemplates = this.getFallbackTemplates();
        return fallbackTemplates[0] || null;
      }
      
      console.log(`📋 Retrieved template: ${(templateDoc as any).name} from primary database`);
      
      return {
        ...templateDoc,
        id: (templateDoc as any)._id?.toString() || '',
        _id: (templateDoc as any)._id?.toString() || ''
      } as unknown as ITemplate;
      
    } catch (error) {
      console.error('❌ Error fetching template by ID:', error);
      console.log('🔄 Using fallback template');
      const fallbackTemplates = this.getFallbackTemplates();
      return fallbackTemplates[0] || null;
    }
  }

  /**
   * Get templates by category and tier
   */
  static async getTemplatesByCategory(
    category: string = 'cv',
    tier?: 'free' | 'premium'
  ): Promise<ITemplate[]> {
    return this.getAllTemplates({ category, tier, isActive: true });
  }

  /**
   * Get free templates only
   */
  static async getFreeTemplates(category: string = 'cv'): Promise<ITemplate[]> {
    return this.getAllTemplates({ category, tier: 'free', isActive: true });
  }

  /**
   * Get premium templates only
   */
  static async getPremiumTemplates(category: string = 'cv'): Promise<ITemplate[]> {
    return this.getAllTemplates({ category, tier: 'premium', isActive: true });
  }

  /**
   * Get default template for a category
   */
  static async getDefaultTemplate(category: string = 'cv'): Promise<ITemplate | null> {
    try {
      // First check hardcoded templates for default
      const { getAllTemplates } = await import('@/lib/templates/template-utils');
      const templates = getAllTemplates();
      const hardcodedDefault = templates.find(
        t => t.isDefault === true && t.category === category
      );
      
      if (hardcodedDefault) {
        console.log(`✅ AdminTemplateService - Using hardcoded default template: ${hardcodedDefault.name}`);
        return hardcodedDefault as unknown as ITemplate;
      }
      
      await getConnection();
      
      const template = await Template.findOne({
        category,
        isDefault: true,
        isActive: true
      }).lean().exec();
      
      if (!template) {
        // Fallback to first available template in category
        const fallbackTemplate = await Template.findOne({
          category,
          isActive: true
        }).lean().exec();
        
        if (fallbackTemplate) {
          const templateDoc = Array.isArray(fallbackTemplate) ? fallbackTemplate[0] : fallbackTemplate;
          if (templateDoc) {
            return {
              ...templateDoc,
              id: (templateDoc as any)._id?.toString() || '',
              _id: (templateDoc as any)._id?.toString() || ''
            } as unknown as ITemplate;
          }
        }
        
        // Use static fallback
        const fallbackTemplates = this.getFallbackTemplates({ category });
        return fallbackTemplates.find(t => t.isDefault) || fallbackTemplates[0] || null;
      }
      
      const templateDoc = Array.isArray(template) ? template[0] : template;
      if (!templateDoc) {
        const fallbackTemplates = this.getFallbackTemplates({ category });
        return fallbackTemplates.find(t => t.isDefault) || fallbackTemplates[0] || null;
      }
      
      return {
        ...templateDoc,
        id: (templateDoc as any)._id?.toString() || '',
        _id: (templateDoc as any)._id?.toString() || ''
      } as unknown as ITemplate;
      
    } catch (error) {
      console.error('❌ Error fetching default template:', error);
      const fallbackTemplates = this.getFallbackTemplates({ category });
      return fallbackTemplates.find(t => t.isDefault) || fallbackTemplates[0] || null;
    }
  }

  /**
   * Search templates by name or description
   */
  static async searchTemplates(
    searchTerm: string,
    category: string = 'cv'
  ): Promise<ITemplate[]> {
    try {
      await getConnection();
      
      const templates = await Template.find({
        category,
        isActive: true,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { categories: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      })
      .sort({ name: 1 })
      .lean()
      .exec();
      
      console.log(`🔍 Search for "${searchTerm}" found ${templates.length} templates`);
      
      return templates.map((template: any) => ({
        ...template,
        id: template._id.toString(),
        _id: template._id.toString()
      })) as ITemplate[];
      
    } catch (error) {
      console.error('❌ Error searching templates:', error);
      return [];
    }
  }

  /**
   * Get fallback templates when database is not available
   */
  static getFallbackTemplates(options: {
    category?: string;
    tier?: 'free' | 'premium';
    isActive?: boolean;
  } = {}): ITemplate[] {
    const fallbackTemplates = [
      {
        _id: 'fallback-1' as any,
        id: 'fallback-1',
        name: 'Professional CV',
        description: 'Clean and professional CV template',
        category: 'cv',
        tier: 'free',
        layoutType: 'one-column',
        globalStyles: {
          fontFamily: 'Inter, sans-serif',
          primaryColor: '#1f2937',
          secondaryColor: '#6b7280',
          backgroundColor: '#ffffff',
          fontSize: '14px',
          lineHeight: '1.6',
          spacing: '24px',
          customCSS: ''
        },
        columnLayout: {
          main: {
            width: '100%',
            sections: ['header', 'summary', 'experience', 'education', 'skills']
          }
        },
        sectionStyling: {},
        availableSections: [
          {
            key: 'header',
            displayName: 'Header',
            componentName: 'HeaderSection',
            isList: false,
            defaultItemContent: {}
          },
          {
            key: 'summary',
            displayName: 'Professional Summary',
            componentName: 'SummarySection',
            isList: false,
            defaultItemContent: {}
          },
          {
            key: 'experience',
            displayName: 'Work Experience',
            componentName: 'ExperienceSection',
            isList: true,
            defaultItemContent: {}
          },
          {
            key: 'education',
            displayName: 'Education',
            componentName: 'EducationSection',
            isList: true,
            defaultItemContent: {}
          },
          {
            key: 'skills',
            displayName: 'Skills',
            componentName: 'SkillsSection',
            isList: true,
            defaultItemContent: {}
          }
        ],
        pageSettings: {
          format: 'A4',
          orientation: 'portrait',
          margins: {
            top: '20mm',
            bottom: '20mm',
            left: '20mm',
            right: '20mm'
          },
          maxHeight: '297mm'
        },
        isActive: true,
        isDefault: true,
        isPublished: true,
        globalAccess: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Filter templates based on options
    let filteredTemplates = fallbackTemplates;

    if (options.category && options.category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === options.category);
    }

    if (options.tier) {
      filteredTemplates = filteredTemplates.filter(t => t.tier === options.tier);
    }

    if (options.isActive !== undefined) {
      filteredTemplates = filteredTemplates.filter(t => t.isActive === options.isActive);
    }

    console.log(`📋 Returning ${filteredTemplates.length} fallback templates`);
    return filteredTemplates as ITemplate[];
  }
}

// Legacy function exports for backward compatibility
export async function getAllTemplates(): Promise<ITemplate[]> {
  return AdminTemplateService.getAllTemplates();
}

export async function getTemplateById(templateId: string): Promise<ITemplate | null> {
  return AdminTemplateService.getTemplateById(templateId);
}

export async function getTemplatesByCategory(category: string): Promise<ITemplate[]> {
  return AdminTemplateService.getTemplatesByCategory(category);
}

export default AdminTemplateService;