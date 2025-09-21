import { CVDataStructure } from '@/types/cv';
import { transformDatabaseToStudio } from '@/lib/utils/cvDataTransform';

export interface CVFilters {
  type?: string;
  status?: string;
  sort?: string;
  limit?: string;
  projection?: string;
}

export interface CVListResponse {
  success: boolean;
  cvs: any[];
  total: number;
  summary: {
    draft: number;
    published: number;
    archived: number;
  };
}

export interface CVWithTemplate {
  cvData: CVDataStructure;
  jobId?: string;
  title?: string;
  template?: any;
  templateId?: string;
  id?: string;
  status?: string;
  isMaster?: boolean;
  metadata?: any;
}

export class CVService {
  static async getCV(cvId: string, userId?: string): Promise<CVWithTemplate> {
    const url = `/api/cvs/${cvId}`;
    console.log('🔍 CVService - Fetching CV:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('🔍 CVService - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 CVService - Error response:', errorText);
      throw new Error('Failed to fetch CV');
    }
    const data = await response.json();
    console.log('🔍 CVService - Response data:', data);
    
    // Handle the new API response structure: { success: true, cv: cvWithTemplate }
    const cvData = data.cv;
    
    if (!cvData) {
      console.error('🔍 CVService - No CV data found in response:', data);
      throw new Error('No CV data found in response');
    }
    
    console.log('🔍 CVService - CV data structure:', cvData);
    
    // New schema: CV data with template reference
    if (cvData.cvData && typeof cvData.cvData === 'object') {
      console.log('🔍 CVService - Found cvData field, checking structure...');
      
      // Check if it's already in CVDataStructure format
      if (cvData.cvData.basics && Array.isArray(cvData.cvData.work)) {
        console.log('🔍 CVService - Data is already in CVDataStructure format');
        return {
          cvData: cvData.cvData as CVDataStructure,
          jobId: cvData.journeyId, // journeyId replaces jobId in new schema
          title: cvData.title,
          template: cvData.template,
          templateId: cvData.templateId,
          id: cvData.id || cvData._id,
          status: cvData.status,
          isMaster: cvData.isMaster,
          metadata: cvData.metadata
        };
      } else {
        console.log('🔍 CVService - Transforming old format data');
        return {
          cvData: transformDatabaseToStudio(cvData.cvData),
          jobId: cvData.journeyId,
          title: cvData.title,
          template: cvData.template,
          templateId: cvData.templateId,
          id: cvData.id || cvData._id,
          status: cvData.status,
          isMaster: cvData.isMaster,
          metadata: cvData.metadata
        };
      }
    }
    
    // If cvData itself is the CVDataStructure
    if (cvData.basics && Array.isArray(cvData.work)) {
      console.log('🔍 CVService - Root level CVDataStructure found');
      return {
        cvData: cvData as CVDataStructure,
        title: 'Untitled CV'
      };
    }
    
    throw new Error('Invalid CV data structure');
  }

  static async getCVs(filters: CVFilters = {}): Promise<CVListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await fetch(`/api/cvs?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CVs');
    }

    const data = await response.json();
    return data;
  }

  static async createCV(cvData: CVDataStructure & { 
    jobId?: string; 
    userId: string;
    title: string;
    templateId?: string;
  }): Promise<any> {
    console.log('🔍 CVService.createCV - Input data:', { 
      userId: cvData.userId, 
      title: cvData.title, 
      hasJobId: !!cvData.jobId,
      templateId: cvData.templateId,
      hasData: !!cvData 
    });
    
    // Prepare request body for new decoupled schema
    const requestBody = {
      title: cvData.title,
      cvData: cvData,
      templateId: cvData.templateId, // Use templateId instead of inline styling
      status: 'draft',
      isMaster: false,
      metadata: {
        tags: [],
        isPublic: false
      }
    };
    
    console.log('🔍 CVService.createCV - Request body:', requestBody);
    
    const response = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('🔍 CVService.createCV - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 CVService.createCV - Error response:', errorText);
      throw new Error('Failed to create CV');
    }
    
    const result = await response.json();
    console.log('🔍 CVService.createCV - Response data:', result);
    
    return result;
  }

  static async updateCV(cvId: string, cvData: CVDataStructure, userId?: string, templateId?: string): Promise<any> {
    console.log('🔍 CVService.updateCV - Input data:', { 
      cvId, 
      userId, 
      templateId,
      hasData: !!cvData 
    });

    const requestBody = {
      cvData,
      templateId, // Include templateId for updates
      title: (cvData as any).title || 'Untitled CV',
      metadata: {
        lastModified: new Date().toISOString()
      }
    };

    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 CVService.updateCV - Error response:', errorText);
      throw new Error('Failed to update CV');
    }

    const result = await response.json();
    console.log('🔍 CVService.updateCV - Response data:', result);
    
    return result;
  }

  static async deleteCV(cvId: string, userId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete CV');
    }

    return response.json();
  }

  static async getMasterCV(userId: string): Promise<any> {
    const response = await fetch(`/api/cvs/master`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch master CV');
    }

    return response.json();
  }

  static async setMasterCV(cvId: string, userId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isMaster: true
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to set master CV');
    }

    return response.json();
  }

  /**
   * Get available templates for CV creation
   */
  static async getTemplates(category: string = 'cv'): Promise<any> {
    const response = await fetch(`/api/templates?category=${category}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    const data = await response.json();
    return data.templates || [];
  }

  /**
   * Switch CV template
   */
  static async switchTemplate(cvId: string, templateId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to switch template');
    }

    return response.json();
  }
}