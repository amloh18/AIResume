import { applicationStateMachine } from '../application-state/stateMachine';

export interface StagingInitOptions {
  applicationId: string;
  userId: string;
  jobId: string;
  generateCoverLetter?: boolean;
}

export class StagingCoordinator {
  /**
   * Initializes staging flow for a job: marks application in staging and prepares tailored CV & Letter
   */
  async prepareApplication(options: StagingInitOptions): Promise<{ success: boolean; message: string }> {
    const { applicationId, userId, jobId } = options;

    // 1. Move to staging stage
    const transitionRes = await applicationStateMachine.transition({
      applicationId,
      userId,
      targetStage: 'staging',
      targetStatus: 'staging_cv_generating',
      eventType: 'APPLICATION_STAGED',
      source: 'user',
      reason: 'User initialized application staging and document generation',
    });

    if (!transitionRes.success) {
      return { success: false, message: transitionRes.error || 'Failed to move to staging' };
    }

    return {
      success: true,
      message: 'Application moved to Staging. Document tailoring initiated.',
    };
  }
}

export const stagingCoordinator = new StagingCoordinator();
