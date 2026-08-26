import { Db } from 'mongodb';
import { applicationWatchdog, StuckApplicationReport } from './watchdog';
import { applicationStateMachine } from '../application-state/stateMachine';

export class ApplicationReconciliationWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(db: Db, intervalMs = 60 * 1000): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      await this.runReconciliationCycle(db);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runReconciliationCycle(db: Db): Promise<{ scanned: number; resolved: number }> {
    if (this.isRunning) return { scanned: 0, resolved: 0 };
    this.isRunning = true;

    try {
      const reports = await applicationWatchdog.scanForStuckApplications(db);
      if (reports.length === 0) return { scanned: 0, resolved: 0 };

      const emailsColl = db.collection('emailEvents');
      let resolvedCount = 0;

      for (const report of reports) {
        // Check if an inbound email receipt arrived for this application while it was stuck
        const emailReceipt = await emailsColl.findOne({
          applicationId: report.applicationId,
          classification: 'application_confirmation',
        });

        if (emailReceipt) {
          // Inbound email proved submission succeeded! Transition to applied with proof
          await applicationStateMachine.transition({
            applicationId: report.applicationId,
            userId: report.userId,
            targetStage: 'applied',
            targetStatus: 'applied',
            eventType: 'SUBMISSION_CONFIRMED',
            source: 'email_intelligence',
            reason: 'Watchdog reconciliation: Employer confirmation email detected.',
            evidence: {
              emailMessageId: emailReceipt.messageId,
              confirmationText: emailReceipt.subject,
              verificationConfidence: 0.98,
            },
          });
          resolvedCount++;
        } else {
          // No proof available: safely route to review_required
          await applicationStateMachine.transition({
            applicationId: report.applicationId,
            userId: report.userId,
            targetStage: 'staging',
            targetStatus: 'review_required',
            eventType: 'APPLICATION_REQUIRES_REVIEW',
            source: 'system',
            reason: report.reason,
          });
          resolvedCount++;
        }
      }

      return { scanned: reports.length, resolved: resolvedCount };
    } finally {
      this.isRunning = false;
    }
  }
}

export const applicationReconciliationWorker = new ApplicationReconciliationWorker();
