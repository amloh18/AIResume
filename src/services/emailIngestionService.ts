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
import { getEmails, searchEmails, markAsRead, resolveBodyText, type JmapEmail } from '@/lib/services/jmapService';
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

const UNMATCHED: MatchResult = { jobId: null, applicationId: null, confidence: 'unmatched', score: 0 };

/** Below this, a match is noise: it would set an association the UI would then show as fact. */
const MIN_MATCH_SCORE = 30;

/**
 * Whole-word (well, whole-token) containment.
 *
 * The previous matcher used `emailText.includes(companyNorm)`, which scores "Meta" against
 * "metadata" and a company called "AI" against every message that mentions email. A wrong match is
 * worse than no match — it files a stranger's mail under a real application — so terms are only
 * counted when they appear as a standalone token, and only when long enough to be distinctive.
 */
function containsTerm(haystack: string, term: string): boolean {
  if (term.length < 3) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

/** "Build AI Resume" → "buildairesume", so a company name can be compared against a sender domain. */
function domainSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The user's identity keys, in every form the data may hold.
 *
 * `JobApplication.userId` is declared `Schema.Types.Mixed`, and Mongoose applies **no casting** to a
 * Mixed path: a query written with a string never matches a document that stored an ObjectId, and
 * every create path stores an ObjectId. Querying both forms is what makes this join work at all —
 * without it the application list came back empty and every email was `unmatched`.
 */
function userKeysFor(userId: string | mongoose.Types.ObjectId): (string | mongoose.Types.ObjectId)[] {
  if (typeof userId !== 'string') return [userId];
  return mongoose.Types.ObjectId.isValid(userId)
    ? [userId, new mongoose.Types.ObjectId(userId)]
    : [userId];
}

/** `Communication.userId` is a real ObjectId path, so it casts — feed it only valid keys or it throws. */
function objectIdKeysFor(userId: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId[] {
  if (userId instanceof mongoose.Types.ObjectId) return [userId];
  return mongoose.Types.ObjectId.isValid(userId) ? [new mongoose.Types.ObjectId(userId)] : [];
}

/**
 * Resolve an inbound email to one of the user's applications.
 *
 * Matching is done against `JobApplication` — the fields the application already carries. The
 * previous implementation joined through the `Job` catalog collection using `JobApplication.jobId`
 * as a Mongo `_id`, which could not work:
 *   - no create path in the app ever writes `JobApplication.jobId`, so the `$in` was always empty;
 *   - the `Job` documents it then read expose `jobTitle` / `company` as **strings** and contacts as
 *     `contacts[]`, while the matcher read `job.title`, `job.company.name` and
 *     `job.contactDetails.email` — three paths that do not exist, so every score was 0.
 * Both faults produced the same symptom: every message came back `unmatched`, which is why nothing
 * ever appeared under a job in the tracker.
 *
 * Throughout this codebase `jobId` denotes the `JobApplication._id` (`ApplicationJourney.jobId`,
 * `EmailMessage.jobId`, `StageChangeLog.jobId`, the `/api/jobs` tracker listing), so that is what is
 * returned for both keys — every consumer that filters on either one then finds the message.
 */
async function matchToApplication(
  userId: string | mongoose.Types.ObjectId,
  senderEmail: string,
  senderDomain: string,
  subject: string,
  threadMessageIds: string[] = []
): Promise<MatchResult> {
  try {
    // Dynamic model import to avoid circular dependencies
    const JobApplication = mongoose.model('JobApplication');
    const userKeys = userKeysFor(userId);

    // Most-recent-first, so a long application history cannot push the relevant record past the limit.
    const applications = await JobApplication.find({ userId: { $in: userKeys } })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    if (applications.length === 0) return UNMATCHED;

    // ── 1. Thread continuity ────────────────────────────────────────────
    // The highest-precision signal, and the only one that survives a recruiter replying from a
    // different domain: if this message answers mail already tied to an application, it belongs to
    // that same application.
    const commUserKeys = objectIdKeysFor(userId);
    if (threadMessageIds.length > 0 && commUserKeys.length > 0) {
      // The explicit result type is required: `Communication` is exported as a union of two `Model`
      // branches, so `findOne(...).lean()` otherwise resolves to a union that includes an array.
      const prior = (await Communication.findOne({
        userId: { $in: commUserKeys },
        messageId: { $in: threadMessageIds },
        applicationId: { $ne: null },
      })
        .sort({ receivedAt: -1 })
        .lean()) as { applicationId?: unknown } | null;

      const priorAppId = prior?.applicationId ? String(prior.applicationId) : null;
      if (priorAppId && applications.some(a => String(a._id) === priorAppId)) {
        return { jobId: priorAppId, applicationId: priorAppId, confidence: 'high', score: 100 };
      }
    }

    // ── 2. Field scoring, entirely against the application ─────────────
    const sender = senderEmail.toLowerCase();
    const domain = senderDomain.toLowerCase();
    const emailText = `${subject} ${sender}`.toLowerCase();

    let best: MatchResult = UNMATCHED;

    for (const app of applications) {
      const companyNorm = String(app.company || '').toLowerCase().trim();
      const titleNorm = String(app.jobTitle || '').toLowerCase().trim();

      let score = 0;

      // Company named in the subject or sender address.
      if (companyNorm && containsTerm(emailText, companyNorm)) score += 60;

      // Company name echoed by the sender's domain (no-reply@stripe.com for "Stripe").
      const slug = domainSlug(companyNorm);
      if (slug.length >= 4 && domain.includes(slug)) score += 30;

      // Role named in the subject.
      if (titleNorm && containsTerm(emailText, titleNorm)) score += 20;

      // A recruiter writing from an address already recorded on the application.
      const knownContacts = [
        app.contactDetails?.email,
        ...(Array.isArray(app.contacts) ? app.contacts.map((c: any) => c?.email) : []),
      ]
        .filter(Boolean)
        .map((e: any) => String(e).toLowerCase());
      if (knownContacts.includes(sender)) score += 40;

      // Keep the invariant `jobId === null` ⇔ `confidence === 'unmatched'`, so callers can never
      // read a weak guess as an association.
      if (score < MIN_MATCH_SCORE || score <= best.score) continue;

      const id = String(app._id);
      best = {
        jobId: id,
        applicationId: id,
        confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
        score,
      };
    }

    return best;
  } catch (error) {
    console.error('Match error:', error);
    return UNMATCHED;
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

    // Resolve JMAP EmailBodyPart[] descriptors → plain text.
    // Must happen before bodySnippet and before the Communication constructor —
    // passing an EmailBodyPart[] directly causes a Mongoose CastError on String fields.
    const textBody = resolveBodyText(email.textBody, email.bodyValues);
    const htmlBody = resolveBodyText(email.htmlBody, email.bodyValues);

    // Non-empty fallback required: bodySnippet is { required: true } and Mongoose
    // treats '' the same as undefined for required Strings (fails validation).
    const bodySnippet = email.preview || textBody.substring(0, 500) || '(no text body)';

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

    // 4. Match to application.
    //    In-Reply-To / References are passed through so that a reply inside a known thread resolves
    //    to the same application even when neither the sender address nor the subject names the
    //    company — the common case for a recruiter answering from a shared inbox.
    const threadMessageIds = [inReplyTo, ...references].filter(Boolean) as string[];
    const match = await matchToApplication(userId, senderEmail, senderDomain, subject, threadMessageIds);

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
      textBody,
      htmlBody,
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
 * Set when the worker is misconfigured in a way that makes ingestion impossible.
 *
 * This is deliberately *not* routed through `lastError` / `consecutiveFailures`: a missing owner is
 * not a transient failure, so backing off and retrying forever would only bury the cause. It is
 * reported through `getIngestionStatus()` so an operator can see it without reading the logs.
 */
let configurationError: string | null = null;
let configurationErrorLogged = false;

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
    // Who owns this mailbox?
    //
    // The previous version fell back to a hardcoded `'000000000000000000000001'`. That id belongs to
    // no user, so every ingested message was filed under a stranger — invisible in every real user's
    // Comms panel, while the log line still reported a successful ingestion. Refusing to ingest is
    // the honest behaviour: until this is configured there is nobody to attribute the mail to.
    const ownerId = process.env.STALWART_USER_ID;
    if (!ownerId) {
      configurationError =
        'STALWART_USER_ID is not set, so ingested mail has no owner. Set it to the user id that owns the Stalwart mailbox.';
      if (!configurationErrorLogged) {
        console.error(`[EmailIngestion] ${configurationError} Skipping ingestion.`);
        configurationErrorLogged = true;
      }
      return true; // Misconfiguration, not a transient failure — do not engage the failure backoff.
    }
    configurationError = null;
    configurationErrorLogged = false;

    // Search for unread inbound emails
    const emails = await searchEmails({
      limit: INGESTION_CONFIG.BATCH_SIZE,
      mailboxRole: 'inbox',
    });

    let processed = 0;
    for (const email of emails) {
      try {
        const result = await processInboundEmail(ownerId, email);
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
  configurationErrorLogged = false; // Re-announce a misconfiguration after a restart.

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
    /**
     * Non-null means ingestion is disabled by configuration, not by an outage — the loop is not
     * retrying because retrying cannot help. Currently only set when `STALWART_USER_ID` is missing.
     */
    configurationError,
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
