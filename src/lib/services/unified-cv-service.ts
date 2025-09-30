/**
 * UNIFIED CV SERVICE
 * 
 * This service provides direct access to CV data using the unified schema.
 * NO TRANSFORMATION LAYERS - Direct serialization/deserialization only.
 * 
 * All CV operations (CRUD) must use this service to ensure consistency.
 */

import { 
  UnifiedCVDataStructure, 
  UnifiedCVDocument, 
  UnifiedCVAPIResponse, 
  UnifiedCVRequest,
  DEFAULT_UNIFIED_CV_DATA,
  UnifiedCVMigration
} from '@/types/unified-cv-schema';

export class UnifiedCVService {
  /**
   * Get a single CV by ID
   * Returns data in unified format - no transformation
   */
  static async getCV(cvId: string, userId?: string): Promise<UnifiedCVDocument> {
    const url = `/api/cvs/${cvId}`;
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch CV: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cv) {
      throw new Error('CV not found or access denied');
    }
    
    return result.data.cv;
  }

  /**
   * Get all CVs for a user
   * Returns data in unified format - no transformation
   */
  static async getCVs(userId?: string, filters?: {
    status?: 'draft' | 'published' | 'archived';
    isMaster?: boolean;
    starred?: boolean;
    projection?: 'summary' | 'full';
  }): Promise<UnifiedCVDocument[]> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.isMaster !== undefined) {
      params.append('isMaster', filters.isMaster.toString());
    }
    if (filters?.starred !== undefined) {
      params.append('starred', filters.starred.toString());
    }
    if (filters?.projection) {
      params.append('projection', filters.projection);
    }
    
    const response = await fetch(`/api/cvs?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch CVs: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cvs) {
      throw new Error('Failed to fetch CVs');
    }
    
    return result.data.cvs;
  }

  /**
   * Create a new CV
   * Accepts unified format - no transformation
   */
  static async createCV(cvData: UnifiedCVRequest, userId: string): Promise<UnifiedCVDocument> {
    const response = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...cvData,
        userId
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create CV: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cv) {
      throw new Error('Failed to create CV');
    }
    
    return result.data.cv;
  }

  /**
   * Update an existing CV
   * Accepts unified format - no transformation
   */
  static async updateCV(cvId: string, cvData: Partial<UnifiedCVRequest>, userId?: string): Promise<UnifiedCVDocument> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}?${params.toString()}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cvData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update CV: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cv) {
      throw new Error('Failed to update CV');
    }
    
    return result.data.cv;
  }

  /**
   * Delete a CV
   */
  static async deleteCV(cvId: string, userId?: string): Promise<void> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}?${params.toString()}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete CV: ${response.status} ${errorText}`);
    }
  }

  /**
   * Get master CV for a user
   * Returns data in unified format - no transformation
   */
  static async getMasterCV(userId: string): Promise<UnifiedCVDocument | null> {
    const response = await fetch(`/api/cvs/master?userId=${userId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch master CV: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cv) {
      return null;
    }
    
    return result.data.cv;
  }

  /**
   * Set a CV as master CV
   */
  static async setMasterCV(cvId: string, userId: string): Promise<UnifiedCVDocument> {
    const response = await fetch('/api/cvs/set-master', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvId,
        userId
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set master CV: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cv) {
      throw new Error('Failed to set master CV');
    }
    
    return result.data.cv;
  }

  /**
   * Duplicate a CV
   * Returns new CV in unified format - no transformation
   */
  static async duplicateCV(cvId: string, newTitle: string, userId: string): Promise<UnifiedCVDocument> {
    const response = await fetch('/api/cvs/duplicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvId,
        title: newTitle,
        userId
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to duplicate CV: ${response.status} ${errorText}`);
    }
    
    const result: UnifiedCVAPIResponse = await response.json();
    
    if (!result.success || !result.data?.cv) {
      throw new Error('Failed to duplicate CV');
    }
    
    return result.data.cv;
  }

  /**
   * Create a new CV with default data
   * Uses unified schema default structure
   */
  static async createDefaultCV(title: string, userId: string, templateId: string): Promise<UnifiedCVDocument> {
    return this.createCV({
      title,
      cvData: DEFAULT_UNIFIED_CV_DATA,
      templateId,
      status: 'draft',
      metadata: {
        isMaster: false,
        tags: [],
        isPublic: false,
        starred: false
      }
    }, userId);
  }

  /**
   * Validate CV data against unified schema
   */
  static validateCVData(data: any): boolean {
    return UnifiedCVMigration.validate(data);
  }

  /**
   * Migrate legacy data to unified schema
   * This is a temporary utility for migration
   */
  static migrateLegacyData(legacyData: any): UnifiedCVDataStructure {
    return UnifiedCVMigration.fromLegacyCVDataStructure(legacyData);
  }
}
