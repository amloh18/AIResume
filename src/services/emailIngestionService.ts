/**
 * Email Ingestion Service
 *
 * Polls Stalwart JMAP for new inbound emails, processes them through:
 * 1. Parse/extract headers
 * 2. Classify intent (interview, rejection, offer, etc.)
 * 3. Match to existing applications
 * 4. Create/update Communication records
 * 5. Update application status if high-confidence
 * 6. Trigger notifications
 */

import mongoose from 'mongoose';
import { getEmails, searchEmails, markAsRead, type JmapEmail } from '@/lib/services/jmapService';
import { Communication, type CommunicationClassification, type MatchConfidence } from '@/models/Communication';

// ============================================================================
// Configuration
// ============================================================================

const INGESTION_CONFIG = {
  POLL_INTERVAL_MS: 30000, // 30 seconds
  BATCH_SIZE: 20,
  MAX_CONCURRENT: 1,
  RETRY_DELAY_MS: 5000,
  MAX_RETRIES: 3,
  /**
   * Ceiling for the failure backoff. The poll loop used to be a fixed `setInterval(30s)` that logged a
   * full stack trace on every tick, so an unreachable JMAP host produced an unbounded stream of
   * identical errors and hammered a dead endpoint forever. Backoff replaces that.
   */
  MAX_BACKOFF_MS: 300_000, // 5 minutes
  /** Delay before the first poll after boot, so MongoDB has a chance to connect. */
  STARTUP_DELAY_MS: 5000,
};

// ============================================================================
// Classification
// ============================================================================

interface ClassificationResult {
  classification: CommunicationClassification;
  confidence: number;
  reasons: string[];
}

const CLASSIFICATION_PATTERNS: Array<{
  classification: CommunicationClassification;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    classification: 'INTERVIEW_INVITATION',
    patterns: [
      /\b(interview|schedule a call|phone screen|technical screen|calendly|goodtime\.io|invite you to|would love to speak)\b/i,
    ],
    confidence: 0.95,
  },
  {
    classification: 'OFFER',
    patterns: [
      /\b(offer of employment|job offer|pleased to offer|formal offer|compensation details|welcome to the team)\b/i,
    ],
    confidence: 0.96,
  },
  {
    classification: 'REJECTION',
    patterns: [
      /\b(not moving forward|pursue other candidates|decided not to proceed|regret to inform|unsuccessful|position has been filled)\b/i,
    ],
    confidence: 0.96,
  },
  {
    classification: 'APPLICATION_ACKNOWLEDGEMENT',
    patterns: [
      /\b(thank you for applying|received your application|application received|we have received your resume)\b/i,
    ],
    confidence: 0.98,
  },
  {
    classification: 'RECRUITER_MESSAGE',
    patterns: [
      /\b(recruiter|talent acquisition|human resources|hr team|hiring manager)\b/i,
    ],
    confidence: 0.7,
  },
  {
    classification: 'FOLLOW_UP',
    patterns: [
      /\b(follow up|following up|checking in|just checking|any updates|following-up)\b/i,
    ],
    confidence: 0.85,
  },
  {
    classification: 'ASSESSMENT',
    patterns: [
      /\b(assessment|test|challenge|assignment|coding|technical test|hackerrank|codility)\b/i,
    ],
    confidence: 0.85,
  },
  {
    classification: 'REQUEST_FOR_INFORMATION',
    patterns: [
      /\b(could you provide|please send|additional information|references|background check)\b/i,
    ],
    confidence: 0.8,
  },
];

function classifyEmail(subject: string, body: string): ClassificationResult {
  const combined = `${subject}\n${body}`;
  const reasons: string[] = [];

  for (const { classification, patterns, confidence } of CLASSIFICATION_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        reasons.push(`Pattern matched: ${pattern.source.substring(0, 50)}`);
        return { classification, confidence, reasons };
      }
    }
  }

  return {
    classification: 'UNKNOWN',
    confidence: 0.3,
    reasons: ['No classification pattern matched'],
  };
}

// ============================================================================
// Matching
// ============================================================================

interface MatchResult {
  jobId: string | null;
  applicationId: string | null;
  confidence: MatchConfidence;
  score: number;
}

async function matchToApplication(
  userId: string | mongoose.Types.ObjectId,
  senderEmail: string,
  senderDomain: string,
  subject: string
): Promise<MatchResult> {
  try {
    // Dynamic model import to avoid circular dependencies
    const JobApplication = mongoose.model('JobApplication');
    const Job = mongoose.model('Job');

    // Get user's applications
    const applications = await JobApplication.find({ userId }).limit(200).lean();
    if (applications.length === 0) {
      return { jobId: null, applicationId: null, confidence: 'unmatched', score: 0 };
    }

    // Get associated jobs
    const jobIds = applications.map(a => a.jobId).filter(Boolean);
    const jobs = await Job.find({ _id: { $in: jobIds } }).limit(200).lean();
    const jobMap = new Map(jobs.map(j => [String(j._id), j]));

    const emailText = `${subject} ${senderEmail} ${senderDomain}`.toLowerCase();

    let bestMatch: MatchResult = { jobId: null, applicationId: null, confidence: 'unmatched', score: 0 };

    for (const app of applications) {
      const job = jobMap.get(String(app.jobId));
      if (!job) continue;

      let score = 0;
      const companyNorm = (job.company?.name || '').toLowerCase();
      const titleNorm = (job.title || '').toLowerCase();

      // Company name match
      if (companyNorm && emailText.includes(companyNorm)) {
        score += 60;
      }

      // Sender domain match
      if (job.company?.domain && senderDomain.includes(job.company.domain)) {
        score += 30;
      }

      // Job title match
      if (titleNorm && emailText.includes(titleNorm)) {
        score += 20;
      }

      // Sender email match with job contact
      if (job.contactDetails?.email) {
        const contactEmail = job.contactDetails.email.toLowerCase();
        if (senderEmail.toLowerCase() === contactEmail) {
          score += 40;
        }
      }

      if (score > bestMatch.score) {
        let confidence: MatchConfidence = 'unmatched';
        if (score >= 80) confidence = 'high';
        else if (score >= 50) confidence = 'medium';
        else if (score >= 30) confidence = 'low';

        bestMatch = {
          jobId: String(job._id),
          applicationId: String(app._id),
          confidence,
          score,
        };
      }
    }

    return bestMatch;
  } catch (error) {
    console.error('Match error:', error);
    return { jobId: null, applicationId: null, confidence: 'unmatched', score: 0 };
  }
}

// ============================================================================
// Email Processing
// ============================================================================

interface ProcessedEmail {
  communicationId: string;
  classification: CommunicationClassification;
  classificationConfidence: number;
  matchConfidence: MatchConfidence;
  jobId?: string;
  applicationId?: string;
}

async function processInboundEmail(
  userId: string | mongoose.Types.ObjectId,
  email: JmapEmail
): Promise<ProcessedEmail | null> {
  try {
    const senderEmail = email.from?.[0]?.email || '';
    const senderName = email.from?.[0]?.name || '';
    const senderDomain = senderEmail.split('@')[1] || '';
    const subject = email.subject || '(No Subject)';
    const bodySnippet = email.preview || email.textBody?.substring(0, 500) || '';

    // 1. Check idempotency
    const existing = await Communication.findOne({
      userId,
      messageId: email.id,
    });
    if (existing) {
      return null; // Already processed
    }

    // 2. Extract headers
    const inReplyTo = email.headers?.find(h => h.name.toLowerCase() === 'in-reply-to')?.value;
    const references = email.headers?.find(h => h.name.toLowerCase() === 'references')?.value?.split(/\s+/) || [];
    const messageIdHeader = email.headers?.find(h => h.name.toLowerCase() === 'message-id')?.value || email.id;

    // 3. Classify
    const classification = classifyEmail(subject, bodySnippet);

    // 4. Match to application
    const match = await matchToApplication(userId, senderEmail, senderDomain, subject);

    // 5. Determine communication type
    let commType: any = 'unknown';
    if (classification.classification === 'INTERVIEW_INVITATION') commType = 'interview_invitation';
    else if (classification.classification === 'OFFER') commType = 'offer';
    else if (classification.classification === 'REJECTION') commType = 'rejection';
    else if (classification.classification === 'APPLICATION_ACKNOWLEDGEMENT') commType = 'employer_response';
    else if (classification.classification === 'RECRUITER_MESSAGE') commType = 'recruiter_outreach';
    else if (classification.classification === 'FOLLOW_UP') commType = 'follow_up';
    else if (classification.classification === 'ASSESSMENT') commType = 'employer_response';

    // 6. Create Communication record
    const communication = new Communication({
      userId,
      jmapEmailId: email.id,
      jmapThreadId: email.threadId,
      messageId: messageIdHeader,
      inReplyTo,
      references,
      direction: 'inbound',
      type: commType,
      status: 'unread',
      subject,
      bodySnippet,
      textBody: email.textBody,
      htmlBody: email.htmlBody,
      senderEmail,
      senderName,
      recipients: (email.to || []).map(r => ({ email: r.email, name: r.name, type: 'to' as const })),
      jobId: match.jobId,
      applicationId: match.applicationId,
      classification: classification.classification,
      classificationConfidence: classification.confidence,
      classificationReasons: classification.reasons,
      matchConfidence: match.confidence,
      matchScore: match.score,
      isRead: false,
      isStarred: false,
      hasAttachments: false,
      isAutomated: false,
      receivedAt: new Date(email.receivedAt),
      stalwartMailboxIds: Object.keys(email.mailboxIds || {}),
      stalwartKeywords: email.keywords,
    });

    await communication.save();

    // ── Phase 7: Trigger state transition on matched application ──────
    if (match.applicationId && classification.confidence >= 0.85) {
      try {
        const { applicationStateMachine } = await import('@/lib/application-state/stateMachine');
        const { recordApplicationOutcome } = await import('@/lib/services/applicationOutcomeService');

        const userIdStr = typeof userId === 'string' ? userId : String(userId);
        let targetStage: 'interview' | 'offer' | 'rejected' | 'applied' | null = null;
        let eventType: string = 'status_update';

        if (classification.classification === 'INTERVIEW_INVITATION') {
          targetStage = 'interview';
          eventType = 'INTERVIEW_DETECTED';
        } else if (classification.classification === 'OFFER') {
          targetStage = 'offer';
          eventType = 'OFFER_DETECTED';
        } else if (classification.classification === 'REJECTION') {
          targetStage = 'rejected';
          eventType = 'REJECTION_DETECTED';
        } else if (classification.classification === 'APPLICATION_ACKNOWLEDGEMENT') {
          targetStage = 'applied';
          eventType = 'SUBMISSION_CONFIRMED';
        }

        if (targetStage) {
          await applicationStateMachine.transition({
            applicationId: match.applicationId,
            userId: userIdStr,
            targetStage,
            targetStatus: targetStage,
            eventType: eventType as any,
            source: 'email_intelligence',
            reason: `Email classification: ${classification.classification} (${Math.round(classification.confidence * 100)}% confidence)`,
            evidence: {
              emailMessageId: email.id,
              confirmationText: subject,
              verificationConfidence: classification.confidence,
            },
          });

          // Record outcome for learning
          const outcomeMap: Record<string, string> = {
            INTERVIEW_INVITATION: 'interview_scheduled',
            OFFER: 'offer_received',
            REJECTION: 'rejected',
            APPLICATION_ACKNOWLEDGEMENT: 'response_received',
          };
          const outcome = outcomeMap[classification.classification];
          if (outcome) {
            await recordApplicationOutcome({
              userId: userIdStr,
              jobId: match.jobId || '',
              applicationId: match.applicationId,
              outcome: outcome as any,
              atsType: 'email_intelligence',
              source: 'email_ingestion',
              matchScore: match.score,
            });
          }
        }
      } catch (transitionErr: any) {
        console.warn('[EmailIngestion] State transition failed:', transitionErr.message);
      }
    }

    return {
      communicationId: String(communication._id),
      classification: classification.classification,
      classificationConfidence: classification.confidence,
      matchConfidence: match.confidence,
      jobId: match.jobId || undefined,
      applicationId: match.applicationId || undefined,
    };
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key - already processed
      return null;
    }
    console.error('Error processing email:', error);
    throw error;
  }
}

// ============================================================================
// Ingestion Worker
// ============================================================================

let isIngesting = false;
let pollTimer: NodeJS.Timeout | null = null;
let workerStopped = false;
let consecutiveFailures = 0;
let lastError: { message: string; code?: string; at: string } | null = null;
let nextPollAt: number | null = null;

/**
 * Flatten a fetch failure into something readable.
 *
 * `fetch` wraps the real problem: the top-level message is a useless "fetch failed" and the useful
 * detail lives on `cause` (`UND_ERR_CONNECT_TIMEOUT`, `ENOTFOUND`, …). Surfacing the code is what makes
 * an unreachable host distinguishable from a bad response.
 */
function describeError(error: unknown): { message: string; code?: string } {
  const err = error as { message?: string; code?: string; cause?: { message?: string; code?: string } };
  const cause = err?.cause;
  const code = cause?.code || err?.code;
  const message = err?.message || String(error);
  const detail = cause?.message && cause.message !== message ? ` — ${cause.message}` : '';
  return { message: `${message}${detail}`, code };
}

/** @returns true if the poll completed, false if it failed and should back off. */
async function pollInbox(): Promise<boolean> {
  if (isIngesting) return true;
  isIngesting = true;

  try {
    // Get all users with Stalwart accounts
    // For now, process a single user (admin)
    const accountId = process.env.STALWART_ACCOUNT_ID || 'admin@morigrid.com';

    // Search for unread inbound emails
    const emails = await searchEmails({
      limit: INGESTION_CONFIG.BATCH_SIZE,
      mailboxRole: 'inbox',
    });

    let processed = 0;
    for (const email of emails) {
      try {
        const result = await processInboundEmail(
          process.env.STALWART_USER_ID || '000000000000000000000001',
          email
        );
        if (result) processed++;
      } catch (error) {
        console.error('Failed to process email:', email.id, error);
      }
    }

    if (processed > 0) {
      console.log(`📧 Ingested ${processed} new emails`);
    }
    return true;
  } catch (error) {
    const { message, code } = describeError(error);
    consecutiveFailures++;

    // Log the full error only on the first failure of a streak. Repeating an identical stack trace on
    // every tick buries the signal; one line is enough to show it is still failing.
    if (consecutiveFailures === 1) {
      console.error('Ingestion poll failed:', error);
    } else {
      console.warn(
        `[EmailIngestion] Still failing (${consecutiveFailures}x): ${message}${code ? ` [${code}]` : ''}`
      );
    }

    lastError = { message, code, at: new Date().toISOString() };
    return false;
  } finally {
    isIngesting = false;
  }
}

function scheduleNextPoll(delayMs: number): void {
  if (workerStopped) return;
  nextPollAt = Date.now() + delayMs;
  pollTimer = setTimeout(() => {
    void runPollCycle();
  }, delayMs);
}

async function runPollCycle(): Promise<void> {
  if (workerStopped) return;

  const ok = await pollInbox();

  if (ok) {
    if (consecutiveFailures > 0) {
      console.log(
        `[EmailIngestion] Recovered after ${consecutiveFailures} failed poll(s); ` +
          `resuming ${INGESTION_CONFIG.POLL_INTERVAL_MS / 1000}s interval`
      );
    }
    consecutiveFailures = 0;
    lastError = null;
    scheduleNextPoll(INGESTION_CONFIG.POLL_INTERVAL_MS);
    return;
  }

  // Exponential backoff: 30s → 60s → 120s → 240s, capped at 5 min.
  const backoff = Math.min(
    INGESTION_CONFIG.POLL_INTERVAL_MS * 2 ** (consecutiveFailures - 1),
    INGESTION_CONFIG.MAX_BACKOFF_MS
  );
  console.warn(`[EmailIngestion] Next poll in ${Math.round(backoff / 1000)}s`);
  scheduleNextPoll(backoff);
}

export function startIngestionWorker(): void {
  if (pollTimer) return;

  workerStopped = false;
  consecutiveFailures = 0;
  lastError = null;

  console.log('🚀 Starting email ingestion worker...');
  scheduleNextPoll(INGESTION_CONFIG.STARTUP_DELAY_MS);
}

export function stopIngestionWorker(): void {
  workerStopped = true;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  nextPollAt = null;
  console.log('🛑 Email ingestion worker stopped');
}

export function getIngestionStatus() {
  return {
    isRunning: !!pollTimer,
    isIngesting,
    /** Non-zero means the last poll(s) failed and the loop is backing off. */
    consecutiveFailures,
    lastError,
    nextPollAt: nextPollAt ? new Date(nextPollAt).toISOString() : null,
    pollIntervalMs: INGESTION_CONFIG.POLL_INTERVAL_MS,
    maxBackoffMs: INGESTION_CONFIG.MAX_BACKOFF_MS,
  };
}

// ============================================================================
// Manual Ingestion
// ============================================================================

/**
 * Manually trigger ingestion for a specific user
 */
export async function ingestForUser(userId: string): Promise<{
  processed: number;
  errors: number;
}> {
  let processed = 0;
  let errors = 0;

  try {
    const emails = await searchEmails({
      limit: 50,
      mailboxRole: 'inbox',
    });

    for (const email of emails) {
      try {
        const result = await processInboundEmail(userId, email);
        if (result) processed++;
      } catch (error) {
        errors++;
        console.error('Ingestion error:', error);
      }
    }
  } catch (error) {
    errors++;
    console.error('Ingestion batch error:', error);
  }

  return { processed, errors };
}

export default {
  startIngestionWorker,
  stopIngestionWorker,
  getIngestionStatus,
  ingestForUser,
  processInboundEmail,
};
