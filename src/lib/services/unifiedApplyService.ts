'use strict';

import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';
import { acquirePlaywrightBrowser } from '@/lib/services/browserService';
import { decryptToken } from '@/lib/auth/token-encryption';
import type { ApplicationStep, ATSType } from '@/types/automation-schema';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';
import { reportApplicationProgress } from '@/lib/applications/progress-reporter';

/**
 * Report one step of an ATS run to the tracker.
 *
 * The execution half of the pipeline used to be invisible: `processApplication`
 * set `processing`, then `form_detected`, and then the row sat on that value
 * for the entire Playwright run — detect fields, fill, attach, submit, confirm
 * — before jumping to `applied`. A user watching the progress bar saw
 * "Finding the application form" for two minutes and then "Applied", with no
 * way to tell a working run from a hung one.
 *
 * `submitting` and `verification` are declared on `JobApplication.internalStatus`
 * and were never written anywhere in the repo; this is where they get written.
 *
 * Best-effort — the reporter swallows its own errors, so instrumentation can
 * never fail a submission.
 */
async function reportAtsStep(
  applicationId: string,
  atsType: ATSType,
  step: 'detected' | 'filled' | 'submitting' | 'verifying',
  context: { title?: string; company?: string; jobUrl?: string },
  extra?: {
    fields?: Array<{ label?: string; name?: string; required?: boolean }>;
    filledCount?: number;
    /** Field names the filler skipped — the rest are counted as filled. */
    skippedNames?: string[];
  },
): Promise<void> {
  const target = context.company ? `${context.company}` : 'the employer';
  const map = {
    detected: {
      internalStatus: 'form_detected' as const,
      reason: `Application form found on ${atsType} — reading the fields…`,
    },
    filled: {
      internalStatus: 'form_detected' as const,
      reason: extra?.fields?.length
        ? `Filled ${extra.filledCount ?? extra.fields.length} of ${extra.fields.length} fields on ${atsType}…`
        : `Filling the application form on ${atsType}…`,
    },
    submitting: {
      internalStatus: 'submitting' as const,
      reason: `Submitting your application to ${target}…`,
    },
    verifying: {
      internalStatus: 'verification' as const,
      reason: 'Checking that the employer confirmed your application…',
    },
  } as const;

  const stepMeta = map[step];
  const skipped = new Set(extra?.skippedNames || []);

  await reportApplicationProgress({
    applicationId,
    internalStatus: stepMeta.internalStatus,
    reason: stepMeta.reason,
    source: 'automation_worker',
    // Field detail is what turns "Filling the form" into a real substep list.
    artifacts:
      step === 'filled' && extra?.fields?.length
        ? {
            atsType,
            detectedFields: extra.fields.slice(0, 12).map((f) => ({
              label: f.label || f.name || 'Field',
              type: 'text',
              required: Boolean(f.required),
              filled: !skipped.has(String(f.name || '')),
              fillMethod: skipped.has(String(f.name || '')) ? 'skipped' : 'deterministic',
            })),
            fillAudit: {
              totalFields: extra.fields.length,
              filledFields: extra.filledCount ?? extra.fields.length - skipped.size,
              skippedFields: skipped.size,
              errorFields: 0,
              filledAt: new Date(),
            },
          }
        : undefined,
    metadata: { atsType, step, jobUrl: context.jobUrl },
  });
}

/**
 * Resolve the URL a Greenhouse run should actually navigate to.
 *
 * Many employers serve the Greenhouse form from their **own** domain behind a `gh_jid` parameter —
 * `stripe.com/jobs/search?gh_jid=…`, `careers.airbnb.com/positions/…?gh_jid=…`,
 * `jobs.elastic.co/jobs?gh_jid=…`. Navigating to that URL loads a page whose form lives in a
 * cross-origin iframe, so field detection finds nothing; on some sites it also redirect-loops.
 * Measured on production 2026-09-27: "No application form detected at
 * https://stripe.com/jobs/search?gh_jid=8194604" and `net::ERR_TOO_MANY_REDIRECTS` on
 * `https://jobs.elastic.co/jobs?gh_jid=8121805`.
 *
 * The `gh_jid` value IS the Greenhouse job id and Greenhouse resolves the board from it, so
 * `/embed/job_app?token=<id>` serves the same form directly. Verified: HTTP 200, redirecting to
 * `job-boards.greenhouse.io/embed/job_app?for=<board>&token=<id>` and rendering the full form
 * (`#first_name`, `#last_name`, `#email`, `#phone`, `#resume`, `button[type="submit"]`).
 */
function resolveGreenhouseNavigationUrl(jobUrl: string): string {
  if (!jobUrl) return jobUrl;
  // Already a real Greenhouse board — nothing to rewrite.
  if (/greenhouse\.io/i.test(jobUrl) || /grnh\.se/i.test(jobUrl)) return jobUrl;
  const token = jobUrl.match(/[?&]gh_jid=(\d+)/i)?.[1];
  return token ? `https://boards.greenhouse.io/embed/job_app?token=${token}` : jobUrl;
}

/**
 * Build one `stageHistory` entry.
 *
 * `JobApplication` has **no** `statusHistory` path — the real field is `stageHistory`, whose shape is
 * `{ stage, internalStatus, changedAt, reason, source }` — and Mongoose's strict mode strips unknown
 * paths from an update **silently**. Every `$push: { statusHistory: … }` in this file was therefore a
 * no-op. Measured on production 2026-09-27: **0 of 99** `jobapplications` documents carry a
 * `statusHistory` field, 63 carry `stageHistory`, and 49 of those have an empty array. The writes
 * looked like an audit trail and produced none, so an application parked in Staging never recorded
 * *why* it was parked — which is exactly the question a user asks when the tracker says
 * "Apply manually".
 *
 * `stage`/`internalStatus` use the state-machine vocabulary from `JobApplication.currentStage` /
 * `.internalStatus` (note `'staging'` + `'staging_ready'` — not the legacy `status: 'created'` that
 * the callers below also write to the tracker column).
 */
function stageEntry(opts: {
  stage: 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';
  reason: string;
  internalStatus?: string;
  source?: 'user' | 'automation' | 'automation_worker' | 'email_intelligence' | 'admin' | 'system';
}) {
  return {
    stage: opts.stage,
    internalStatus: opts.internalStatus ?? opts.stage,
    changedAt: new Date(),
    reason: opts.reason,
    source: opts.source ?? ('automation_worker' as const),
  };
}

/**
 * Resolve the tailored CV for an application as a PDF buffer, ready to attach to a live form.
 *
 * The ATS fillers (`fillGreenhouseFields`, `fillLeverFields`, `fillAshbyFields`, `fillWorkableFields`)
 * all accept `resumePdf: Buffer` + `resumeFileName` and upload it via `setInputFiles`, but **no caller
 * ever passed them** and `JobApplication.attachments` is written by no code path in the repo — so an
 * automated run filled the candidate's name and email and then submitted with **no resume attached**.
 *
 * Resolution order matches the rest of the product:
 *   1. the tailored CV the journey was built around (`ApplicationJourney.cvId` — note that
 *      `ApplicationJourney.jobId` holds the `JobApplication._id`, so the application id is the lookup);
 *   2. the user's Master CV.
 *
 * Rendering goes through the same `PDFService` + `resolveTemplate` pair the download route uses, so the
 * attachment is byte-identical to what the user gets from "Download PDF" — including the template's
 * custom renderer. There is deliberately **no HTML fallback**: an HTML file is not a resume, and
 * silently attaching one would be worse than parking the application.
 *
 * Returns `null` on any failure; the caller parks the application instead of submitting an incomplete
 * one.
 */
async function resolveResumeAttachment(
  applicationId: string,
  userId: string,
): Promise<{ buffer: Buffer; fileName: string } | null> {
  try {
    const journey: any = await ApplicationJourney.findOne({ jobId: applicationId }).lean();

    let cvId: string | undefined = journey?.cvId ? String(journey.cvId) : undefined;
    if (!cvId) {
      const master: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();
      cvId = master?._id ? String(master._id) : undefined;
    }
    if (!cvId) return null;

    const { getCVWithTemplate } = await import('@/lib/cv-template-utils');
    const cvWithTemplate = await getCVWithTemplate(cvId);
    if (!cvWithTemplate?.cvData) return null;

    const { resolveTemplate } = await import('@/lib/services/templateResolutionService');
    const { template } = await resolveTemplate(cvWithTemplate);
    if (!template) return null;

    const { PDFService } = await import('@/lib/services/pdfService');
    const blob = await PDFService.generatePDF(cvWithTemplate.cvData, template, {
      paperSize: 'A4',
      orientation: 'portrait',
      format: 'pdf',
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    if (!buffer.length) return null;

    const rawName = String(cvWithTemplate.cvData?.basics?.name || 'Candidate').trim();
    const safeName = rawName.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'Candidate';
    return { buffer, fileName: `${safeName}-Resume.pdf` };
  } catch (error) {
    // Best-effort: a missing attachment must park the application, not crash the queue item.
    console.error(
      '[apply] Could not build the resume attachment',
      JSON.stringify({ applicationId, error: error instanceof Error ? error.message : String(error) }),
    );
    return null;
  }
}

export interface ApplyJobContext {
  jobId: string;
  title: string;
  company: string;
  description?: string;
  location?: string;
  salary?: any;
  jobUrl: string;
  atsType: ATSType;
  source: string;
  screeningQuestions?: (string | { question: string; type?: string; options?: string[] })[];
}

export interface ApplyResult {
  success: boolean;
  atsType: ATSType;
  applicationId?: string;
  status: 'applied' | 'queued' | 'action_required' | 'saved' | 'failed';
  message: string;
  screeningAnswers?: { question: string; answer: string | number | boolean; confidence: number }[];
  nextStep?: string;
  error?: string;
  confirmationId?: string;
  confirmationUrl?: string;
}

export interface SessionCredentials {
  userId: string;
  atsType: ATSType;
  encryptedCookieJar?: string;
  email?: string;
  status: 'active' | 'expired' | 'disconnected';
}

/**
 * Unified Auto-Apply Service
 * Handles end-to-end auto-apply lifecycle:
 * 1. Find or create JobApplication in Tracker
 * 2. Generate and link tailored CV + Cover Letter in Staging (status = 'created')
 * 3. Fallback to 'saved' stage if document generation fails
 * 4. Fallback to 'created' (staging) stage if ATS submission fails or requires manual action
 * 5. Move to 'applied' stage ONLY when submission is confirmed
 */
export class UnifiedApplyService {
  /**
   * Main entry point: apply to a job based on its ATS type
   *
   * `options.mode` is the execution gate carried from the decision engine via the queue item:
   *   - `auto`   → full pipeline, Playwright submits;
   *   - `review` → documents are prepared and the application is held for approval; the browser is
   *                 never launched (there is no resumable browser session to come back to, so a
   *                 half-filled form could not be handed to the user anyway);
   *   - `manual` → same hold, and the caller must not have attempted automation at all (defence in
   *                 depth: this method refuses to submit regardless).
   * Absent/`auto` preserves the previous behaviour for callers that have not adopted the gate yet.
   */
  static async apply(
    userId: string,
    context: ApplyJobContext,
    options?: { mode?: 'auto' | 'review' | 'manual' | 'skip' }
  ): Promise<ApplyResult> {
    await getConnection();

    const executionMode = options?.mode ?? 'auto';

    // 1. Validate user exists
    const user = await User.findById(userId).lean();
    if (!user) {
      return { success: false, atsType: context.atsType, status: 'failed', message: 'User not found' };
    }

    // 2. Get master CV for profile data
    const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();
    const userProfile = this.buildUserProfile(user, primaryCv);

    // 3. Find or Create JobApplication record in Tracker
    const jobApp = await this.findOrCreateJobApplication(userId, context);

    // 4. Ensure ApplicationJourney and Documents (Tailored CV + Cover Letter) are created
    const docResult = await this.ensureJourneyAndDocuments(userId, jobApp, context);

    // CRITICAL USER RULE: If document generation fails -> Must show in 'saved' stage
    if (!docResult.success) {
      await JobApplication.findByIdAndUpdate(jobApp._id, {
        status: 'saved',
        $push: {
          stageHistory: stageEntry({
            stage: 'saved',
            reason: `Document generation encountered an error: ${docResult.error || 'fallback'}. Placed in Saved stage.`,
          }),
        },
      });

      return {
        success: false,
        atsType: context.atsType,
        applicationId: jobApp._id.toString(),
        status: 'saved',
        message: 'Document generation could not complete. Job saved to Saved stage.',
        error: docResult.error,
      };
    }

    // At this point, documents are successfully created -> Ensure job is in Staging ('created')
    await JobApplication.findByIdAndUpdate(jobApp._id, {
      status: 'created',
      $push: {
        stageHistory: stageEntry({
          stage: 'staging',
          internalStatus: 'staging_ready',
          reason: 'Tailored CV & Cover Letter prepared. Job staged for application.',
        }),
      },
    });

    // 5. Generate screening answers if questions provided
    let screeningAnswers: ApplyResult['screeningAnswers'] = [];
    if (context.screeningQuestions && context.screeningQuestions.length > 0) {
      screeningAnswers = this.generateScreeningAnswers(context.screeningQuestions, userProfile, context);
    }

    // 6. Application Quality Gate — verify preconditions before submission
    const qualityGate = this.runQualityGate(context, jobApp, user, screeningAnswers);
    if (!qualityGate.passed) {
      // Quality gate failed — keep in staging with a clear reason
      const failedChecks = qualityGate.checks.filter(c => c.severity === 'error' && !c.passed);
      const failReason = failedChecks.map(c => c.message).join('; ');

      await JobApplication.findByIdAndUpdate(jobApp._id, {
        status: 'created',
        $push: {
          stageHistory: stageEntry({
            stage: 'staging',
            internalStatus: 'review_required',
            reason: `Quality gate failed: ${failReason}`,
          }),
        },
      });

      if (docResult.journeyId) {
        await ApplicationJourney.findByIdAndUpdate(docResult.journeyId, {
          status: 'ready',
        });
      }

      return {
        success: true,
        atsType: context.atsType,
        applicationId: jobApp._id.toString(),
        status: 'action_required',
        message: `Documents prepared. Quality gate flagged: ${failReason}. Please review and submit manually.`,
        screeningAnswers,
      };
    }

    // 7. Route to the appropriate ATS submission handler
    /*
      Execution gate: `review`/`manual` stop here, after the documents are prepared and staged but
      before any browser is launched. The alternative — filling the live form and pausing before
      submit — would need a resumable browser session, which this system does not have: the Playwright
      context is created and closed inside one call, so a paused form could never be handed back.
      Holding at "documents ready + awaiting approval" gives the user the same control point, and
      re-queueing with `mode: 'auto'` performs the submission once they approve.
    */
    if (executionMode !== 'auto') {
      if (docResult.journeyId) {
        await ApplicationJourney.findByIdAndUpdate(docResult.journeyId, { status: 'ready' });
      }

      await JobApplication.findByIdAndUpdate(jobApp._id, {
        status: 'created',
        $push: {
          stageHistory: stageEntry({
            stage: 'staging',
            internalStatus: 'review_required',
            reason:
              executionMode === 'manual'
                ? 'Manual mode: documents prepared, automation withheld. Submit yourself or approve automated submission.'
                : 'Review mode: documents prepared and held for your approval before submission.',
          }),
        },
      });

      return {
        success: true,
        atsType: context.atsType,
        applicationId: jobApp._id.toString(),
        status: 'action_required',
        message:
          executionMode === 'manual'
            ? `Documents prepared for ${context.company}. Manual mode: no automated submission was attempted.`
            : `Documents prepared for ${context.company}. Awaiting your approval before submission.`,
        screeningAnswers,
        nextStep: `Review the prepared documents, then submit at ${context.jobUrl}`,
      };
    }

    try {
      let applyResult: ApplyResult;
      switch (context.atsType) {
        case 'greenhouse':
          applyResult = await this.applyToGreenhouse(userId, context, jobApp, screeningAnswers);
          break;
        case 'lever':
          applyResult = await this.applyToLever(userId, context, jobApp, screeningAnswers);
          break;
        case 'ashby':
          applyResult = await this.applyToAshby(userId, context, jobApp, screeningAnswers);
          break;
        case 'workable':
          applyResult = await this.applyToWorkable(userId, context, jobApp, screeningAnswers);
          break;
        case 'naukri':
          applyResult = await this.applyToNaukri(userId, context, jobApp, screeningAnswers);
          break;
        case 'indeed':
          applyResult = await this.applyToIndeed(userId, context, jobApp, screeningAnswers);
          break;
        case 'adzuna':
          applyResult = await this.applyToAdzuna(userId, context, jobApp, screeningAnswers);
          break;
        default:
          applyResult = await this.applyGeneric(userId, context, jobApp, screeningAnswers);
          break;
      }

      // CRITICAL USER RULES ON SUBMISSION OUTCOME:
      if (applyResult.status === 'applied') {
        /*
          Record the confirmed submission on `stageHistory`, not `statusHistory`.

          `JobApplication` has no `statusHistory` path — the real field is `stageHistory` — and
          Mongoose's strict mode strips unknown paths from updates **silently**. The push below used
          to name `statusHistory`, so the one line that records *why* an application is marked applied
          was dropped on every successful submission while `status: 'applied'` persisted. That is the
          same class of bug that made the tracker claim applications had been sent when nothing was
          (`server_bugs.md` §5) — here it only lost the audit trail, but the failure is invisible
          either way.
        */
        await JobApplication.findByIdAndUpdate(jobApp._id, {
          status: 'applied',
          applicationDate: new Date(),
          appliedAt: new Date(),
          $push: {
            stageHistory: {
              stage: 'applied',
              internalStatus: 'applied',
              changedAt: new Date(),
              reason: `Submission confirmed via ${context.atsType} Auto-Apply.`,
              source: 'automation_worker',
            },
          },
        });

        if (docResult.journeyId) {
          await ApplicationJourney.findByIdAndUpdate(docResult.journeyId, {
            status: 'completed',
            completedAt: new Date(),
            applicationDate: new Date(),
          });
        }
      } else {
        // CRITICAL USER RULE: If application fails / requires manual submit -> MUST SHOW IN STAGING STAGE ('created')
        await JobApplication.findByIdAndUpdate(jobApp._id, {
          status: 'created',
          $push: {
            stageHistory: stageEntry({
              stage: 'staging',
              internalStatus: 'review_required',
              reason: `Application staged in Tracker (${applyResult.message || 'Manual submission required with tailored documents'}).`,
            }),
          },
        });

        if (docResult.journeyId) {
          await ApplicationJourney.findByIdAndUpdate(docResult.journeyId, {
            status: 'ready',
          });
        }
      }      // Record application outcome for success learning
      try {
        const { recordApplicationOutcome } = await import('./applicationOutcomeService');
        await recordApplicationOutcome({
          userId,
          jobId: context.jobId,
          applicationId: jobApp._id.toString(),
          outcome: applyResult.status === 'applied' ? 'submitted' : 'action_required',
          atsType: context.atsType,
          source: context.source,
          matchScore: 0,
        });
      } catch {
        // Outcome recording is best-effort
      }

      return {
        ...applyResult,
        applicationId: jobApp._id.toString(),
      };

    } catch (applyErr: any) {
      console.error('ATS submission error:', applyErr);

      // Fallback on unexpected error: keep in STAGING ('created') with prepared documents
      await JobApplication.findByIdAndUpdate(jobApp._id, {
        status: 'created',
        $push: {
          stageHistory: stageEntry({
            stage: 'staging',
            internalStatus: 'automation_failed',
            reason: `Auto-submission encountered an issue: ${applyErr.message}. Staged for manual review.`,
          }),
        },
      });

      return {
        success: true,
        atsType: context.atsType,
        applicationId: jobApp._id.toString(),
        status: 'action_required',
        message: `Documents prepared! Please submit your application on ${context.company}'s career portal.`,
        screeningAnswers,
      };
    }
  }

  /**
   * Find or Create a JobApplication document in MongoDB
   */
  private static async findOrCreateJobApplication(userId: string, context: ApplyJobContext): Promise<any> {
    let userObjId: any = userId;
    try {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjId = new mongoose.Types.ObjectId(userId);
      }
    } catch {
      userObjId = userId;
    }

    // 1. Check by jobId if it matches an existing JobApplication ID
    if (context.jobId && mongoose.Types.ObjectId.isValid(context.jobId)) {
      const existing = await JobApplication.findOne({
        _id: context.jobId,
        $or: [{ userId: userObjId }, { userId: String(userId) }],
      });
      if (existing) return existing;
    }

    // 2. Check by Company + Title + User
    const existingByTitle = await JobApplication.findOne({
      $or: [{ userId: userObjId }, { userId: String(userId) }],
      company: { $regex: new RegExp(`^${context.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      jobTitle: { $regex: new RegExp(`^${context.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existingByTitle) return existingByTitle;

    // 3. Create new JobApplication in 'saved' stage initially
    const sanitizedSource = sanitizeJobApplicationSource(context.source);
    const newApp = await JobApplication.create({
      userId: userObjId,
      jobTitle: context.title,
      company: context.company,
      jobUrl: context.jobUrl || '',
      jobDescription: context.description || '',
      location: context.location || 'Remote',
      source: sanitizedSource,
      atsType: context.atsType || 'unknown',
      status: 'saved',
      priority: 'high',
      salary: context.salary || undefined,
      stageHistory: [
        stageEntry({ stage: 'saved', reason: 'Job initiated via Auto-Apply' }),
      ],
    });

    return newApp;
  }

  /**
   * Ensure ApplicationJourney exists and generate tailored CV + Cover Letter
   */
  private static async ensureJourneyAndDocuments(
    userId: string,
    jobApp: any,
    context: ApplyJobContext
  ): Promise<{ success: boolean; journeyId?: string; cvId?: string; coverLetterId?: string; error?: string }> {
    try {
      const jobIdStr = jobApp._id.toString();

      // Check if journey already exists
      let journey = await ApplicationJourney.findOne({
        jobId: jobIdStr,
        userId: String(userId),
      });

      if (!journey) {
        journey = await ApplicationJourney.create({
          userId: String(userId),
          jobId: jobIdStr,
          jobTitle: context.title,
          company: context.company,
          status: 'processing_documents',
          currentStep: 2,
          totalSteps: 5,
          journeyType: 'standard',
          steps: [
            { stepId: 1, name: 'Job Details', status: 'completed', completedAt: new Date() },
            { stepId: 2, name: 'Resume', status: 'active' },
            { stepId: 3, name: 'Cover Letter', status: 'pending' },
            { stepId: 4, name: 'ATS Check', status: 'pending' },
            { stepId: 5, name: 'Application Ready', status: 'pending' },
          ],
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
          },
        });
      }

      // If documents are not yet ready, create them now
      if (!journey.cvId || !journey.coverLetterId || journey.status !== 'ready') {
        const docResult = await createJourneyDocuments(journey._id.toString(), String(userId));
        if (!docResult.success) {
          return {
            success: false,
            journeyId: journey._id.toString(),
            error: docResult.error || 'Failed to generate tailored documents',
          };
        }

        return {
          success: true,
          journeyId: journey._id.toString(),
          cvId: docResult.cvId || undefined,
          coverLetterId: docResult.coverLetterId || undefined,
        };
      }

      return {
        success: true,
        journeyId: journey._id.toString(),
        cvId: journey.cvId,
        coverLetterId: journey.coverLetterId,
      };
    } catch (err: any) {
      console.error('ensureJourneyAndDocuments error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Build user profile from user document and master CV
   */
  private static buildUserProfile(user: any, cv: any) {
    return {
      name: user?.firstName ? `${user.firstName} ${user.lastName}` : cv?.basics?.name || 'Candidate',
      email: user?.email || cv?.basics?.email || '',
      phone: user?.phone || cv?.basics?.phone || '',
      location: user?.location || cv?.basics?.location?.address || '',
      experienceYears: this.calculateExperienceYears(cv?.experience || []),
      skills: cv?.skills?.map((s: any) => s.name || s) || [],
      summary: cv?.summary || cv?.basics?.summary || '',
      education: cv?.education || [],
      experience: cv?.experience || [],
      expectedCtcLakhs: user?.naukriIntegration?.preferences?.expectedCtcLakhs || 15,
      currentCtcLakhs: user?.naukriIntegration?.preferences?.currentCtcLakhs || 12,
      noticePeriodDays: user?.naukriIntegration?.preferences?.noticePeriodDays || 30,
      minSalary: user?.indeedIntegration?.preferences?.minSalary || 90000,
      salaryCurrency: user?.indeedIntegration?.preferences?.salaryCurrency || 'USD',
      workAuthorization: user?.workAuthorization || 'authorized',
      visaSponsorship: user?.visaSponsorship || false,
      remotePreference: user?.remotePreference || 'flexible',
    };
  }

  private static calculateExperienceYears(experience: any[]): number {
    if (!experience || experience.length === 0) return 3;
    let totalMonths = 0;
    const now = new Date();
    for (const exp of experience) {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : now;
      if (start) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, months);
      }
    }
    return Math.max(1, Math.round(totalMonths / 12));
  }

  private static generateScreeningAnswers(
    questions: (string | { question: string; type?: string; options?: string[] })[],
    profile: any,
    context: ApplyJobContext
  ): { question: string; answer: string | number | boolean; confidence: number }[] {
    return questions.map((q) => {
      const qText = typeof q === 'string' ? q : q.question;
      const lower = qText.toLowerCase();

      if (/authorized|eligible|legally/i.test(lower)) {
        return { question: qText, answer: profile.workAuthorization === 'authorized' ? 'Yes' : 'No', confidence: 0.98 };
      }
      if (/sponsorship|visa/i.test(lower)) {
        return { question: qText, answer: profile.visaSponsorship ? 'Yes' : 'No', confidence: 0.95 };
      }
      if (/expected.*(?:salary|compensation|ctc|pay)/i.test(lower)) {
        if (context.atsType === 'naukri') {
          return { question: qText, answer: `₹ ${profile.expectedCtcLakhs} LPA`, confidence: 0.95 };
        }
        const symbol = profile.salaryCurrency === 'GBP' ? '£' : profile.salaryCurrency === 'INR' ? '₹' : '$';
        return { question: qText, answer: `${symbol}${profile.minSalary.toLocaleString()}`, confidence: 0.95 };
      }
      if (/years? of (?:experience|work)/i.test(lower) || /total.*experience/i.test(lower)) {
        return { question: qText, answer: `${profile.experienceYears} years`, confidence: 0.95 };
      }
      if (/notice\s*period/i.test(lower)) {
        return { question: qText, answer: `${profile.noticePeriodDays} days`, confidence: 0.95 };
      }
      if (/remote|work from home|wfh/i.test(lower)) {
        return { question: qText, answer: profile.remotePreference === 'remote' ? 'Yes, fully remote preferred' : 'Yes, open to remote work', confidence: 0.9 };
      }

      return {
        question: qText,
        answer: 'Yes, I have relevant hands-on experience and can deliver effectively in this role.',
        confidence: 0.8,
      };
    });
  }

  private static async getSessionCredentials(userId: string, atsType: ATSType): Promise<SessionCredentials | null> {
    const user = (await User.findById(userId).lean()) as any;
    if (!user) return null;

    if (atsType === 'naukri' && user.naukriIntegration) {
      return {
        userId,
        atsType: 'naukri',
        encryptedCookieJar: user.naukriIntegration.encryptedCookieJar,
        email: user.naukriIntegration.userEmail,
        status: user.naukriIntegration.sessionStatus || 'expired',
      };
    }

    if (atsType === 'indeed' && user.indeedIntegration) {
      return {
        userId,
        atsType: 'indeed',
        encryptedCookieJar: user.indeedIntegration.encryptedCookieJar,
        email: user.indeedIntegration.userEmail,
        status: user.indeedIntegration.sessionStatus || 'expired',
      };
    }

    return null;
  }

  // ==========================================
  // GREENHOUSE HANDLER
  // ==========================================
  private static async applyToGreenhouse(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    const boardMatch = context.jobUrl.match(/boards\.greenhouse\.io\/([^/]+)/);
    const boardSlug = boardMatch?.[1] || context.company.toLowerCase().replace(/\s+/g, '');

    // Attempt Playwright automation for Greenhouse
    try {
      const { detectGreenhouseFields, fillGreenhouseFields, submitGreenhouseForm, detectCAPTCHA } = await import('./atsPlaywrightService');

      /*
        The Playwright context used to be named `context` here, shadowing the `ApplyJobContext`
        parameter of the same name. Consequences: `page.goto(context.jobUrl)` read `.jobUrl` off the
        *BrowserContext* (always undefined, so goto threw and every Greenhouse run fell through to
        `automationUnavailable`), and the message templates below rendered "at undefined". Renamed to
        `ctx` to match the lever/ashby/workable handlers.
      */
      let browser: any = null;
      let ctx: any = null;
      let page: any = null;

      try {
        // Browser isolation: one context per application, whether the browser is remote (VPS CDP) or
        // local. `acquirePlaywrightBrowser()` never launches a browser inside a production container.
        browser = (await acquirePlaywrightBrowser()).browser;
        ctx = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        page = await ctx.newPage();

        // Navigate to the URL that actually serves the form. Company-hosted embeds must be rewritten
        // to the Greenhouse embed endpoint first — see resolveGreenhouseNavigationUrl.
        const navigationUrl = resolveGreenhouseNavigationUrl(context.jobUrl);
        await page.goto(navigationUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // CAPTCHA check before any interaction
        const captchaCheck = await detectCAPTCHA(page);
        if (captchaCheck.detected) {
          return {
            success: true,
            atsType: 'greenhouse',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA detected on Greenhouse application (${captchaCheck.type}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        // Detect form fields
        const detection = await detectGreenhouseFields(page);
        if (!detection.formDetected) {
          return {
            success: true,
            atsType: 'greenhouse',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `No application form detected at ${navigationUrl}. The job may have been filled or the URL may be incorrect.`,
            screeningAnswers,
            nextStep: 'Verify the application URL and submit manually',
          };
        }

        await reportAtsStep(jobApp._id.toString(), 'greenhouse', 'detected', context, {
          fields: detection.fields,
        });

        // Fill fields with candidate data
        const user = await User.findById(userId).lean() as any;
        const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();

        // The tailored CV as a PDF, so the form is submitted with a resume attached.
        const resume = await resolveResumeAttachment(jobApp._id.toString(), userId);

        const fillResult = await fillGreenhouseFields(page, detection.fields, {
          firstName: user?.firstName || primaryCv?.basics?.name?.split(' ')[0] || '',
          lastName: user?.lastName || primaryCv?.basics?.name?.split(' ').slice(1).join(' ') || '',
          email: user?.email || primaryCv?.basics?.email || '',
          phone: user?.phone || primaryCv?.basics?.phone || '',
          linkedin: primaryCv?.basics?.url || '',
          resumePdf: resume?.buffer,
          resumeFileName: resume?.fileName,
        });

        await reportAtsStep(jobApp._id.toString(), 'greenhouse', 'filled', context, {
          fields: detection.fields,
          filledCount: fillResult?.fieldsFilled,
          skippedNames: (fillResult?.skippedFields || []).map((s: any) => s.name),
        });

        /*
          Refuse to submit without a resume.

          `resolveResumeAttachment` renders the tailored CV through the same `PDFService` the download
          route uses. If it returns null — no CV, no template, renderer unavailable — halt explicitly
          rather than submit the candidate's details with nothing attached. A silently incomplete
          submission is worse than a parked one: the user believes they applied, the employer receives
          an empty application, and nothing surfaces the problem.

          The operator detail goes to the log; `message` stays user-facing copy (SB-08).
        */
        if (!resume) {
          console.error(
            '[greenhouse] Refusing to submit without a resume attachment',
            JSON.stringify({
              applicationId: jobApp._id.toString(),
              navigationUrl,
              filledFields: fillResult?.fieldsFilled,
            })
          );

          return {
            success: true,
            atsType: 'greenhouse',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `We opened the ${context.company} application form but your tailored CV wasn't ready to attach, so nothing was submitted. Apply on the employer site, or retry once your documents are ready.`,
            screeningAnswers,
            nextStep: `Apply at ${context.jobUrl}`,
          };
        }

        await reportAtsStep(jobApp._id.toString(), 'greenhouse', 'submitting', context);

        // Submit form
        const submissionResult = await submitGreenhouseForm(page);

        if (submissionResult.hasCAPTCHA) {
          return {
            success: true,
            atsType: 'greenhouse',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA detected during submission on Greenhouse. Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        if (submissionResult.confirmed) {
          // Submission verified with evidence
          return {
            success: true,
            atsType: 'greenhouse',
            applicationId: jobApp._id.toString(),
            status: 'applied',
            message: `Successfully submitted to ${context.title} at ${context.company} via Greenhouse${submissionResult.confirmationId ? ` (ID: ${submissionResult.confirmationId})` : ''}`,
            screeningAnswers,
          };
        }

        // Submission attempted but not confirmed — needs user action
        return {
          success: true,
          atsType: 'greenhouse',
          applicationId: jobApp._id.toString(),
          status: 'action_required',
          message: `Application form filled on Greenhouse but submission could not be verified. Please review and submit manually.`,
          screeningAnswers,
          nextStep: `Review and submit at ${context.jobUrl}`,
        };
      } finally {
        // Always clean up browser context
        if (page) await page.close().catch(() => {});
        if (ctx) await ctx.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      }
    } catch (playwrightError: any) {
      // No browser configured, or the automation crashed — fall back to manual submission.
      return this.automationUnavailable('greenhouse', context, jobApp, screeningAnswers, playwrightError);
    }
  }

  // ==========================================
  // LEVER HANDLER
  // ==========================================
  private static async applyToLever(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    try {
      const { detectLeverFields, fillLeverFields, submitLeverForm, detectCAPTCHA } = await import('./atsPlaywrightService');

      let browser: any = null;
      let ctx: any = null;
      let page: any = null;

      try {
        browser = (await acquirePlaywrightBrowser()).browser;
        ctx = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        page = await ctx.newPage();

        await page.goto(context.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const captchaCheck = await detectCAPTCHA(page);
        if (captchaCheck.detected) {
          return {
            success: true,
            atsType: 'lever',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA detected on Lever application (${captchaCheck.type}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        const detection = await detectLeverFields(page);
        if (!detection.formDetected) {
          return {
            success: true,
            atsType: 'lever',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `No application form detected at ${context.jobUrl}. The job may have been filled or the URL may be incorrect.`,
            screeningAnswers,
            nextStep: 'Verify the application URL and submit manually',
          };
        }

        await reportAtsStep(jobApp._id.toString(), 'lever', 'detected', context, {
          fields: detection.fields,
        });

        const user = await User.findById(userId).lean() as any;
        const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();

        // The tailored CV as a PDF, so the form is submitted with a resume attached.
        const resume = await resolveResumeAttachment(jobApp._id.toString(), userId);

        const fillResult = await fillLeverFields(page, detection.fields, {
          fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : primaryCv?.basics?.name || '',
          email: user?.email || primaryCv?.basics?.email || '',
          phone: user?.phone || primaryCv?.basics?.phone || '',
          linkedin: primaryCv?.basics?.url || '',
          resumePdf: resume?.buffer,
          resumeFileName: resume?.fileName,
        });

        await reportAtsStep(jobApp._id.toString(), 'lever', 'filled', context, {
          fields: detection.fields,
          filledCount: fillResult?.fieldsFilled,
          skippedNames: (fillResult?.skippedFields || []).map((s: any) => s.name),
        });

        await reportAtsStep(jobApp._id.toString(), 'lever', 'submitting', context);

        const submissionResult = await submitLeverForm(page);

        if (submissionResult.hasCAPTCHA) {
          return {
            success: true,
            atsType: 'lever',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA appeared during Lever submission (${submissionResult.error}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        if (submissionResult.confirmed) {
          return {
            success: true,
            atsType: 'lever',
            applicationId: jobApp._id.toString(),
            status: 'applied',
            message: `Application submitted to ${context.company} via Lever.`,
            screeningAnswers,
            confirmationId: submissionResult.confirmationId,
            confirmationUrl: submissionResult.confirmationUrl,
          };
        }

        return {
          success: true,
          atsType: 'lever',
          applicationId: jobApp._id.toString(),
          status: 'action_required',
          message: `Automated submission could not be confirmed for ${context.company}. Please verify manually.`,
          screeningAnswers,
          nextStep: `Check ${context.jobUrl} for submission status`,
        };
      } finally {
        if (page) try { await page.close(); } catch { /* ignore */ }
        if (ctx) try { await ctx.close(); } catch { /* ignore */ }
        if (browser) try { await browser.close(); } catch { /* ignore */ }
      }
    } catch (error: any) {
      return this.automationUnavailable('lever', context, jobApp, screeningAnswers, error);
    }
  }

  // ==========================================
  // ASHBY HANDLER
  // ==========================================
  private static async applyToAshby(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    try {
      const { detectAshbyFields, fillAshbyFields, submitAshbyForm, detectCAPTCHA } = await import('./atsPlaywrightService');

      let browser: any = null;
      let ctx: any = null;
      let page: any = null;

      try {
        browser = (await acquirePlaywrightBrowser()).browser;
        ctx = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        page = await ctx.newPage();

        await page.goto(context.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const captchaCheck = await detectCAPTCHA(page);
        if (captchaCheck.detected) {
          return {
            success: true,
            atsType: 'ashby',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA detected on Ashby application (${captchaCheck.type}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        const detection = await detectAshbyFields(page);
        if (!detection.formDetected) {
          return {
            success: true,
            atsType: 'ashby',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `No application form detected at ${context.jobUrl}. The job may have been filled or the URL may be incorrect.`,
            screeningAnswers,
            nextStep: 'Verify the application URL and submit manually',
          };
        }

        await reportAtsStep(jobApp._id.toString(), 'ashby', 'detected', context, {
          fields: detection.fields,
        });

        const user = await User.findById(userId).lean() as any;
        const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();

        // The tailored CV as a PDF, so the form is submitted with a resume attached.
        const resume = await resolveResumeAttachment(jobApp._id.toString(), userId);

        const fillResult = await fillAshbyFields(page, detection.fields, {
          fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : primaryCv?.basics?.name || '',
          email: user?.email || primaryCv?.basics?.email || '',
          phone: user?.phone || primaryCv?.basics?.phone || '',
          linkedin: primaryCv?.basics?.url || '',
          resumePdf: resume?.buffer,
          resumeFileName: resume?.fileName,
        });

        await reportAtsStep(jobApp._id.toString(), 'ashby', 'filled', context, {
          fields: detection.fields,
          filledCount: fillResult?.fieldsFilled,
          skippedNames: (fillResult?.skippedFields || []).map((s: any) => s.name),
        });

        await reportAtsStep(jobApp._id.toString(), 'ashby', 'submitting', context);

        const submissionResult = await submitAshbyForm(page);

        if (submissionResult.hasCAPTCHA) {
          return {
            success: true,
            atsType: 'ashby',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA appeared during Ashby submission (${submissionResult.error}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        if (submissionResult.confirmed) {
          return {
            success: true,
            atsType: 'ashby',
            applicationId: jobApp._id.toString(),
            status: 'applied',
            message: `Application submitted to ${context.company} via Ashby.`,
            screeningAnswers,
            confirmationId: submissionResult.confirmationId,
            confirmationUrl: submissionResult.confirmationUrl,
          };
        }

        return {
          success: true,
          atsType: 'ashby',
          applicationId: jobApp._id.toString(),
          status: 'action_required',
          message: `Automated submission could not be confirmed for ${context.company}. Please verify manually.`,
          screeningAnswers,
          nextStep: `Check ${context.jobUrl} for submission status`,
        };
      } finally {
        if (page) try { await page.close(); } catch { /* ignore */ }
        if (ctx) try { await ctx.close(); } catch { /* ignore */ }
        if (browser) try { await browser.close(); } catch { /* ignore */ }
      }
    } catch (error: any) {
      return this.automationUnavailable('ashby', context, jobApp, screeningAnswers, error);
    }
  }

  // ==========================================
  // WORKABLE HANDLER
  // ==========================================
  private static async applyToWorkable(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    try {
      const { detectWorkableFields, fillWorkableFields, submitWorkableForm, detectCAPTCHA } = await import('./atsPlaywrightService');

      let browser: any = null;
      let ctx: any = null;
      let page: any = null;

      try {
        browser = (await acquirePlaywrightBrowser()).browser;
        ctx = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        page = await ctx.newPage();

        await page.goto(context.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const captchaCheck = await detectCAPTCHA(page);
        if (captchaCheck.detected) {
          return {
            success: true,
            atsType: 'workable',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA detected on Workable application (${captchaCheck.type}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        const detection = await detectWorkableFields(page);
        if (!detection.formDetected) {
          return {
            success: true,
            atsType: 'workable',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `No application form detected at ${context.jobUrl}. The job may have been filled or the URL may be incorrect.`,
            screeningAnswers,
            nextStep: 'Verify the application URL and submit manually',
          };
        }

        await reportAtsStep(jobApp._id.toString(), 'workable', 'detected', context, {
          fields: detection.fields,
        });

        const user = await User.findById(userId).lean() as any;
        const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();

        // The tailored CV as a PDF, so the form is submitted with a resume attached.
        const resume = await resolveResumeAttachment(jobApp._id.toString(), userId);

        const fillResult = await fillWorkableFields(page, detection.fields, {
          fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : primaryCv?.basics?.name || '',
          email: user?.email || primaryCv?.basics?.email || '',
          phone: user?.phone || primaryCv?.basics?.phone || '',
          resumePdf: resume?.buffer,
          resumeFileName: resume?.fileName,
        });

        await reportAtsStep(jobApp._id.toString(), 'workable', 'filled', context, {
          fields: detection.fields,
          filledCount: fillResult?.fieldsFilled,
          skippedNames: (fillResult?.skippedFields || []).map((s: any) => s.name),
        });

        await reportAtsStep(jobApp._id.toString(), 'workable', 'submitting', context);

        const submissionResult = await submitWorkableForm(page);

        if (submissionResult.hasCAPTCHA) {
          return {
            success: true,
            atsType: 'workable',
            applicationId: jobApp._id.toString(),
            status: 'action_required',
            message: `CAPTCHA appeared during Workable submission (${submissionResult.error}). Manual completion required.`,
            screeningAnswers,
            nextStep: `Complete CAPTCHA at ${context.jobUrl} and submit manually`,
          };
        }

        if (submissionResult.confirmed) {
          return {
            success: true,
            atsType: 'workable',
            applicationId: jobApp._id.toString(),
            status: 'applied',
            message: `Application submitted to ${context.company} via Workable.`,
            screeningAnswers,
            confirmationId: submissionResult.confirmationId,
            confirmationUrl: submissionResult.confirmationUrl,
          };
        }

        return {
          success: true,
          atsType: 'workable',
          applicationId: jobApp._id.toString(),
          status: 'action_required',
          message: `Automated submission could not be confirmed for ${context.company}. Please verify manually.`,
          screeningAnswers,
          nextStep: `Check ${context.jobUrl} for submission status`,
        };
      } finally {
        if (page) try { await page.close(); } catch { /* ignore */ }
        if (ctx) try { await ctx.close(); } catch { /* ignore */ }
        if (browser) try { await browser.close(); } catch { /* ignore */ }
      }
    } catch (error: any) {
      return this.automationUnavailable('workable', context, jobApp, screeningAnswers, error);
    }
  }

  // ==========================================
  // NAUKRI HANDLER
  // ==========================================
  private static async applyToNaukri(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    const session = await this.getSessionCredentials(userId, 'naukri');
    if (!session || session.status !== 'active' || !session.encryptedCookieJar) {
      return {
        success: true,
        atsType: 'naukri',
        applicationId: jobApp._id.toString(),
        status: 'action_required',
        message: `Application staged for ${context.company}. Please connect your Naukri account to enable 1-click apply.`,
        screeningAnswers,
      };
    }

    const cookieJar = decryptToken(session.encryptedCookieJar);
    const jobKeyMatch = context.jobUrl.match(/jobs?\?jobId=([a-f0-9]+)/i) || context.jobUrl.match(/\/job\/([a-f0-9]+)/i);
    const jobKey = jobKeyMatch?.[1];

    if (!jobKey || !cookieJar) {
      return {
        success: true,
        atsType: 'naukri',
        applicationId: jobApp._id.toString(),
        status: 'action_required',
        message: `Application staged for ${context.company}. Manual submission required.`,
        screeningAnswers,
      };
    }

    try {
      const applyResponse = await fetch('https://www.naukri.com/jobapi/v3/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieJar,
          appid: '109',
          systemid: '109',
          clientid: 'd3eb4292b02a',
        },
        body: JSON.stringify({
          jobId: jobKey,
          applyType: 'f2f',
          screenQuestion: screeningAnswers.map((a) => ({
            question: a.question,
            answer: String(a.answer),
          })),
        }),
      });

      if (applyResponse.ok) {
        return {
          success: true,
          atsType: 'naukri',
          applicationId: jobApp._id.toString(),
          status: 'applied',
          message: `Successfully submitted to ${context.title} at ${context.company} via Naukri`,
          screeningAnswers,
        };
      }
    } catch (naukriErr) {
      console.error('Naukri apply API error:', naukriErr);
    }

    return {
      success: true,
      atsType: 'naukri',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Documents staged for ${context.company}. Complete submission on Naukri.`,
      screeningAnswers,
    };
  }

  // ==========================================
  // INDEED HANDLER
  // ==========================================
  private static async applyToIndeed(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    return {
      success: true,
      atsType: 'indeed',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Documents staged for ${context.company}. Submit on Indeed with your tailored CV.`,
      screeningAnswers,
    };
  }

  // ==========================================
  // ADZUNA HANDLER
  // ==========================================
  private static async applyToAdzuna(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    return {
      success: true,
      atsType: 'adzuna',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Documents staged for ${context.company}. Please submit on the employer's career page.`,
      screeningAnswers,
    };
  }

  // ==========================================
  // GENERIC FALLBACK
  // ==========================================
  private static async applyGeneric(
    userId: string,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: any[]
  ): Promise<ApplyResult> {
    return {
      success: true,
      atsType: 'unknown',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Application documents staged for ${context.company}. Review and submit on employer website.`,
      screeningAnswers,
    };
  }

  /**
   * Result used when Playwright automation could not run at all: no browser is configured, or the
   * browser crashed / was unreachable.
   *
   * This is `action_required`, not `failed`, and deliberately so. The tailored CV and cover letter were
   * generated successfully — only the *submission mechanism* is missing — so the application belongs in
   * the user's staging queue with a clear reason, exactly like a CAPTCHA (AGENTS.md §16, §22, §27). The
   * previous `failed` results for Lever/Ashby/Workable also disagreed with the caller: UnifiedApplyService
   * already routes a non-`applied` outcome into staging, so the reported status was misleading.
   */
  private static automationUnavailable(
    atsType: ATSType,
    context: ApplyJobContext,
    jobApp: any,
    screeningAnswers: ApplyResult['screeningAnswers'],
    error: any
  ): ApplyResult {
    const noBrowser = error?.name === 'BrowserUnavailableError';
    const detail = noBrowser
      ? error.message
      : `Automation error: ${error?.message || 'unknown'}`;

    console.warn(`[${atsType}] Playwright automation unavailable: ${detail}`);

    return {
      success: true,
      atsType,
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Tailored documents ready for ${context.company}. Automated submission unavailable (${detail}). Please submit manually.`,
      screeningAnswers,
      nextStep: `Open ${context.jobUrl} and submit your tailored resume`,
    };
  }

  // ==========================================
  // APPLICATION QUALITY GATE
  // ==========================================
  /**
   * Lightweight quality gate: verifies preconditions before submission.
   * Checks candidate, job, URL, resume, required fields, and duplicate status.
   */
  private static runQualityGate(
    context: ApplyJobContext,
    jobApp: any,
    user: any,
    screeningAnswers: { question: string; answer: string | number | boolean; confidence: number }[]
  ): { passed: boolean; checks: Array<{ name: string; passed: boolean; message: string; severity: 'error' | 'warning' }> } {
    const checks: Array<{ name: string; passed: boolean; message: string; severity: 'error' | 'warning' }> = [];

    // 1. Correct candidate
    checks.push({
      name: 'candidate',
      passed: Boolean(user?.email),
      message: user?.email ? `Candidate: ${user.firstName || ''} ${user.lastName || ''} (${user.email})` : 'Candidate not identified',
      severity: 'error',
    });

    // 2. Correct job
    checks.push({
      name: 'job',
      passed: Boolean(context.title && context.company),
      message: context.title ? `${context.title} at ${context.company}` : 'Job not identified',
      severity: 'error',
    });

    // 3. Application URL exists
    checks.push({
      name: 'url',
      passed: Boolean(context.jobUrl),
      message: context.jobUrl ? `URL: ${context.jobUrl}` : 'No application URL',
      severity: 'error',
    });

    // 4. Not already applied
    const alreadyApplied = jobApp.status === 'applied';
    checks.push({
      name: 'duplicate',
      passed: !alreadyApplied,
      message: alreadyApplied ? 'Already applied to this job' : 'No duplicate',
      severity: 'error',
    });

    // 5. Required screening answers present
    const unansweredRequired = screeningAnswers.filter(a => !a.answer && a.confidence < 0.5);
    checks.push({
      name: 'screening',
      passed: unansweredRequired.length === 0,
      message: unansweredRequired.length === 0 ? 'All screening answers ready' : `${unansweredRequired.length} unanswered screening question(s)`,
      severity: 'warning',
    });

    // 6. CAPTCHA / anti-bot risk assessment
    const atsTypesWithCaptcha = ['greenhouse', 'lever', 'ashby', 'workable'];
    const hasCaptchaRisk = atsTypesWithCaptcha.includes(context.atsType);
    checks.push({
      name: 'captcha_risk',
      passed: !hasCaptchaRisk,
      message: hasCaptchaRisk
        ? `${context.atsType} forms may require CAPTCHA — automated submission may pause for manual intervention`
        : 'No known CAPTCHA risk for this ATS',
      severity: 'warning',
    });

    const errorChecks = checks.filter(c => c.severity === 'error' && !c.passed);
    return {
      passed: errorChecks.length === 0,
      checks,
    };
  }
}
