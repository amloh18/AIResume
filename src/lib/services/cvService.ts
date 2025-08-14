import { CVData } from '@/lib/stores/cvStore';

export interface CVFilters {
  userId?: string;
  type?: 'cv' | 'cover';
  status?: 'draft' | 'published' | 'archived';
  sort?: 'updatedAt' | 'createdAt' | 'title';
  limit?: number;
  projection?: 'list' | 'full';
  starred?: boolean;
  published?: boolean;
}

export interface CVListResponse {
  cvs: any[];
  total: number;
  counts: {
    total: number;
    drafts: number;
    published: number;
    archived: number;
    starred: number;
  };
}

export class CVService {
  static async getCV(cvId: string): Promise<CVData> {
    const response = await fetch(`/api/cvs/${cvId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CV');
    }
    const data = await response.json();
    return data.cv;
  }

  static async getCVs(filters: CVFilters = {}): Promise<CVListResponse> {
    const params = new URLSearchParams();
    
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.projection) params.append('projection', filters.projection);
    if (filters.starred !== undefined) params.append('starred', filters.starred.toString());
    if (filters.published !== undefined) params.append('published', filters.published.toString());

    const response = await fetch(`/api/cvs?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CVs');
    }
    const data = await response.json();
    return data;
  }

  static async createCV(cvData: CVData & { 
    jobId?: string; 
    templateId?: string;
    userId: string;
    title: string;
  }): Promise<any> {
    const response = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cvData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create CV');
    }
    
    return await response.json();
  }

  static async updateCV(cvId: string, cvData: Partial<CVData>): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cvData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update CV');
    }
    
    return await response.json();
  }

  static async deleteCV(cvId: string): Promise<void> {
    const response = await fetch(`/api/cvs/${cvId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete CV');
    }
  }

  static async duplicateCV(cvId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}/duplicate`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to duplicate CV');
    }
    
    return await response.json();
  }

  static async publishCV(cvId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}/publish`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to publish CV');
    }
    
    return await response.json();
  }

  static async unpublishCV(cvId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}/unpublish`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to unpublish CV');
    }
    
    return await response.json();
  }

  static async toggleStar(cvId: string): Promise<any> {
    const response = await fetch(`/api/cvs/${cvId}/star`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle star');
    }
    
    return await response.json();
  }

  static async generatePDF(cvData: CVData, template: any): Promise<Blob> {
    const response = await fetch('/api/cvs/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvData, template }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }
    
    return await response.blob();
  }

  // Dashboard-specific methods
  static async getRecentCVs(userId: string, limit: number = 5): Promise<any[]> {
    const response = await this.getCVs({
      userId,
      sort: 'updatedAt',
      limit,
      projection: 'list'
    });
    return response.cvs;
  }

  static async getCVCounts(userId: string): Promise<{
    total: number;
    drafts: number;
    published: number;
    starred: number;
    views: number;
  }> {
    const response = await this.getCVs({ userId, projection: 'list' });
    return {
      total: response.counts.total,
      drafts: response.counts.drafts,
      published: response.counts.published,
      starred: response.counts.starred,
      views: response.cvs.reduce((sum, cv) => sum + (cv.metadata?.viewCount || 0), 0)
    };
  }

  // Studio-specific methods
  static async linkJobToCV(cvId: string, jobId: string): Promise<any> {
    return await this.updateCV(cvId, { jobId });
  }

  static async getCVWithTemplate(cvId: string): Promise<{
    cv: CVData;
    template: any;
  }> {
    const cv = await this.getCV(cvId);
    const template = await import('@/lib/services/templateService').then(module => 
      module.default.getTemplate(cv.templateId || 'default')
    );
    return { cv, template };
  }
} 