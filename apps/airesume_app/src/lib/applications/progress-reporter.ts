import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';
import ApplicationEvent from '@/models/ApplicationEvent';
import type { InternalApplicationStatus } from '@/lib/application-state/stateMachine';
import { log } from '@/lib/structured-logger';

/**
 * Progress reporting for the application pipeline.
 *
 * WHY THIS EXISTS
 * ---------------
 * `JobApplication.internalStatus` is the single field every surface derives the
 * live progress bar from — but only FOUR of its fifteen values were ever
 * written:
 *
 *   written     saved, queued, processing, form_detected, applied, review_required,
 *               automation_failed, automation_dismissed
 *   NEVER written   staging_cv_generating, staging_cover_letter_generating,
 *                   staging_ready, submitting, verification
 *
 * The declared-but-unwritten five are exactly the interesting ones. Staging was
 * a single opaque jump (nothing → documents ready), and the worker's execution
 * half collapsed into one `processing` state, so a user watching an
 * application could not tell "filling the form" from "attaching your CV" from
 * "waiting for the confirmation email" — the run simply sat on "Submitting"
 * until it ended. That is the gap this module closes: each step of the pipeline
 * announces itself as it happens.
 *
 * CONTRACT
 * --------
 * Best-effort by design. Progress reporting must NEVER be able to fail the work
 * it is reporting on — a Mongo hiccup writing a status string must not abort a
 * submission. Every call is wrapped and swallows its errors after logging.
 *
 * Idempotent-ish: the status write always happens (it is the same value on a
 * repeat), but a `stageHistory` entry is only appended when the status actually
 * changed, so re-reporting the same phase during a long fill does not inflate
 * the history.
 */

export type ProgressSource =
  | 'user'
  | 'automation'
  | 'automation_worker'
  | 'email_intelligence'
  | 'admin'
  | 'system';

export interface ReportProgressParams {
  /** JobApplication._id */
  applicationId: string;
  /** JobApplication.userId, when the caller has it (needed for the event row). */
  userId?: string;
  internalStatus: InternalApplicationStatus;
  /**
   * The sentence the progress bar shows. Write it for a human watching the
   * card: "Filling 9 fields on Greenhouse…", not "form_detected".
   */
  reason: string;
  eventType?: string;
  source?: ProgressSource;
  /**
   * Merged into `JobApplication.artifacts` by dot-path, so reporting field
   * detail cannot clobber a sibling key written by another step.
   */
  artifacts?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Set false for high-frequency updates that should not touch stageHistory. */
  recordHistory?: boolean;
}

/** Dot-path `$set` payload from a nested object: `{a:{b:1}}` → `{'artifacts.a.b': 1}`. */
function toDotPaths(prefix: string, value: unknown, out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      toDotPaths(`${prefix}.${key}`, child, out);
    }
    return out;
  }
  out[prefix] = value;
  return out;
}

export async function reportApplicationProgress(params: ReportProgressParams): Promise<void> {
  const {
    applicationId,
    internalStatus,
    reason,
    eventType = 'status_update',
    source = 'automation_worker',
    artifacts,
    metadata,
    recordHistory = true,
  } = params;

  if (!mongoose.isValidObjectId(applicationId)) return;

  try {
    const current = await JobApplication.findById(applicationId)
      .select({ internalStatus: 1, userId: 1, jobId: 1, currentStage: 1 })
      .lean();

    if (!current) return;

    const app = current as any;
    const changed = String(app.internalStatus || '') !== internalStatus;

    const set: Record<string, unknown> = { internalStatus };
    if (artifacts) Object.assign(set, toDotPaths('artifacts', artifacts));

    const update: Record<string, unknown> = { $set: set };

    if (recordHistory && changed) {
      update.$push = {
        stageHistory: {
          stage: app.currentStage || 'staging',
          internalStatus,
          changedAt: new Date(),
          reason,
          source,
        },
      };
    }

    await JobApplication.updateOne({ _id: applicationId }, update);

    // The event is what lets a surface show *when* a step happened, and it is
    // the same trail the park-reason lookups already read. `ApplicationEvent.userId`
    // is a required ObjectId, so an unresolved owner skips the event rather than
    // writing a row that fails validation.
    const userId = params.userId || app.userId;
    if (mongoose.isValidObjectId(userId)) {
      await ApplicationEvent.create({
        applicationId: new mongoose.Types.ObjectId(applicationId),
        userId: new mongoose.Types.ObjectId(String(userId)),
        jobId: app.jobId,
        type: eventType,
        newStatus: internalStatus,
        source,
        metadata: { reason, ...(metadata || {}) },
        createdAt: new Date(),
      }).catch((err: any) => {
        log.warn(`[ProgressReporter] event write skipped for ${applicationId}: ${err?.message}`);
      });
    }
  } catch (err: any) {
    log.warn(`[ProgressReporter] ${applicationId} → ${internalStatus} failed: ${err?.message}`);
  }
}

/**
 * Resolve the JobApplication id for a journey.
 *
 * `ApplicationJourney.jobId` holds the **JobApplication `_id`** (never the
 * external source id) — the one key space the tracker, the state machine and
 * the comms panel all agree on.
 */
export async function applicationIdForJourney(journeyId: string): Promise<string | null> {
  try {
    if (!mongoose.isValidObjectId(journeyId)) return null;
    const { default: ApplicationJourney } = await import('@/models/ApplicationJourney');
    const journey = await ApplicationJourney.findById(journeyId).select({ jobId: 1 }).lean();
    const jobId = (journey as any)?.jobId;
    return jobId && mongoose.isValidObjectId(String(jobId)) ? String(jobId) : null;
  } catch {
    return null;
  }
}
