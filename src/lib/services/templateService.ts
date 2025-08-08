import { Template } from '@/lib/stores/templateStore';

export class TemplateService {
  static async getTemplates(): Promise<Template[]> {
    const response = await fetch('/api/templates');
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    const data = await response.json();
    return data.templates;
  }

  static async getTemplate(templateId: string): Promise<Template> {
    const response = await fetch(`/api/templates/${templateId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    const data = await response.json();
    return data.template;
  }

  static async createTemplate(template: Partial<Template>): Promise<Template> {
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

  static async updateTemplate(templateId: string, template: Partial<Template>): Promise<Template> {
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
} 