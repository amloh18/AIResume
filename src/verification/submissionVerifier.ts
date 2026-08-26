import { VerificationResult } from '@/platforms/base/ApplicationPlatform';

export class SubmissionVerifier {
  /**
   * Positive proof evidence verification
   * Applied must NEVER mean: "The automation started."
   * Applied means: "The application was successfully submitted or the user manually confirmed submission."
   */
  verifyEvidence(evidence: {
    domSuccessMatch?: boolean;
    confirmationId?: string;
    confirmationUrl?: string;
    statusCode?: number;
    emailConfirmationReceived?: boolean;
    userManuallyConfirmed?: boolean;
  }): VerificationResult {
    // 1. User manual confirmation
    if (evidence.userManuallyConfirmed) {
      return {
        confirmed: true,
        confidence: 1.0,
        confirmationText: 'Confirmed manually by candidate.',
      };
    }

    // 2. Verified confirmation ID from DOM / ATS response
    if (evidence.confirmationId) {
      return {
        confirmed: true,
        confidence: 0.99,
        confirmationId: evidence.confirmationId,
        confirmationUrl: evidence.confirmationUrl,
        confirmationText: `Verified ATS Submission with Reference ID: ${evidence.confirmationId}`,
      };
    }

    // 3. Positive DOM confirmation element & URL redirect
    if (evidence.domSuccessMatch && (evidence.confirmationUrl || evidence.statusCode === 200)) {
      return {
        confirmed: true,
        confidence: 0.95,
        confirmationUrl: evidence.confirmationUrl,
        confirmationText: 'Submission confirmed via verified success response.',
      };
    }

    // 4. Inbound Email Confirmation Receipt
    if (evidence.emailConfirmationReceived) {
      return {
        confirmed: true,
        confidence: 0.95,
        confirmationText: 'Submission verified via employer confirmation email.',
      };
    }

    return {
      confirmed: false,
      confidence: 0,
      error: 'Submission evidence insufficient to certify application completion.',
    };
  }
}

export const submissionVerifier = new SubmissionVerifier();
