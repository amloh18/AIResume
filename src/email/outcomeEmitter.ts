import { applicationStateMachine } from '@/lib/application-state/stateMachine';
import { EmailClassificationResult } from './emailClassifier';
import { ApplicationMatchResult } from './applicationMatcher';

export class OutcomeEmitter {
  /**
   * Evaluates classification confidence and executes automatic state transition or user flag
   */
  async processOutcome(
    userId: string,
    match: ApplicationMatchResult,
    classification: EmailClassificationResult,
    emailMessageId?: string
  ): Promise<{ autoTransitioned: boolean; flaggedForReview: boolean }> {
    // Confidence Gate >= 0.95 => Auto Transition
    if (classification.confidence >= 0.95) {
      if (classification.classification === 'interview') {
        await applicationStateMachine.transition({
          applicationId: match.applicationId,
          userId,
          targetStage: 'interview',
          targetStatus: 'interview',
          eventType: 'INTERVIEW_DETECTED',
          source: 'email_intelligence',
          reason: `Interview invitation detected with ${Math.round(classification.confidence * 100)}% confidence`,
          evidence: { emailMessageId, verificationConfidence: classification.confidence },
        });
        return { autoTransitioned: true, flaggedForReview: false };
      }

      if (classification.classification === 'offer') {
        await applicationStateMachine.transition({
          applicationId: match.applicationId,
          userId,
          targetStage: 'offer',
          targetStatus: 'offer',
          eventType: 'OFFER_DETECTED',
          source: 'email_intelligence',
          reason: `Formal job offer detected with ${Math.round(classification.confidence * 100)}% confidence`,
          evidence: { emailMessageId, verificationConfidence: classification.confidence },
        });
        return { autoTransitioned: true, flaggedForReview: false };
      }

      if (classification.classification === 'rejected') {
        await applicationStateMachine.transition({
          applicationId: match.applicationId,
          userId,
          targetStage: 'rejected',
          targetStatus: 'rejected',
          eventType: 'REJECTION_DETECTED',
          source: 'email_intelligence',
          reason: `Application rejection notice detected with ${Math.round(classification.confidence * 100)}% confidence`,
          evidence: { emailMessageId, verificationConfidence: classification.confidence },
        });
        return { autoTransitioned: true, flaggedForReview: false };
      }
    }

    // Moderate confidence => Flag for 1-click confirmation
    if (classification.confidence >= 0.8) {
      return { autoTransitioned: false, flaggedForReview: true };
    }

    return { autoTransitioned: false, flaggedForReview: false };
  }
}

export const outcomeEmitter = new OutcomeEmitter();
