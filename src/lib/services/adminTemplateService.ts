/**
 * Admin Template Service
 * 
 * Service for fetching templates from the cvcircle_admin database
 * This centralizes template management across the platform
 */

import mongoose from 'mongoose';
import { ITemplate } from '@/models/Template';

// Admin database connection
let adminConnection: mongoose.Connection | null = null;

async function getAdminConnection(): Promise<mongoose.Connection> {
  if (adminConnection && adminConnection.readyState === 1) {
    return adminConnection;
  }

  const adminMongoUri = process.env.ADMIN_MONGODB_URI || process.env.MONGODB_URI;
  if (!adminMongoUri) {
    console.warn('⚠️ No MongoDB URI found, using fallback templates');
    return null; // Return null to indicate no database connection
  }

  // Create a separate connection for admin database
  adminConnection = mongoose.createConnection(adminMongoUri);
  
  // Define the Template schema for admin connection
  const adminTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: { 
      type: String, 
      enum: ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'],
      default: 'cv'
    },
    categories: [{ type: String }],
    tier: { 
      type: String, 
      enum: ['free', 'premium'],
      default: 'free'
    },
    layoutType: {
      type: String,
      enum: ['one-column', 'two-column', 'three-column', 'custom'],
      required: true
    },
    globalStyles: {
      fontFamily: { type: String },
      primaryColor: { type: String },
      secondaryColor: { type: String },
      backgroundColor: { type: String },
      fontSize: { type: String },
      lineHeight: { type: String },
      spacing: { type: String },
      customCSS: { type: String }
    },
    columnLayout: {
      leftColumn: {
        width: { type: String },
        sections: [{ type: String }]
      },
      rightColumn: {
        width: { type: String },
        sections: [{ type: String }]
      },
      main: {
        width: { type: String },
        sections: [{ type: String }]
      }
    },
    sectionStyling: { type: mongoose.Schema.Types.Mixed },
    availableSections: [{
      key: { type: String, required: true },
      displayName: { type: String, required: true },
      componentName: { type: String, required: true },
      isList: { type: Boolean, default: false },
      defaultItemContent: { type: mongoose.Schema.Types.Mixed }
    }],
    pageSettings: {
      format: {
        type: String,
        enum: ['A4', 'Letter', 'Legal', 'custom'],
        default: 'A4'
      },
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait'
      },
      margins: {
        top: { type: String },
        bottom: { type: String },
        left: { type: String },
        right: { type: String }
      },
      maxHeight: { type: String }
    },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    globalAccess: { type: Boolean, default: true },
    version: { type: Number, default: 1 }
  }, {
    timestamps: true
  });

  adminConnection.model('Template', adminTemplateSchema);
  
  await adminConnection.asPromise();
  console.log('✅ Connected to Admin Template Database');
  
  return adminConnection;
}

export class AdminTemplateService {
  /**
   * Get all available templates from admin database
   */
  static async getAllTemplates(options: {
    category?: string;
    tier?: 'free' | 'premium';
    isActive?: boolean;
  } = {}): Promise<ITemplate[]> {
    try {
      const connection = await getAdminConnection();
      
      // If no database connection, return fallback templates
      if (!connection) {
        console.log('📋 Using fallback templates (no database connection)');
        return this.getFallbackTemplates(options);
      }
      
      const AdminTemplate = connection.model('Template');
      
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
      
      const templates = await AdminTemplate.find(query)
        .sort({ name: 1 })
        .lean()
        .exec();
      
      console.log(`📋 Retrieved ${templates.length} templates from admin database`);
      
      return templates.map((template: any) => ({
        ...template,
        id: template._id.toString(),
        _id: template._id.toString()
      })) as ITemplate[];
      
    } catch (error) {
      console.error('❌ Error fetching admin templates:', error);
      throw new Error('Failed to fetch templates from admin database');
    }
  }

  /**
   * Get a specific template by ID from admin database
   */
  static async getTemplateById(templateId: string): Promise<ITemplate | null> {
    try {
      const connection = await getAdminConnection();
      
      // If no database connection, return fallback template
      if (!connection) {
        console.log('📋 Using fallback template (no database connection)');
        const fallbackTemplates = this.getFallbackTemplates();
        return fallbackTemplates.find(t => t.id === templateId) || fallbackTemplates[0] || null;
      }
      
      const AdminTemplate = connection.model('Template');
      
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        throw new Error('Invalid template ID format');
      }
      
      const template = await AdminTemplate.findById(templateId)
        .lean()
        .exec();
      
      if (!template) {
        return null;
      }
      
      console.log(`📋 Retrieved template: ${template.name} from admin database`);
      
      return {
        ...template,
        id: template._id.toString(),
        _id: template._id.toString()
      } as ITemplate;
      
    } catch (error) {
      console.error('❌ Error fetching admin template by ID:', error);
      throw new Error('Failed to fetch template from admin database');
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
      const connection = await getAdminConnection();
      
      // If no database connection, return fallback default template
      if (!connection) {
        console.log('📋 Using fallback default template (no database connection)');
        const fallbackTemplates = this.getFallbackTemplates({ category });
        return fallbackTemplates.find(t => t.isDefault) || fallbackTemplates[0] || null;
      }
      
      const AdminTemplate = connection.model('Template');
      
      const template = await AdminTemplate.findOne({
        category,
        isDefault: true,
        isActive: true
      }).lean().exec();
      
      if (!template) {
        // Fallback to first available template in category
        const fallbackTemplate = await AdminTemplate.findOne({
          category,
          isActive: true
        }).lean().exec();
        
        return fallbackTemplate ? {
          ...fallbackTemplate,
          id: fallbackTemplate._id.toString(),
          _id: fallbackTemplate._id.toString()
        } as ITemplate : null;
      }
      
      return {
        ...template,
        id: template._id.toString(),
        _id: template._id.toString()
      } as ITemplate;
      
    } catch (error) {
      console.error('❌ Error fetching default admin template:', error);
      throw new Error('Failed to fetch default template from admin database');
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
      const connection = await getAdminConnection();
      const AdminTemplate = connection.model('Template');
      
      const templates = await AdminTemplate.find({
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
      console.error('❌ Error searching admin templates:', error);
      throw new Error('Failed to search templates in admin database');
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
    const fallbackTemplates: ITemplate[] = [
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
      },
      {
        _id: 'fallback-2' as any,
        id: 'fallback-2',
        name: 'Modern CV',
        description: 'Modern and stylish CV template',
        category: 'cv',
        tier: 'free',
        layoutType: 'two-column',
        globalStyles: {
          fontFamily: 'Inter, sans-serif',
          primaryColor: '#3b82f6',
          secondaryColor: '#64748b',
          backgroundColor: '#ffffff',
          fontSize: '14px',
          lineHeight: '1.6',
          spacing: '20px',
          customCSS: ''
        },
        columnLayout: {
          leftColumn: {
            width: '30%',
            sections: ['header', 'skills', 'contact']
          },
          rightColumn: {
            width: '70%',
            sections: ['summary', 'experience', 'education']
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
          },
          {
            key: 'contact',
            displayName: 'Contact Info',
            componentName: 'ContactSection',
            isList: false,
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
        isDefault: false,
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
    return filteredTemplates;
  }

  /**
   * Close admin database connection
   */
  static async closeConnection(): Promise<void> {
    if (adminConnection) {
      await adminConnection.close();
      adminConnection = null;
      console.log('📔 Admin database connection closed');
    }
  }
}

export default AdminTemplateService;

