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
    // Transform Studio format to database format
    const dbData = transformStudioToDatabase(cvData);
    
    const response = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: cvData.userId,
        title: cvData.title,
        cvData: dbData,
        jobId: cvData.jobId,
        type: 'cv'
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create CV');
    }
    
    return await response.json();
  }

  static async updateCV(cvId: string, cvData: CVDataStructure, userId?: string): Promise<any> {
    // Transform Studio format to database format
    const dbData = transformStudioToDatabase(cvData);
    
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}?${params.toString()}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvData: dbData
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update CV');
    }
    
    return await response.json();
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