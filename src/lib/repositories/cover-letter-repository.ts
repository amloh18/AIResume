import 'server-only';
import CoverLetter, { ICoverLetter } from '@/models/CoverLetter';
import { BaseRepository } from './base-repository';
import { FilterQuery, ClientSession } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Cover Letter Repository
 * 
 * Handles all CoverLetter model data access operations.
 * Extends BaseRepository with CoverLetter-specific queries.
 */
export class CoverLetterRepository extends BaseRepository<ICoverLetter> {
  constructor() {
    super(CoverLetter);
  }

  /**
   * Find all cover letters for a user
   */
  async findByUserId(
    userId: string,
    options: {
      status?: 'draft' | 'published' | 'archived';
      jobId?: string;
      cvId?: string;
      sort?: any;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<ICoverLetter[]> {
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.jobId) {
      filter.jobId = new mongoose.Types.ObjectId(options.jobId);
    }

    if (options.cvId) {
      filter.cvId = new mongoose.Types.ObjectId(options.cvId);
    }

    return this.find(filter, {
      sort: options.sort || { 'metadata.lastModified': -1 },
      limit: options.limit,
      skip: options.skip,
      lean: true,
    });
  }

  /**
   * Find cover letter by job ID
   */
  async findByJobId(jobId: string): Promise<ICoverLetter[]> {
    return this.find(
      { jobId: new mongoose.Types.ObjectId(jobId) } as FilterQuery<ICoverLetter>,
      {
        sort: { 'metadata.lastModified': -1 },
        lean: true,
      }
    );
  }

  /**
   * Find cover letter by CV ID
   */
  async findByCVId(cvId: string): Promise<ICoverLetter[]> {
    return this.find(
      { cvId: new mongoose.Types.ObjectId(cvId) } as FilterQuery<ICoverLetter>,
      {
        sort: { 'metadata.lastModified': -1 },
        lean: true,
      }
    );
  }

  /**
   * Search cover letters by title, content, or metadata
   */
  async searchCoverLetters(
    userId: string,
    searchTerm: string,
    options: {
      status?: 'draft' | 'published' | 'archived';
      limit?: number;
    } = {}
  ): Promise<ICoverLetter[]> {
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } },
        { 'metadata.targetCompany': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.targetPosition': { $regex: searchTerm, $options: 'i' } },
      ],
    };

    if (options.status) {
      filter.status = options.status;
    }

    return this.find(filter, {
      sort: { 'metadata.lastModified': -1 },
      limit: options.limit,
      lean: true,
    });
  }

  /**
   * Update cover letter status
   */
  async updateStatus(
    coverLetterId: string,
    status: 'draft' | 'published' | 'archived'
  ): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $set: {
        status,
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Update cover letter content
   */
  async updateContent(
    coverLetterId: string,
    content: string
  ): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $set: {
        content,
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Update cover letter title
   */
  async updateTitle(
    coverLetterId: string,
    title: string
  ): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $set: {
        title,
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Update cover letter metadata
   */
  async updateMetadata(
    coverLetterId: string,
    metadata: {
      targetCompany?: string;
      targetPosition?: string;
      keywords?: string[];
      isPublic?: boolean;
      version?: number;
    }
  ): Promise<ICoverLetter | null> {
    const updateData: any = {
      'metadata.lastModified': new Date(),
      updatedAt: new Date(),
    };

    if (metadata.targetCompany !== undefined) {
      updateData['metadata.targetCompany'] = metadata.targetCompany;
    }
    if (metadata.targetPosition !== undefined) {
      updateData['metadata.targetPosition'] = metadata.targetPosition;
    }
    if (metadata.keywords !== undefined) {
      updateData['metadata.keywords'] = metadata.keywords;
    }
    if (metadata.isPublic !== undefined) {
      updateData['metadata.isPublic'] = metadata.isPublic;
    }
    if (metadata.version !== undefined) {
      updateData['metadata.version'] = metadata.version;
    }

    return this.updateById(coverLetterId, {
      $set: updateData,
    } as any);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(coverLetterId: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $inc: { 'metadata.viewCount': 1 },
    } as any);
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(coverLetterId: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $inc: { 'metadata.downloadCount': 1 },
    } as any);
  }

  /**
   * Update ATS score
   */
  async updateATSScore(
    coverLetterId: string,
    score: number
  ): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $set: {
        'metadata.atsScore': score,
        'metadata.atsScoreDate': new Date(),
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Add tag to cover letter
   */
  async addTag(coverLetterId: string, tag: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $addToSet: { 'metadata.tags': tag },
      $set: {
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Remove tag from cover letter
   */
  async removeTag(coverLetterId: string, tag: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $pull: { 'metadata.tags': tag } as any,
      $set: {
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Find cover letters by tag
   */
  async findByTag(tag: string, userId?: string): Promise<ICoverLetter[]> {
    const filter: any = { 'metadata.tags': tag };
    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    return this.find(filter, {
      sort: { 'metadata.lastModified': -1 },
      lean: true,
    });
  }

  /**
   * Find public cover letters
   */
  async findPublicCoverLetters(limit: number = 10): Promise<ICoverLetter[]> {
    return this.find(
      { 'metadata.isPublic': true } as FilterQuery<ICoverLetter>,
      {
        sort: { 'metadata.lastModified': -1 },
        limit,
        lean: true,
      }
    );
  }

  /**
   * Duplicate a cover letter
   */
  async duplicateCoverLetter(
    coverLetterId: string,
    newTitle: string,
    userId: string,
    options?: {
      jobId?: string;
      cvId?: string;
    }
  ): Promise<ICoverLetter> {
    const originalCoverLetter = await this.findById(coverLetterId);
    if (!originalCoverLetter) {
      throw new Error('Cover letter not found');
    }

    // Create new cover letter from original, excluding ID and metadata
    const coverLetterObject = originalCoverLetter.toObject();

    return this.create({
      ...coverLetterObject,
      _id: undefined,
      title: newTitle,
      userId: new mongoose.Types.ObjectId(userId),
      status: 'draft',
      jobId: options?.jobId ? new mongoose.Types.ObjectId(options.jobId) : originalCoverLetter.jobId,
      cvId: options?.cvId ? new mongoose.Types.ObjectId(options.cvId) : originalCoverLetter.cvId,
      metadata: {
        ...coverLetterObject.metadata,
        lastModified: new Date(),
        wordCount: 0,
        characterCount: 0,
        estimatedReadingTime: 0,
        viewCount: 0,
        downloadCount: 0,
        version: 1,
        atsScore: undefined,
        atsScoreDate: undefined,
      },
    } as Partial<ICoverLetter>);
  }

  /**
   * Count cover letters by status for a user
   */
  async countByStatus(userId: string): Promise<Record<string, number>> {
    const coverLetters = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: Record<string, number> = {};
    coverLetters.forEach((item) => {
      counts[item._id] = item.count;
    });

    return counts;
  }

  /**
   * Get cover letters with pagination
   */
  async findWithPaginationByUserId(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: 'draft' | 'published' | 'archived';
      sort?: any;
    } = {}
  ) {
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (options.status) {
      filter.status = options.status;
    }

    return this.findWithPagination(filter, {
      page: options.page || 1,
      limit: options.limit || 10,
      sort: options.sort || { 'metadata.lastModified': -1 },
      lean: true,
    });
  }

  /**
   * Bulk update cover letter status
   */
  async bulkUpdateStatus(
    coverLetterIds: string[],
    status: 'draft' | 'published' | 'archived',
    session?: ClientSession
  ): Promise<{ modifiedCount: number }> {
    return this.updateMany(
      { _id: { $in: coverLetterIds } } as FilterQuery<ICoverLetter>,
      {
        $set: {
          status,
          'metadata.lastModified': new Date(),
          updatedAt: new Date(),
        },
      } as any,
      { session }
    );
  }

  /**
   * Delete all cover letters for a user (cascade delete)
   */
  async deleteAllByUserId(userId: string): Promise<{ deletedCount: number }> {
    return this.deleteMany({ userId: new mongoose.Types.ObjectId(userId) } as FilterQuery<ICoverLetter>);
  }

  /**
   * Find cover letters by date range
   */
  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    field: 'createdAt' | 'updatedAt' = 'createdAt'
  ): Promise<ICoverLetter[]> {
    return this.find(
      {
        userId: new mongoose.Types.ObjectId(userId),
        [field]: {
          $gte: startDate,
          $lte: endDate,
        },
      } as FilterQuery<ICoverLetter>,
      {
        sort: { [field]: 1 },
        lean: true,
      }
    );
  }

  /**
   * Update version number (increment)
   */
  async incrementVersion(coverLetterId: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $inc: { 'metadata.version': 1 },
      $set: {
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Link cover letter to job
   */
  async linkToJob(coverLetterId: string, jobId: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $set: {
        jobId: new mongoose.Types.ObjectId(jobId),
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Link cover letter to CV
   */
  async linkToCV(coverLetterId: string, cvId: string): Promise<ICoverLetter | null> {
    return this.updateById(coverLetterId, {
      $set: {
        cvId: new mongoose.Types.ObjectId(cvId),
        'metadata.lastModified': new Date(),
        updatedAt: new Date(),
      },
    } as any);
  }
}

// Export singleton instance
export const coverLetterRepository = new CoverLetterRepository();

