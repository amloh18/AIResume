/**
 * CV Template Utilities
 * 
 * Utility functions for working with the decoupled CV and Template schema.
 * These functions handle the separation of content (CV) and styling (Template).
 */

import mongoose from 'mongoose';
import { CV, Template } from '@/models';

export interface CVWithTemplate {
  _id: string;
  userId: mongoose.Types.ObjectId;
  firebaseUid: string;
  title: string;
  cvData: any;
  templateId: mongoose.Types.ObjectId;
  template?: {
    _id: string;
    name: string;
    globalStyles: any;
    availableSections: any[];
  };
  status: 'draft' | 'published' | 'archived';
  version: number;
  isMaster: boolean;
  journeyId?: mongoose.Types.ObjectId;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch a single CV with its template data
 */
export async function getCVWithTemplate(cvId: string): Promise<CVWithTemplate | null> {
  try {
    const cv = await CV.findById(cvId)
      .populate('templateId', 'name globalStyles availableSections')
      .lean();
    
    if (!cv) {
      return null;
    }

    return {
      ...cv,
      _id: cv._id.toString(),
      template: cv.templateId ? {
        _id: cv.templateId._id.toString(),
        name: cv.templateId.name,
        globalStyles: cv.templateId.globalStyles,
        availableSections: cv.templateId.availableSections
      } : undefined
    } as CVWithTemplate;
  } catch (error) {
    console.error('Error fetching CV with template:', error);
    return null;
  }
}

/**
 * Fetch multiple CVs with their template data
 */
export async function getCVsWithTemplates(
  query: Record<string, any>,
  options: {
    limit?: number;
    sort?: Record<string, 1 | -1>;
    projection?: string;
  } = {}
): Promise<CVWithTemplate[]> {
  try {
    let cvQuery = CV.find(query)
      .populate('templateId', 'name globalStyles availableSections');

    if (options.limit) {
      cvQuery = cvQuery.limit(options.limit);
    }

    if (options.sort) {
      cvQuery = cvQuery.sort(options.sort);
    }

    if (options.projection) {
      cvQuery = cvQuery.select(options.projection);
    }

    const cvs = await cvQuery.lean();

    return cvs.map(cv => ({
      ...cv,
      _id: cv._id.toString(),
      template: cv.templateId ? {
        _id: cv.templateId._id.toString(),
        name: cv.templateId.name,
        globalStyles: cv.templateId.globalStyles,
        availableSections: cv.templateId.availableSections
      } : undefined
    })) as CVWithTemplate[];
  } catch (error) {
    console.error('Error fetching CVs with templates:', error);
    return [];
  }
}

/**
 * Get default template for CV creation
 */
export async function getDefaultTemplate() {
  try {
    const defaultTemplate = await Template.findOne({ 
      isDefault: true, 
      category: 'cv',
      isActive: true 
    }).lean();

    return defaultTemplate;
  } catch (error) {
    console.error('Error fetching default template:', error);
    return null;
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(templateId: string) {
  try {
    const template = await Template.findById(templateId).lean();
    return template;
  } catch (error) {
    console.error('Error fetching template by ID:', error);
    return null;
  }
}

/**
 * Validate that a template exists and is accessible
 */
export async function validateTemplate(templateId: string): Promise<boolean> {
  try {
    const template = await Template.findOne({
      _id: templateId,
      isActive: true,
      isPublished: true,
      globalAccess: true
    });

    return !!template;
  } catch (error) {
    console.error('Error validating template:', error);
    return false;
  }
}

/**
 * Create CV data structure with template validation
 */
export async function createCVWithTemplate(
  cvData: any,
  userId: mongoose.Types.ObjectId,
  firebaseUid: string,
  templateId?: string
): Promise<any> {
  // Get template (default if not specified)
  let template;
  if (templateId) {
    template = await getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
  } else {
    template = await getDefaultTemplate();
    if (!template) {
      throw new Error('No default template available');
    }
  }

  // Validate template is accessible
  const isValid = await validateTemplate(template._id.toString());
  if (!isValid) {
    throw new Error('Template is not accessible');
  }

  // Create CV with required fields
  const newCV = new CV({
    userId,
    firebaseUid,
    templateId: template._id,
    ...cvData
  });

  return await newCV.save();
}

/**
 * Update CV template (useful for template switching)
 */
export async function updateCVTemplate(
  cvId: string, 
  newTemplateId: string
): Promise<boolean> {
  try {
    // Validate new template
    const isValid = await validateTemplate(newTemplateId);
    if (!isValid) {
      throw new Error('New template is not accessible');
    }

    // Update CV template
    const result = await CV.updateOne(
      { _id: cvId },
      { 
        templateId: new mongoose.Types.ObjectId(newTemplateId),
        'metadata.lastModified': new Date()
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating CV template:', error);
    return false;
  }
}

/**
 * Get available templates for user
 */
export async function getAvailableTemplates(
  category: 'cv' | 'portfolio' | 'cover-letter' | 'resume' = 'cv'
) {
  try {
    const templates = await Template.find({
      category,
      isActive: true,
      isPublished: true,
      globalAccess: true
    })
    .select('name description thumbnail tier globalStyles availableSections')
    .sort({ isDefault: -1, name: 1 })
    .lean();

    return templates;
  } catch (error) {
    console.error('Error fetching available templates:', error);
    return [];
  }
}
