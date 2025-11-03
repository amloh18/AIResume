import 'server-only';
import CV, { ICV } from '@/models/CV';
import { BaseRepository } from './base-repository';
import { FilterQuery, ClientSession } from 'mongoose';
import mongoose from 'mongoose';

/**
 * CV Repository
 * 
 * Handles all CV model data access operations.
 * Extends BaseRepository with CV-specific queries.
 */
export class CVRepository extends BaseRepository<ICV> {
  constructor() {
    super(CV);
  }

  /**
   * Find all CVs for a user
   */
  async findByUserId(
    userId: string,
    options: {
      status?: 'draft' | 'published' | 'archived';
      isMaster?: boolean;
      starred?: boolean;
      sort?: any;
      limit?: number;
    } = {}
  ): Promise<ICV[]> {
    const filter: any = { userId };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.isMaster !== undefined) {
      filter['metadata.isMaster'] = options.isMaster;
    }

    if (options.starred !== undefined) {
      filter['metadata.starred'] = options.starred;
    }

    return this.find(filter, {
      sort: options.sort || { createdAt: -1 },
      limit: options.limit,
      lean: true,
    });
  }

  /**
   * Get user's master CV
   */
  async findMasterCV(userId: string): Promise<ICV | null> {
    return this.findOne(
      {
        userId,
        'metadata.isMaster': true,
      } as FilterQuery<ICV>,
      { lean: true }
    );
  }

  /**
   * Set a CV as master (unsets any existing master)
   * Uses transaction to ensure atomicity
   */
  async setMasterCV(cvId: string, userId: string): Promise<ICV> {
    return this.withTransaction(async (session) => {
      // First, unset any existing master CV for this user
      await this.updateMany(
        {
          userId,
          'metadata.isMaster': true,
          _id: { $ne: cvId },
        } as FilterQuery<ICV>,
        {
          $set: { 'metadata.isMaster': false },
        } as any,
        { session }
      );

      // Then set the new master
      const cv = await this.updateById(
        cvId,
        { $set: { 'metadata.isMaster': true } } as any,
        { session }
      );

      if (!cv) {
        throw new Error('CV not found');
      }

      return cv;
    });
  }

  /**
   * Duplicate a CV
   */
  async duplicateCV(
    cvId: string,
    newTitle: string,
    userId: string
  ): Promise<ICV> {
    const originalCV = await this.findById(cvId);
    if (!originalCV) {
      throw new Error('CV not found');
    }

    // Create new CV from original, excluding ID and metadata
    const cvObject = originalCV.toObject();

    return this.create({
      ...cvObject,
      _id: undefined,
      title: newTitle,
      userId: new mongoose.Types.ObjectId(userId),
      status: 'draft',
      metadata: {
        ...cvObject.metadata,
        isMaster: false,
        createdFrom: originalCV._id,
        lastModified: new Date(),
        viewCount: 0,
        downloadCount: 0,
        thumbnailUrl: undefined,
        thumbnailGeneratedAt: undefined,
      },
    } as Partial<ICV>);
  }

  /**
   * Update CV content
   */
  async updateCVData(cvId: string, cvData: any): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        cvData,
        'metadata.lastModified': new Date(),
      },
    } as any);
  }

  /**
   * Update CV template
   */
  async updateTemplate(
    cvId: string,
    templateId: string
  ): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        templateId,
        'metadata.lastModified': new Date(),
      },
    } as any);
  }

  /**
   * Update CV status
   */
  async updateStatus(
    cvId: string,
    status: 'draft' | 'published' | 'archived'
  ): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        status,
        'metadata.lastModified': new Date(),
      },
    } as any);
  }

  /**
   * Star/unstar a CV
   */
  async toggleStar(cvId: string, starred: boolean): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        'metadata.starred': starred,
        'metadata.lastModified': new Date(),
      },
    } as any);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(cvId: string): Promise<ICV | null> {
    return this.updateById(cvId, {
      $inc: { 'metadata.viewCount': 1 },
    } as any);
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(cvId: string): Promise<ICV | null> {
    return this.updateById(cvId, {
      $inc: { 'metadata.downloadCount': 1 },
    } as any);
  }

  /**
   * Update ATS score
   */
  async updateATSScore(cvId: string, score: number): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        'metadata.atsScore': score,
        'metadata.atsScoreDate': new Date(),
        'metadata.lastModified': new Date(),
      },
    } as any);
  }

  /**
   * Update thumbnail URL
   */
  async updateThumbnail(cvId: string, thumbnailUrl: string): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        'metadata.thumbnailUrl': thumbnailUrl,
        'metadata.thumbnailGeneratedAt': new Date(),
      },
    } as any);
  }

  /**
   * Add tag to CV
   */
  async addTag(cvId: string, tag: string): Promise<ICV | null> {
    return this.updateById(cvId, {
      $addToSet: { 'metadata.tags': tag },
      $set: { 'metadata.lastModified': new Date() },
    } as any);
  }

  /**
   * Remove tag from CV
   */
  async removeTag(cvId: string, tag: string): Promise<ICV | null> {
    return this.updateById(cvId, {
      $pull: { 'metadata.tags': tag } as any,
      $set: { 'metadata.lastModified': new Date() },
    } as any);
  }

  /**
   * Find CVs by tag
   */
  async findByTag(tag: string, userId?: string): Promise<ICV[]> {
    const filter: any = { 'metadata.tags': tag };
    if (userId) {
      filter.userId = userId;
    }

    return this.find(filter, { lean: true });
  }

  /**
   * Find public CVs
   */
  async findPublicCVs(limit: number = 10): Promise<ICV[]> {
    return this.find(
      { 'metadata.isPublic': true } as FilterQuery<ICV>,
      {
        sort: { 'metadata.lastModified': -1 },
        limit,
        lean: true,
      }
    );
  }

  /**
   * Count CVs by user
   */
  async countByUserId(userId: string): Promise<number> {
    return this.count({ userId } as FilterQuery<ICV>);
  }

  /**
   * Find CVs created from a template
   */
  async findByTemplate(templateId: string): Promise<ICV[]> {
    return this.find(
      { templateId } as FilterQuery<ICV>,
      { lean: true }
    );
  }

  /**
   * Bulk update CV status
   */
  async bulkUpdateStatus(
    cvIds: string[],
    status: 'draft' | 'published' | 'archived',
    session?: ClientSession
  ): Promise<{ modifiedCount: number }> {
    return this.updateMany(
      { _id: { $in: cvIds } } as FilterQuery<ICV>,
      {
        $set: {
          status,
          'metadata.lastModified': new Date(),
        },
      } as any,
      { session }
    );
  }

  /**
   * Delete all CVs for a user (cascade delete)
   */
  async deleteAllByUserId(userId: string): Promise<{ deletedCount: number }> {
    return this.deleteMany({ userId } as FilterQuery<ICV>);
  }

  /**
   * Store AI analysis for a CV
   */
  async storeAIAnalysis(cvId: string, analysis: any): Promise<ICV | null> {
    return this.updateById(cvId, {
      $set: {
        'metadata.aiAnalysis': analysis,
        'metadata.lastModified': new Date(),
      },
    } as any);
  }
}

// Export singleton instance
export const cvRepository = new CVRepository();