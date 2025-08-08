import { Document, Template, ISectionContent, ISectionBlueprint } from '@/models';
import mongoose from 'mongoose';

export class DocumentService {
  /**
   * Create a new document with initial content
   */
  static async createDocument(
    userId: mongoose.Types.ObjectId,
    templateId: mongoose.Types.ObjectId,
    title: string,
    description?: string
  ) {
    const template = await Template.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const document = new Document({
      userId,
      templateId,
      title,
      description,
      content: [],
      status: 'draft'
    });

    return await document.save();
  }

  /**
   * Add a new section to a document
   */
  static async addSection(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string,
    userId: mongoose.Types.ObjectId
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const template = await Template.findById(document.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const sectionBlueprint = template.availableSections.find(
      section => section.key === sectionKey
    );
    if (!sectionBlueprint) {
      throw new Error(`Section type '${sectionKey}' not available in this template`);
    }

    // Check if section already exists
    const existingSection = document.content.find(
      section => section.sectionKey === sectionKey
    );
    if (existingSection && !sectionBlueprint.isList) {
      throw new Error(`Section '${sectionKey}' already exists and cannot be duplicated`);
    }

    // Create new section content
    const newSection: ISectionContent = {
      sectionKey,
      items: [sectionBlueprint.defaultItemContent],
      order: document.content.length,
      isVisible: true,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      }
    };

    document.content.push(newSection);
    return await document.save();
  }

  /**
   * Add a new item to an existing list section
   */
  static async addItemToSection(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string,
    userId: mongoose.Types.ObjectId
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const template = await Template.findById(document.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const sectionBlueprint = template.availableSections.find(
      section => section.key === sectionKey
    );
    if (!sectionBlueprint) {
      throw new Error(`Section type '${sectionKey}' not found`);
    }

    if (!sectionBlueprint.isList) {
      throw new Error(`Section '${sectionKey}' is not a list section`);
    }

    const section = document.content.find(s => s.sectionKey === sectionKey);
    if (!section) {
      throw new Error(`Section '${sectionKey}' not found in document`);
    }

    // Check max items limit
    if (sectionBlueprint.maxItems && section.items.length >= sectionBlueprint.maxItems) {
      throw new Error(`Maximum number of items (${sectionBlueprint.maxItems}) reached for section '${sectionKey}'`);
    }

    section.items.push(sectionBlueprint.defaultItemContent);
    section.metadata.updatedAt = new Date();
    section.metadata.createdBy = userId;

    return await document.save();
  }

  /**
   * Update content of a specific item in a section
   */
  static async updateSectionItem(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string,
    itemIndex: number,
    newContent: any,
    userId: mongoose.Types.ObjectId
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const section = document.content.find(s => s.sectionKey === sectionKey);
    if (!section) {
      throw new Error(`Section '${sectionKey}' not found`);
    }

    if (itemIndex < 0 || itemIndex >= section.items.length) {
      throw new Error(`Item index ${itemIndex} out of bounds`);
    }

    section.items[itemIndex] = { ...section.items[itemIndex], ...newContent };
    section.metadata.updatedAt = new Date();
    section.metadata.createdBy = userId;

    return await document.save();
  }

  /**
   * Remove an item from a list section
   */
  static async removeSectionItem(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string,
    itemIndex: number
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const template = await Template.findById(document.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const sectionBlueprint = template.availableSections.find(
      section => section.key === sectionKey
    );
    if (!sectionBlueprint) {
      throw new Error(`Section type '${sectionKey}' not found`);
    }

    const section = document.content.find(s => s.sectionKey === sectionKey);
    if (!section) {
      throw new Error(`Section '${sectionKey}' not found`);
    }

    if (itemIndex < 0 || itemIndex >= section.items.length) {
      throw new Error(`Item index ${itemIndex} out of bounds`);
    }

    // Check min items limit
    if (sectionBlueprint.minItems && section.items.length <= sectionBlueprint.minItems) {
      throw new Error(`Cannot remove item: minimum number of items (${sectionBlueprint.minItems}) required`);
    }

    section.items.splice(itemIndex, 1);
    section.metadata.updatedAt = new Date();

    return await document.save();
  }

  /**
   * Remove an entire section from a document
   */
  static async removeSection(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const sectionIndex = document.content.findIndex(s => s.sectionKey === sectionKey);
    if (sectionIndex === -1) {
      throw new Error(`Section '${sectionKey}' not found`);
    }

    document.content.splice(sectionIndex, 1);

    // Reorder remaining sections
    document.content.forEach((section, index) => {
      section.order = index;
    });

    return await document.save();
  }

  /**
   * Reorder sections in a document
   */
  static async reorderSections(
    documentId: mongoose.Types.ObjectId,
    newOrder: string[] // Array of section keys in desired order
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Validate that all section keys exist
    const existingKeys = document.content.map(s => s.sectionKey);
    const missingKeys = newOrder.filter(key => !existingKeys.includes(key));
    if (missingKeys.length > 0) {
      throw new Error(`Section keys not found: ${missingKeys.join(', ')}`);
    }

    // Reorder sections
    const reorderedContent: ISectionContent[] = [];
    newOrder.forEach((sectionKey, index) => {
      const section = document.content.find(s => s.sectionKey === sectionKey);
      if (section) {
        section.order = index;
        reorderedContent.push(section);
      }
    });

    document.content = reorderedContent;
    return await document.save();
  }

  /**
   * Update section styles
   */
  static async updateSectionStyles(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string,
    styles: any
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const section = document.content.find(s => s.sectionKey === sectionKey);
    if (!section) {
      throw new Error(`Section '${sectionKey}' not found`);
    }

    section.styles = { ...section.styles, ...styles };
    section.metadata.updatedAt = new Date();

    return await document.save();
  }

  /**
   * Toggle section visibility
   */
  static async toggleSectionVisibility(
    documentId: mongoose.Types.ObjectId,
    sectionKey: string
  ) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const section = document.content.find(s => s.sectionKey === sectionKey);
    if (!section) {
      throw new Error(`Section '${sectionKey}' not found`);
    }

    section.isVisible = !section.isVisible;
    section.metadata.updatedAt = new Date();

    return await document.save();
  }

  /**
   * Get document with template and populate all necessary data
   */
  static async getDocumentWithTemplate(documentId: mongoose.Types.ObjectId) {
    const document = await Document.findById(documentId)
      .populate('template')
      .populate('user', 'name email')
      .exec();

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Get available sections for a template
   */
  static async getAvailableSections(templateId: mongoose.Types.ObjectId) {
    const template = await Template.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return template.availableSections;
  }

  /**
   * Validate document content against template constraints
   */
  static async validateDocument(documentId: mongoose.Types.ObjectId) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const template = await Template.findById(document.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const errors: string[] = [];

    // Check each section against template constraints
    document.content.forEach(section => {
      const blueprint = template.availableSections.find(b => b.key === section.sectionKey);
      if (!blueprint) {
        errors.push(`Section '${section.sectionKey}' is not available in this template`);
        return;
      }

      // Check min/max items
      if (blueprint.minItems && section.items.length < blueprint.minItems) {
        errors.push(`Section '${section.sectionKey}' requires at least ${blueprint.minItems} items`);
      }

      if (blueprint.maxItems && section.items.length > blueprint.maxItems) {
        errors.push(`Section '${section.sectionKey}' cannot have more than ${blueprint.maxItems} items`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 