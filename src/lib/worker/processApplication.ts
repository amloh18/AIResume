import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';
import ApplicationEvent from '@/models/ApplicationEvent';
import User from '@/models/User';
import CV from '@/models/CV';
import { applicationStateMachine, type CanonicalStage, type InternalApplicationStatus } from '@/lib/application-state/stateMachine';
import { isPlaywrightAutomatable } from '@/lib/jobs/autoApplySupport';
import { log } from '@/lib/structured-logger';

export interface ProcessContext {
  queueItem: any;
  jobApplication: any;
}

export interface ProcessResult {
  success: boolean;
  stage: CanonicalStage;
  status: InternalApplicationStatus;
  message: string;
  evidence?: Record<string, any>;
}

/**
 * Processes a single application from the queue.
 * This is the core logic that runs inside the worker.
 *
 * Flow:
 * 1. Detect ATS and determine automation capability
 * 2. If automatable: launch Playwright, fill form, submit
 * 3. If not automatable or CAPTCHA detected: transition to review_required
 * 4. Always verify evidence before marking as 'applied'
 */
export async function processApplication(ctx: ProcessContext): Promise<ProcessResult> {
  const { queueItem, jobApplication } = ctx;
  const userId = String(jobApplication.userId);
  const applicationId = String(jobApplication._id);

  // 1. Transition to processing
  await applicationStateMachine.transition({
    applicationId,
    userId,
    targetStage: jobApplication.currentStage || 'saved',
    targetStatus: 'processing',
    eventType: 'status_update',
    source: 'automation_worker',
    // `reason` reaches a customer (as `reviewReason` and as the notification body) while
    // `operatorReason` does not — see SB-08 and `StateTransitionRequest`. Never put a technical
    // string in `reason`.
    reason: 'Your AI agent picked this up and started preparing your application.',
    operatorReason: 'Worker picked up application from queue',
    runId: queueItem._id?.toString(),
  });

  try {
    // 2. Get user and CV data
    const user = await User.findById(userId).lean() as any;
    if (!user) {
      return { success: false, stage: 'saved', status: 'automation_failed', message: 'User not found' };
    }

    const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();

    /*
      2b. Execution gate — decided by the decision engine and stored on the queue item.

      `manual` and `skip` must never reach Playwright. Until now the mode only affected queue
      *priority*, so a MANUAL application was picked up by the same worker and submitted exactly like
      an AUTO one — the auto/review/manual distinction existed in the engine and nowhere else.
      Queued items created before `mode` existed default to `review` (prepare + hold), never to
      automated submission.
    */
    const executionMode: 'auto' | 'review' | 'manual' | 'skip' =
      queueItem?.mode === 'auto' || queueItem?.mode === 'manual' || queueItem?.mode === 'skip'
        ? queueItem.mode
        : 'review';

    if (executionMode === 'manual' || executionMode === 'skip') {
      /*
        Split channel (SB-08). This reason is rendered verbatim by the tracker and copied into the
        user's notification, and the operator wording used to leak: the `skip` branch literally read
        `Decision engine returned "skip"…`, which reached customers and had to be caught after the
        fact by `sanitizeReason()`. The technical cause now travels in `operatorReason`.
      */
      const reason =
        executionMode === 'manual'
          ? 'This application is set to be applied for manually, so we have not submitted it. Apply on the employer\u2019s site, or approve automated submission to let your AI agent send it.'
          : 'We have not submitted this application. Apply on the employer\u2019s site to finish it.';
      const operatorReason =
        executionMode === 'manual'
          ? 'Execution mode is "manual": automation is not permitted for this application.'
          : 'Decision engine returned "skip": this application must not be automated.';

      await applicationStateMachine.transition({
        applicationId,
        userId,
        targetStage: 'staging',
        targetStatus: 'review_required',
        eventType: 'APPLICATION_REQUIRES_REVIEW',
        source: 'automation_worker',
        reason,
        operatorReason,
        runId: queueItem._id?.toString(),
      });

      return {
        success: true,
        stage: 'staging',
        status: 'review_required',
        message: reason,
      };
    }

    // 3. Determine ATS type and check automation capability
    const atsType = jobApplication.atsType || 'unknown';
    /*
      The gate reads the canonical list rather than a local array.

      It previously named `workday` inline while `UnifiedApplyService.apply` has no `case 'workday'`,
      so a Workday job cleared this gate and then fell through to `applyGeneric`, which returns
      "Review and submit on employer website" and never attempts a submission — a silent degradation
      with no signal anywhere (SB-04). `PLAYWRIGHT_AUTOMATABLE_ATS` is kept in step with the switch.
    */
    const isAutomatable = isPlaywrightAutomatable(atsType);

    if (!isAutomatable) {
      /*
        This reason is user-facing: `deriveApplicationStatusBadge` matches on it to pick the row's
        label and renders the raw string as hover text. Name the board so the halt is diagnosable, but
        keep operator vocabulary out (SB-08).
      */
      const reason =
        atsType === 'workday'
          ? 'Workday applications must be submitted on the employer site — automated submission is not supported for Workday yet.'
          : `Automated submission is not supported for this job board (${atsType}). Apply on the employer site.`;

      await applicationStateMachine.transition({
        applicationId,
        userId,
        targetStage: 'staging',
        targetStatus: 'review_required',
        eventType: 'APPLICATION_REQUIRES_REVIEW',
        source: 'automation_worker',
        reason,
      });

      return {
        success: true,
        stage: 'staging',
        status: 'review_required',
        message: reason,
      };
    }

    // 4. Check for CAPTCHA or anti-bot (pre-flight)
    await applicationStateMachine.transition({
      applicationId,
      userId,
      targetStage: jobApplication.currentStage || 'staging',
      targetStatus: 'form_detected',
      eventType: 'status_update',
      source: 'automation_worker',
      reason: 'We found the application form and are filling in your details.',
      operatorReason: `ATS ${atsType} detected. Playwright automation ready.`,
    });

    // 5. Attempt Playwright automation via UnifiedApplyService
    //    (the execution mode travels through so `review` prepares without submitting)
    const { UnifiedApplyService } = await import('@/lib/services/unifiedApplyService');
    const applyResult = await UnifiedApplyService.apply(userId, {
      jobId: jobApplication.jobId || jobApplication._id.toString(),
      title: jobApplication.jobTitle,
      company: jobApplication.company,
      description: jobApplication.jobDescription || '',
      location: jobApplication.location,
      salary: jobApplication.salary,
      jobUrl: jobApplication.jobUrl || '',
      atsType: atsType as any,
      source: jobApplication.source || 'auto_apply',
      screeningQuestions: [],
    }, { mode: executionMode });

    // 6. Process result
    if (applyResult.status === 'applied') {
      // CRITICAL: Only mark as applied if evidence is present
      if (!applyResult.confirmationId && !applyResult.confirmationUrl) {
        // No evidence — route to review
        await applicationStateMachine.transition({
          applicationId,
          userId,
          targetStage: 'staging',
          targetStatus: 'review_required',
          eventType: 'APPLICATION_REQUIRES_REVIEW',
          source: 'automation_worker',
          reason: 'Application submitted but no confirmation evidence captured. Needs manual verification.',
        });

        return {
          success: true,
          stage: 'staging',
          status: 'review_required',
          message: 'Submitted but unverified — moved to review',
        };
      }

      // Verified submission
      await applicationStateMachine.transition({
        applicationId,
        userId,
        targetStage: 'applied',
        targetStatus: 'applied',
        eventType: 'SUBMISSION_CONFIRMED',
        source: 'automation_worker',
        reason: 'Your application was submitted successfully.',
        operatorReason: `Successfully submitted via ${atsType}`,
        evidence: {
          confirmationId: applyResult.confirmationId,
          confirmationUrl: applyResult.confirmationUrl,
          capturedAt: new Date(),
          verificationConfidence: 0.95,
        },
      });

      // Update JobApplication legacy fields
      await JobApplication.findByIdAndUpdate(applicationId, {
        appliedAt: new Date(),
        applicationDate: new Date(),
      });

      return {
        success: true,
        stage: 'applied',
        status: 'applied',
        message: applyResult.message,
        evidence: {
          confirmationId: applyResult.confirmationId,
          confirmationUrl: applyResult.confirmationUrl,
        },
      };
    }

    if (applyResult.status === 'action_required') {
      // CAPTCHA, an unrecognised form, or a Playwright failure. `applyResult.message` is already
      // customer-safe (see `automationUnavailable`); the raw technical string travels in
      // `operatorDetail` and goes to `operatorReason`, never to the customer (SB-08).
      await applicationStateMachine.transition({
        applicationId,
        userId,
        targetStage: 'staging',
        targetStatus: 'review_required',
        eventType: 'APPLICATION_REQUIRES_REVIEW',
        source: 'automation_worker',
        reason: applyResult.message,
        operatorReason: applyResult.operatorDetail,
      });

      return {
        success: true,
        stage: 'staging',
        status: 'review_required',
        message: applyResult.message,
      };
    }

    // Failed.
    // Both `reason` and the returned `message` are customer-facing — the worker copies `message`
    // straight into the user's notification body — so neither may carry the raw failure string.
    const failedMessage =
      'We could not submit this application automatically. Please apply on the employer\u2019s site.';

    await applicationStateMachine.transition({
      applicationId,
      userId,
      targetStage: jobApplication.currentStage || 'saved',
      targetStatus: 'automation_failed',
      eventType: 'status_update',
      source: 'automation_worker',
      reason: failedMessage,
      operatorReason: applyResult.operatorDetail || applyResult.message,
    });

    return {
      success: false,
      stage: (jobApplication.currentStage as CanonicalStage) || 'saved',
      status: 'automation_failed',
      message: failedMessage,
    };

  } catch (err: any) {
    log.error(`[ApplicationWorker] Error processing ${applicationId}:`, err.message);

    const erroredMessage =
      'Something went wrong while preparing this application. Please apply on the employer\u2019s site.';

    // Transition to failed state
    await applicationStateMachine.transition({
      applicationId,
      userId,
      targetStage: jobApplication.currentStage || 'saved',
      targetStatus: 'automation_failed',
      eventType: 'status_update',
      source: 'automation_worker',
      reason: erroredMessage,
      operatorReason: `Worker error: ${err.message}`,
    }).catch(() => {}); // Best-effort

    return {
      success: false,
      stage: (jobApplication.currentStage as CanonicalStage) || 'saved',
      status: 'automation_failed',
      // `err.message` used to be returned here, and the worker turns the returned message into the
      // notification the user reads.
      message: erroredMessage,
    };
  }
}
