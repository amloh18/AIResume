export type EmailIntentClassification =
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'application_confirmation'
  | 'application_update'
  | 'unknown';

export interface EmailClassificationResult {
  classification: EmailIntentClassification;
  confidence: number; // 0.00 - 1.00
  reasons: string[];
}

const INTERVIEW_PATTERNS = [
  /\b(interview|schedule a call|phone screen|technical screen|conversation with the team|availability for a chat|calendly\.com|goodtime\.io)\b/i,
  /\b(invite you to|invitation to interview|would love to speak with you|next round)\b/i,
];

const OFFER_PATTERNS = [
  /\b(offer of employment|job offer|pleased to offer you|formal offer|compensation details|welcome to the team)\b/i,
];

const REJECTION_PATTERNS = [
  /\b(not moving forward|pursue other candidates|decided not to proceed|high volume of applicants|wish you the best in your job search|regret to inform)\b/i,
  /\b(unsuccessful|position has been filled|will not be moving you forward)\b/i,
];

const CONFIRMATION_PATTERNS = [
  /\b(thank you for applying|received your application|application received|we have received your resume)\b/i,
];

export function classifyEmailMessage(subject: string, body: string): EmailClassificationResult {
  const combined = `${subject} \n ${body}`;
  const reasons: string[] = [];

  // 1. Offer Check
  for (const pattern of OFFER_PATTERNS) {
    if (pattern.test(combined)) {
      reasons.push('Formal offer keywords detected');
      return {
        classification: 'offer',
        confidence: 0.96,
        reasons,
      };
    }
  }

  // 2. Interview Check
  for (const pattern of INTERVIEW_PATTERNS) {
    if (pattern.test(combined)) {
      reasons.push('Interview invitation or scheduling link detected');
      return {
        classification: 'interview',
        confidence: 0.95,
        reasons,
      };
    }
  }

  // 3. Rejection Check
  for (const pattern of REJECTION_PATTERNS) {
    if (pattern.test(combined)) {
      reasons.push('Candidate rejection or decline phrasing detected');
      return {
        classification: 'rejected',
        confidence: 0.96,
        reasons,
      };
    }
  }

  // 4. Receipt Confirmation Check
  for (const pattern of CONFIRMATION_PATTERNS) {
    if (pattern.test(combined)) {
      reasons.push('Application submission receipt confirmed');
      return {
        classification: 'application_confirmation',
        confidence: 0.98,
        reasons,
      };
    }
  }

  return {
    classification: 'unknown',
    confidence: 0.3,
    reasons: ['No clear application outcome intent identified'],
  };
}
