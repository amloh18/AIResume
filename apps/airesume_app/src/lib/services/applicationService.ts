import { ObjectId } from 'mongodb';
import type {
  Application,
  ApplicationStatus,
  AutomationMode,
} from '@/types/automation-schema';

export class ApplicationService {
  static async createApplication(
    userId: string,
    jobId: string,
    mode: AutomationMode
  ): Promise<Application> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const existingApp = await db.collection<Application>('applications').findOne({
        userId: new ObjectId(userId),
        jobId: new ObjectId(jobId),
      });

      if (existingApp) {
        throw new Error('Application already exists for this job');
      }

      const application: Application = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        jobId: new ObjectId(jobId),
        status: 'saved',
        mode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection<Application>('applications').insertOne(application);

      const auditService = await import('./auditService');
      await auditService.AuditService.logAction(
        userId,
        'application_created',
        jobId,
        { mode, status: 'saved' }
      );

      return application;
    } catch (error) {
      console.error('[ApplicationService] createApplication error:', error);
      throw error;
    }
  }

  static async updateApplicationStatus(
    appId: string,
    newStatus: ApplicationStatus,
    failureReason?: string
  ): Promise<Application> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const application = await db.collection<Application>('applications').findOne({
        _id: new ObjectId(appId),
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const isValidTransition = this.isValidStatusTransition(
        application.status,
        newStatus
      );

      if (!isValidTransition) {
        throw new Error(
          `Invalid status transition from ${application.status} to ${newStatus}`
        );
      }

      const updateData: Partial<Application> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'applied') {
        updateData.appliedAt = new Date();
      }

      if (newStatus === 'failed' && failureReason) {
        updateData.failureReason = failureReason;
      }

      await db.collection<Application>('applications').updateOne(
        { _id: new ObjectId(appId) },
        { $set: updateData }
      );

      const updatedApp = { ...application, ...updateData };

      const auditService = await import('./auditService');
      await auditService.AuditService.logAction(
        application.userId.toString(),
        'application_status_updated',
        appId,
        { oldStatus: application.status, newStatus, failureReason }
      );

      return updatedApp as Application;
    } catch (error) {
      console.error('[ApplicationService] updateApplicationStatus error:', error);
      throw error;
    }
  }

  private static isValidStatusTransition(
    currentStatus: ApplicationStatus,
    newStatus: ApplicationStatus
  ): boolean {
    const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      saved: ['created'],
      created: ['queued', 'failed'],
      queued: ['applying', 'failed'],
      applying: ['applied', 'failed'],
      applied: ['interview', 'rejected'],
      failed: [],
      interview: ['offer', 'rejected'],
      offer: [],
      rejected: [],
    };

    return transitions[currentStatus]?.includes(newStatus) || false;
  }

  static async getApplicationHistory(userId: string): Promise<Application[]> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const applications = await db
        .collection<Application>('applications')
        .find({ userId: new ObjectId(userId) })
        .sort({ createdAt: -1 })
        .toArray();

      return applications;
    } catch (error) {
      console.error('[ApplicationService] getApplicationHistory error:', error);
      throw error;
    }
  }

  static async getApplicationByJobId(
    userId: string,
    jobId: string
  ): Promise<Application | null> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const application = await db.collection<Application>('applications').findOne({
        userId: new ObjectId(userId),
        jobId: new ObjectId(jobId),
      });

      return application;
    } catch (error) {
      console.error('[ApplicationService] getApplicationByJobId error:', error);
      throw error;
    }
  }

  static async getTodayApplicationsCount(userId: string): Promise<number> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const count = await db.collection<Application>('applications').countDocuments({
        userId: new ObjectId(userId),
        createdAt: { $gte: today },
        status: { $in: ['queued', 'applying', 'applied'] },
      });

      return count;
    } catch (error) {
      console.error('[ApplicationService] getTodayApplicationsCount error:', error);
      throw error;
    }
  }

  static async getRecentFailuresCount(
    userId: string,
    hours: number = 24
  ): Promise<number> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const count = await db.collection<Application>('applications').countDocuments({
        userId: new ObjectId(userId),
        status: 'failed',
        createdAt: { $gte: cutoff },
      });

      return count;
    } catch (error) {
      console.error('[ApplicationService] getRecentFailuresCount error:', error);
      throw error;
    }
  }
}
