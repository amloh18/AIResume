import 'server-only';
import Job, { IJob } from '@/models/Job';
import { BaseRepository } from './base-repository';
import { FilterQuery, ClientSession } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Job Repository
 * 
 * Handles all Job model data access operations.
 * Extends BaseRepository with Job-specific queries.
 */
export class JobRepository extends BaseRepository<IJob> {
  constructor() {
    super(Job);
  }

  /**
   * Find all jobs for a user
   */
  async findByUserId(
    userId: string,
    options: {
      status?: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
      priority?: 'low' | 'medium' | 'high';
      source?: 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other';
      sort?: any;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<IJob[]> {
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    if (options.source) {
      filter.source = options.source;
    }

    return this.find(filter, {
      sort: options.sort || { createdAt: -1 },
      limit: options.limit,
      skip: options.skip,
      lean: true,
    });
  }

  /**
   * Find jobs by status (for Kanban board)
   */
  async findByStatus(
    userId: string,
    status: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn'
  ): Promise<IJob[]> {
    return this.find(
      {
        userId: new mongoose.Types.ObjectId(userId),
        status,
      } as FilterQuery<IJob>,
      {
        sort: { priority: -1, createdAt: -1 },
        lean: true,
      }
    );
  }

  /**
   * Find jobs with upcoming deadlines
   */
  async findUpcomingDeadlines(
    userId: string,
    daysAhead: number = 7
  ): Promise<IJob[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return this.find(
      {
        userId: new mongoose.Types.ObjectId(userId),
        deadline: {
          $gte: today,
          $lte: futureDate,
        },
        status: { $ne: 'rejected' },
      } as FilterQuery<IJob>,
      {
        sort: { deadline: 1 },
        lean: true,
      }
    );
  }

  /**
   * Find jobs by company
   */
  async findByCompany(
    userId: string,
    company: string
  ): Promise<IJob[]> {
    return this.find(
      {
        userId: new mongoose.Types.ObjectId(userId),
        company: { $regex: company, $options: 'i' },
      } as FilterQuery<IJob>,
      {
        sort: { createdAt: -1 },
        lean: true,
      }
    );
  }

  /**
   * Search jobs by title, company, or description
   */
  async searchJobs(
    userId: string,
    searchTerm: string,
    options: {
      status?: string;
      limit?: number;
    } = {}
  ): Promise<IJob[]> {
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { jobTitle: { $regex: searchTerm, $options: 'i' } },
        { company: { $regex: searchTerm, $options: 'i' } },
        { jobDescription: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    if (options.status) {
      filter.status = options.status;
    }

    return this.find(filter, {
      sort: { createdAt: -1 },
      limit: options.limit,
      lean: true,
    });
  }

  /**
   * Update job status and track history
   */
  async updateStatus(
    jobId: string,
    newStatus: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
    previousStatus?: string
  ): Promise<IJob | null> {
    const job = await this.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const statusHistoryEntry = {
      status: newStatus,
      changedAt: new Date(),
      previousStatus: previousStatus || job.status,
    };

    return this.updateById(jobId, {
      $set: {
        status: newStatus,
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: statusHistoryEntry,
      },
    } as any);
  }

  /**
   * Update job priority
   */
  async updatePriority(
    jobId: string,
    priority: 'low' | 'medium' | 'high'
  ): Promise<IJob | null> {
    return this.updateById(jobId, {
      $set: {
        priority,
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Add interview to job
   */
  async addInterview(
    jobId: string,
    interview: {
      type: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
      date: Date;
      duration?: number;
      interviewer?: string;
      notes?: string;
      outcome?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
      feedback?: string;
    }
  ): Promise<IJob | null> {
    return this.updateById(jobId, {
      $push: {
        interviews: {
          ...interview,
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Add follow-up to job
   */
  async addFollowUp(
    jobId: string,
    followUp: {
      date: Date;
      type: 'email' | 'phone' | 'linkedin' | 'other';
      description: string;
      outcome?: string;
    }
  ): Promise<IJob | null> {
    return this.updateById(jobId, {
      $push: {
        followUps: followUp,
      },
      $set: {
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Add contact to job
   */
  async addContact(
    jobId: string,
    contact: {
      name: string;
      role?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
    }
  ): Promise<IJob | null> {
    return this.updateById(jobId, {
      $push: {
        contacts: contact,
      },
      $set: {
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Add tag to job
   */
  async addTag(jobId: string, tag: string): Promise<IJob | null> {
    return this.updateById(jobId, {
      $addToSet: { tags: tag },
      $set: { updatedAt: new Date() },
    } as any);
  }

  /**
   * Remove tag from job
   */
  async removeTag(jobId: string, tag: string): Promise<IJob | null> {
    return this.updateById(jobId, {
      $pull: { tags: tag } as any,
      $set: { updatedAt: new Date() },
    } as any);
  }

  /**
   * Find jobs by tag
   */
  async findByTag(tag: string, userId?: string): Promise<IJob[]> {
    const filter: any = { tags: tag };
    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    return this.find(filter, {
      sort: { createdAt: -1 },
      lean: true,
    });
  }

  /**
   * Update ATS score and analysis
   */
  async updateATSAnalysis(
    jobId: string,
    analysis: {
      score: number;
      matchedKeywords: string[];
      missingKeywords: string[];
      suggestions: string[];
    }
  ): Promise<IJob | null> {
    return this.updateById(jobId, {
      $set: {
        atsScore: analysis.score,
        atsAnalysis: {
          matchedKeywords: analysis.matchedKeywords,
          missingKeywords: analysis.missingKeywords,
          suggestions: analysis.suggestions,
          analyzedAt: new Date(),
        },
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Add attachment to job
   */
  async addAttachment(
    jobId: string,
    attachment: {
      name: string;
      type: 'cv' | 'cover-letter' | 'certificate' | 'portfolio' | 'other';
      url: string;
      size: number;
    }
  ): Promise<IJob | null> {
    return this.updateById(jobId, {
      $push: {
        attachments: {
          ...attachment,
          uploadedAt: new Date(),
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Remove attachment from job
   */
  async removeAttachment(jobId: string, attachmentUrl: string): Promise<IJob | null> {
    return this.updateById(jobId, {
      $pull: {
        attachments: { url: attachmentUrl },
      } as any,
      $set: {
        updatedAt: new Date(),
      },
    } as any);
  }

  /**
   * Count jobs by status for a user
   */
  async countByStatus(
    userId: string
  ): Promise<Record<string, number>> {
    const jobs = await this.aggregate([
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
    jobs.forEach((item) => {
      counts[item._id] = item.count;
    });

    return counts;
  }

  /**
   * Get jobs with pagination
   */
  async findWithPaginationByUserId(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      sort?: any;
    } = {}
  ) {
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    return this.findWithPagination(filter, {
      page: options.page || 1,
      limit: options.limit || 10,
      sort: options.sort || { createdAt: -1 },
      lean: true,
    });
  }

  /**
   * Bulk update job status
   */
  async bulkUpdateStatus(
    jobIds: string[],
    status: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn',
    session?: ClientSession
  ): Promise<{ modifiedCount: number }> {
    return this.updateMany(
      { _id: { $in: jobIds } } as FilterQuery<IJob>,
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      } as any,
      { session }
    );
  }

  /**
   * Delete all jobs for a user (cascade delete)
   */
  async deleteAllByUserId(userId: string): Promise<{ deletedCount: number }> {
    return this.deleteMany({ userId: new mongoose.Types.ObjectId(userId) } as FilterQuery<IJob>);
  }

  /**
   * Find jobs by date range
   */
  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    field: 'applicationDate' | 'deadline' | 'createdAt' = 'createdAt'
  ): Promise<IJob[]> {
    return this.find(
      {
        userId: new mongoose.Types.ObjectId(userId),
        [field]: {
          $gte: startDate,
          $lte: endDate,
        },
      } as FilterQuery<IJob>,
      {
        sort: { [field]: 1 },
        lean: true,
      }
    );
  }
}

// Export singleton instance
export const jobRepository = new JobRepository();

