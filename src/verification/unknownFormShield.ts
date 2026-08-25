import { applicationStateMachine } from '@/lib/application-state/stateMachine';

export interface UnknownFormRoutingOptions {
  applicationId: string;
  userId: string;
  url: string;
  reason: string;
  formDetails?: Record<string, any>;
}

export class UnknownFormShield {
  /**
   * Safe router for ambiguous or unsupported application flows
   * Immediately marks application as review_required / automation_unknown
   */
  async routeToManualReview(options: UnknownFormRoutingOptions): Promise<void> {
    await applicationStateMachine.transition({
      applicationId: options.applicationId,
      userId: options.userId,
      targetStage: 'staging',
      targetStatus: 'review_required',
      eventType: 'APPLICATION_REQUIRES_REVIEW',
      source: 'automation_worker',
      reason: `Automated submission halted: ${options.reason}`,
      metadata: {
        url: options.url,
        formDetails: options.formDetails,
      },
    });
  }
}

export const unknownFormShield = new UnknownFormShield();
