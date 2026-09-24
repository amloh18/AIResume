import { Db } from 'mongodb';
import { applicationWatchdog } from './watchdog';
import { applicationStateMachine } from '../application-state/stateMachine';
import { AutoApplyQuotaService } from '@/lib/services/autoApplyQuotaService';
import { log } from '@/lib/structured-logger';

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

  async runReconciliationCycle(db: Db): Promise<{ scanned: number; resolved: number; releasedReservations: number }> {
    if (this.isRunning) return { scanned: 0, resolved: 0, releasedReservations: 0 };
    this.isRunning = true;

    try {
      // Recover abandoned Auto-Apply reservations (stuck in 'reserved' for >30 min)
      let releasedReservations = 0;
      try {
        releasedReservations = await AutoApplyQuotaService.recoverAbandoned();
        if (releasedReservations > 0) {
          log.info(`[Reconciliation] Released ${releasedReservations} abandoned Auto-Apply reservations`);
        }
      } catch (err: any) {
        log.error('[Reconciliation] Failed to recover abandoned reservations:', err?.message);
      }

      const reports = await applicationWatchdog.scanForStuckApplications(db);
      if (reports.length === 0) return { scanned: 0, resolved: 0, releasedReservations };

      /*
        Inbound employer mail lives in `communications` (written by `emailIngestionService` from the
        Stalwart JMAP feed), classified as APPLICATION_ACKNOWLEDGEMENT / INTERVIEW_INVITATION / etc.

        This used to read a collection named `emailEvents` for `classification: 'application_confirmation'`
        — neither the collection nor that classification value is written anywhere, so the "employer
        confirmation proved the submission" branch was unreachable and every stuck application fell
        through to review_required. It now reads the store that actually exists.
      */
      const emailsColl = db.collection('communications');
      let resolvedCount = 0;

      for (const report of reports) {
        // Any inbound employer reply matched to this application proves the submission landed.
        const emailReceipt = await emailsColl.findOne({
          applicationId: { $in: [report.applicationId, String(report.applicationId)] },
          direction: 'inbound',
        });

        if (emailReceipt) {
          // Inbound email proved submission succeeded! Transition to applied with proof
          const result = await applicationStateMachine.transition({
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
          if (result.success) resolvedCount++;
        } else {
          // No proof available: safely route to review_required
          const result = await applicationStateMachine.transition({
            applicationId: report.applicationId,
            userId: report.userId,
            targetStage: 'staging',
            targetStatus: 'review_required',
            eventType: 'APPLICATION_REQUIRES_REVIEW',
            source: 'system',
            reason: report.reason,
          });
          if (result.success) resolvedCount++;
        }
      }

      return { scanned: reports.length, resolved: resolvedCount, releasedReservations };
    } finally {
      this.isRunning = false;
    }
  }
}

export const applicationReconciliationWorker = new ApplicationReconciliationWorker();
