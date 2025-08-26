import { CVDataStructure } from '@/types/cv';
import { transformDatabaseToStudio, transformStudioToDatabase } from '@/lib/utils/cvDataTransform';

export interface CVFilters {
  userId?: string;
  type?: 'cv' | 'cover';
  status?: 'draft' | 'published' | 'archived';
  sort?: 'updatedAt' | 'createdAt' | 'title';
  limit?: number;
  projection?: 'list' | 'full';
}

export interface CVListResponse {
  cvs: any[];
  total: number;
  counts: {
    total: number;
    drafts: number;
    published: number;
    archived: number;
  };
}

export class CVService {
  static async getCV(cvId: string, userId?: string): Promise<{ cvData: CVDataStructure; jobId?: string }> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const url = `/api/cvs/${cvId}?${params.toString()}`;
    console.log('🔍 CVService - Fetching CV:', url);
    
    const response = await fetch(url);
    console.log('🔍 CVService - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 CVService - Error response:', errorText);
      throw new Error('Failed to fetch CV');
    }
    const data = await response.json();
    console.log('🔍 CVService - Response data:', data);
    
    // Handle the correct API response structure: { success: true, data: { cv: cvResponse } }
    const cvData = data.data?.cv || data.cv;
    
    if (!cvData) {
      console.error('🔍 CVService - No CV data found in response:', data);
      throw new Error('No CV data found in response');
    }
    
    console.log('🔍 CVService - CV data structure:', cvData);
    
    // Check if cvData has the expected CVDataStructure format
    if (cvData.cvData && typeof cvData.cvData === 'object') {
      console.log('🔍 CVService - Found cvData field, checking structure...');
      
      // Check if it's already in CVDataStructure format
      if (cvData.cvData.basics && Array.isArray(cvData.cvData.work)) {
        console.log('🔍 CVService - Data is already in CVDataStructure format');
        return {
          cvData: cvData.cvData as CVDataStructure,
          jobId: cvData.jobId
        };
      } else {
        console.log('🔍 CVService - Transforming old format data');
        return {
          cvData: transformDatabaseToStudio(cvData.cvData),
          jobId: cvData.jobId
        };
      }
    }
    
    // If cvData itself is the CVDataStructure
    if (cvData.basics && Array.isArray(cvData.work)) {
      console.log('🔍 CVService - cvData is already in CVDataStructure format');
      return {
        cvData: cvData as CVDataStructure,
        jobId: cvData.jobId
      };
    }
    
    console.error('🔍 CVService - Unknown data format:', cvData);
    throw new Error('Unknown CV data format');
  }

  static async getCVs(filters: CVFilters = {}): Promise<CVListResponse> {
    const params = new URLSearchParams();
    
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.projection) params.append('projection', filters.projection);

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
  }): Promise<any> {
    console.log('🔍 CVService.createCV - Input data:', { 
      userId: cvData.userId, 
      title: cvData.title, 
      hasJobId: !!cvData.jobId,
      hasData: !!cvData 
    });
    
    // Send CV data directly since it's already in the correct format
    const requestBody = {
      userId: cvData.userId,
      title: cvData.title,
      cvData: cvData,
      jobId: cvData.jobId,
      type: 'cv'
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

  static async updateCV(cvId: string, cvData: CVDataStructure, userId?: string): Promise<any> {
    console.log('🔍 CVService.updateCV - Input data:', { 
      cvId, 
      userId, 
      hasData: !!cvData 
    });
    
    // Send CV data directly since it's already in the correct format
    const requestBody = {
      userId: userId,
      cvData: cvData
    };
    
    console.log('🔍 CVService.updateCV - Request body:', requestBody);
    
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log('🔍 CVService.updateCV - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 CVService.updateCV - Error response:', errorText);
      throw new Error(`Failed to update CV: ${response.status} ${errorText}`);
    }
    
    if (response.status === 0) {
      throw new Error('Request was aborted (timeout)');
    }
    
    const result = await response.json();
    console.log('🔍 CVService.updateCV - Response data:', result);
    
    return result;
  }

  static async deleteCV(cvId: string, userId?: string): Promise<void> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}?${params.toString()}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete CV');
    }
  }

  static async duplicateCV(cvId: string, userId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}/duplicate?${params.toString()}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to duplicate CV');
    }
    
    return await response.json();
  }

  static async exportCV(cvId: string, format: 'pdf' | 'docx' | 'json', userId?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    params.append('format', format);
    
    const response = await fetch(`/api/cvs/${cvId}/export?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to export CV');
    }
    
    return await response.blob();
  }
} 