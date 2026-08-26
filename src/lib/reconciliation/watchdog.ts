import { Db } from 'mongodb';
import { applicationStateMachine } from '../application-state/stateMachine';

export interface StuckApplicationReport {
  applicationId: string;
  userId: string;
  jobId: string;
  currentStatus: string;
  stuckDurationMinutes: number;
  recommendedAction: 'reconcile_external' | 'route_review_required' | 'retry_transient' | 'investigate';
  reason: string;
}

export interface WatchdogConfig {
  maxQueuedMinutes: number;
  maxProcessingMinutes: number;
  maxSubmittingMinutes: number;
  maxVerificationMinutes: number;
}

export const DEFAULT_WATCHDOG_CONFIG: WatchdogConfig = {
  maxQueuedMinutes: 30,
  maxProcessingMinutes: 15,
  maxSubmittingMinutes: 5,
  maxVerificationMinutes: 5,
};

export class ApplicationWatchdog {
  /**
   * Scans for stuck or orphaned application runs and flags or recovers them
   */
  async scanForStuckApplications(
    db: Db,
    config = DEFAULT_WATCHDOG_CONFIG
  ): Promise<StuckApplicationReport[]> {
    const appsColl = db.collection('applications');
    const now = new Date();
    const reports: StuckApplicationReport[] = [];

    // 1. Stuck in 'submitting' or 'verification' > 5 mins (CRITICAL CRASH DANGER)
    const submittingThreshold = new Date(now.getTime() - config.maxSubmittingMinutes * 60 * 1000);
    const stuckSubmitting = await appsColl
      .find({
        internalStatus: { $in: ['submitting', 'verification'] },
        updatedAt: { $lt: submittingThreshold },
      })
      .toArray();

    for (const app of stuckSubmitting) {
      const durationMins = Math.round((now.getTime() - new Date(app.updatedAt).getTime()) / 60000);
      reports.push({
        applicationId: String(app._id),
        userId: String(app.userId),
        jobId: String(app.jobId),
        currentStatus: app.internalStatus,
        stuckDurationMinutes: durationMins,
        recommendedAction: 'route_review_required',
        reason: `Worker submitted or began verification ${durationMins}m ago without completing. Browser/worker likely crashed. Route to manual review to prevent duplicate submission.`,
      });
    }

    // 2. Stuck in 'processing' > 15 mins
    const processingThreshold = new Date(now.getTime() - config.maxProcessingMinutes * 60 * 1000);
    const stuckProcessing = await appsColl
      .find({
        internalStatus: 'processing',
        updatedAt: { $lt: processingThreshold },
      })
      .toArray();

    for (const app of stuckProcessing) {
      const durationMins = Math.round((now.getTime() - new Date(app.updatedAt).getTime()) / 60000);
      reports.push({
        applicationId: String(app._id),
        userId: String(app.userId),
        jobId: String(app.jobId),
        currentStatus: app.internalStatus,
        stuckDurationMinutes: durationMins,
        recommendedAction: 'retry_transient',
        reason: `Application has been processing for ${durationMins}m. Form navigation may have hung before submission.`,
      });
    }

    return reports;
  }

  /**
   * Automatically resolves stuck applications to maintain state consistency
   */
  async autoRecoverStuckApplications(db: Db, reports: StuckApplicationReport[]): Promise<number> {
    let recoveredCount = 0;

    for (const report of reports) {
      if (report.recommendedAction === 'route_review_required') {
        // Safe exit: never auto-retry a job that was already in submitting state
        await applicationStateMachine.transition({
          applicationId: report.applicationId,
          userId: report.userId,
          targetStage: 'staging',
          targetStatus: 'review_required',
          eventType: 'APPLICATION_REQUIRES_REVIEW',
          source: 'system',
          reason: `Watchdog auto-recovery: ${report.reason}`,
        });
        recoveredCount++;
      }
    }

    return recoveredCount;
  }
}

export const applicationWatchdog = new ApplicationWatchdog();
