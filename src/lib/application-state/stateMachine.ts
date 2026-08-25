import Application, { CanonicalStage, InternalApplicationStatus } from '@/models/Application';
import ApplicationEvent, { ApplicationEventType } from '@/models/ApplicationEvent';

export interface StateTransitionRequest {
  applicationId: string;
  userId: string;
  targetStage: CanonicalStage;
  targetStatus: InternalApplicationStatus;
  eventType: ApplicationEventType;
  source: 'user' | 'automation_worker' | 'email_intelligence' | 'admin' | 'system';
  runId?: string;
  reason?: string;
  evidence?: Record<string, any>;
  metadata?: Record<string, any>;
}

const ALLOWED_STAGE_TRANSITIONS: Record<CanonicalStage, CanonicalStage[]> = {
  saved: ['staging', 'applied', 'rejected'],
  staging: ['saved', 'applied', 'rejected'],
  applied: ['interview', 'offer', 'rejected', 'staging'],
  interview: ['offer', 'rejected', 'applied'],
  offer: ['rejected', 'applied'],
  rejected: ['saved', 'staging', 'applied'],
};

export class ApplicationStateMachine {
  /**
   * Validates and performs a verified transition of an application's canonical stage
   */
  async transition(req: StateTransitionRequest): Promise<{ success: boolean; error?: string }> {
    const app = await Application.findById(req.applicationId);
    if (!app) {
      return { success: false, error: 'Application not found' };
    }

    const currentStage: CanonicalStage = app.currentStage;
    const allowed = ALLOWED_STAGE_TRANSITIONS[currentStage] || [];

    if (currentStage !== req.targetStage && !allowed.includes(req.targetStage)) {
      return {
        success: false,
        error: `Illegal state transition from "${currentStage}" to "${req.targetStage}"`,
      };
    }

    // Critical Verification Rule:
    // If transitioning to 'applied' via automation, verified evidence must be present
    if (req.targetStage === 'applied' && req.source === 'automation_worker') {
      if (!req.evidence?.confirmationId && !req.evidence?.confirmationUrl && !req.evidence?.confirmationText) {
        return {
          success: false,
          error: 'Application cannot be transitioned to "applied" without verified positive confirmation evidence.',
        };
      }
    }

    const previousStage = app.currentStage;
    const previousStatus = app.internalStatus;

    // 1. Update Application document
    app.currentStage = req.targetStage;
    app.internalStatus = req.targetStatus;
    if (req.evidence) {
      app.evidence = { ...(app.evidence || {}), ...req.evidence };
    }

    app.stageHistory.push({
      stage: req.targetStage,
      internalStatus: req.targetStatus,
      changedAt: new Date(),
      reason: req.reason,
      source: req.source as any,
    });

    await app.save();

    // 2. Emit Immutable ApplicationEvent
    await ApplicationEvent.create({
      applicationId: app._id,
      userId: app.userId,
      jobId: app.jobId,
      type: req.eventType,
      previousStage,
      newStage: req.targetStage,
      previousStatus,
      newStatus: req.targetStatus,
      source: req.source,
      runId: req.runId,
      metadata: {
        reason: req.reason,
        evidence: req.evidence,
        ...(req.metadata || {}),
      },
      createdAt: new Date(),
    });

    return { success: true };
  }
}

export const applicationStateMachine = new ApplicationStateMachine();
