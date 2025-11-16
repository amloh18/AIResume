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
  DEFAULT_UNIFIED_CV_DATA
} from '@/types/unified-cv-schema';
import { validateCVData, cleanupSummaryFields } from '@/lib/data-adapters/cv-data-adapter';
import { authenticatedFetch } from '@/lib/utils/apiUtils';

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
    
    const response = await authenticatedFetch(`${url}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch CV: ${response.status} ${errorText}`);
    }
    
    // Get response text once and check if it's empty
    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from server');
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid response format. Expected JSON, got: ${contentType || 'empty'}. Response: ${responseText.substring(0, 100)}`);
    }
    
    let result: UnifiedCVAPIResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ UnifiedCVService.getCV - JSON parse error:', parseError);
      console.error('❌ UnifiedCVService.getCV - Response text:', responseText.substring(0, 200));
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    if (!result.success || !result.data?.cv) {
      throw new Error('CV not found or access denied');
    }
    
    // Clean up summary fields to remove highlights that were incorrectly appended
    if (result.data.cv.cvData) {
      result.data.cv.cvData = cleanupSummaryFields(result.data.cv.cvData);
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
    
    const response = await authenticatedFetch(`/api/cvs?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch CVs: ${response.status} ${errorText}`);
    }
    
    // Get response text once and check if it's empty
    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from server');
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid response format. Expected JSON, got: ${contentType || 'empty'}. Response: ${responseText.substring(0, 100)}`);
    }
    
    let result: UnifiedCVAPIResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ UnifiedCVService.getCVs - JSON parse error:', parseError);
      console.error('❌ UnifiedCVService.getCVs - Response text:', responseText.substring(0, 200));
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    if (!result.success || !result.data?.cvs) {
      throw new Error('Failed to fetch CVs');
    }
    
    // Clean up summary fields for CVs that have full cvData (not summary projection)
    const cleanedCVs = result.data.cvs.map(cv => {
      if (cv.cvData) {
        cv.cvData = cleanupSummaryFields(cv.cvData);
      }
      return cv;
    });
    
    return cleanedCVs;
  }

  /**
   * Create a new CV
   * Accepts unified format - no transformation
   */
  static async createCV(cvData: UnifiedCVRequest, userId: string): Promise<UnifiedCVDocument> {
    const response = await authenticatedFetch('/api/cvs', {
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
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }
    
    const result: any = await response.json();
    
    // Handle both response formats:
    // 1. { success: true, data: { cv: {...} } } - Unified format
    // 2. { success: true, cv: {...} } - Direct format (from POST /api/cvs)
    if (!result.success) {
      throw new Error(result.error || 'Failed to create CV');
    }
    
    const cv = result.data?.cv || result.cv;
    if (!cv) {
      throw new Error('Failed to create CV: No CV data in response');
    }
    
    return cv;
  }

  /**
   * Update an existing CV
   * Accepts unified format - no transformation
   * Includes updatedAt for conflict detection
   */
  static async updateCV(
    cvId: string, 
    cvData: Partial<UnifiedCVRequest> & { updatedAt?: string | Date }, 
    userId?: string
  ): Promise<UnifiedCVDocument> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    // Include updatedAt if provided (for conflict detection)
    const updatePayload = {
      ...cvData,
      updatedAt: cvData.updatedAt ? (typeof cvData.updatedAt === 'string' ? cvData.updatedAt : cvData.updatedAt.toISOString()) : undefined
    };
    
    const response = await authenticatedFetch(`/api/cvs/${cvId}?${params.toString()}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
    
    // Check for conflict (409 status)
    if (response.status === 409) {
      const conflictData = await response.json();
      if (conflictData.conflict) {
        const conflictError: any = new Error(conflictData.message || 'Conflict detected');
        conflictError.conflict = true;
        conflictError.serverVersion = conflictData.serverVersion;
        conflictError.clientVersion = conflictData.clientVersion;
        throw conflictError;
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update CV: ${response.status} ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format from server');
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
    
    const response = await authenticatedFetch(`/api/cvs/${cvId}?${params.toString()}`, {
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
    const response = await authenticatedFetch(`/api/cvs/master?userId=${userId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch master CV: ${response.status} ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format from server');
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
    const response = await authenticatedFetch('/api/cvs/set-master', {
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
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format from server');
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
    const response = await authenticatedFetch('/api/cvs/duplicate', {
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
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format from server');
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
    try {
      // Basic structure validation
      return (
        data &&
        typeof data === 'object' &&
        data.basics &&
        Array.isArray(data.work) &&
        Array.isArray(data.education) &&
        Array.isArray(data.skills) &&
        Array.isArray(data.projects) &&
        Array.isArray(data.certificates) &&
        Array.isArray(data.languages)
      );
    } catch {
      return false;
    }
  }

  /**
   * Migrate legacy data to unified schema
   * This is a temporary utility for migration
   */
  static migrateLegacyData(legacyData: any): UnifiedCVDataStructure {
    // Direct mapping since the structure is already compatible
    return {
      basics: legacyData.basics || DEFAULT_UNIFIED_CV_DATA.basics,
      work: legacyData.work || [],
      volunteer: legacyData.volunteer || [],
      education: legacyData.education || [],
      awards: legacyData.awards || [],
      certificates: legacyData.certificates || [],
      publications: legacyData.publications || [],
      skills: legacyData.skills || [],
      languages: legacyData.languages || [],
      interests: legacyData.interests || [],
      references: legacyData.references || [],
      projects: legacyData.projects || []
    };
  }
}
