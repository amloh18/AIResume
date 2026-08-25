'use strict';

import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';
import { decryptToken } from '@/lib/auth/token-encryption';
import type { ApplicationStep, ATSType } from '@/types/automation-schema';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';

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
   */
  static async apply(userId: string, context: ApplyJobContext): Promise<ApplyResult> {
    await getConnection();

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
          statusHistory: {
            status: 'saved',
            date: new Date(),
            notes: `Document generation encountered an error: ${docResult.error || 'fallback'}. Placed in Saved stage.`,
          },
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
        statusHistory: {
          status: 'created',
          date: new Date(),
          notes: 'Tailored CV & Cover Letter prepared. Job staged for application.',
        },
      },
    });

    // 5. Generate screening answers if questions provided
    let screeningAnswers: ApplyResult['screeningAnswers'] = [];
    if (context.screeningQuestions && context.screeningQuestions.length > 0) {
      screeningAnswers = this.generateScreeningAnswers(context.screeningQuestions, userProfile, context);
    }

    // 6. Route to the appropriate ATS submission handler
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
        // Application succeeded externally with confirmed evidence
        await JobApplication.findByIdAndUpdate(jobApp._id, {
          status: 'applied',
          applicationDate: new Date(),
          appliedAt: new Date(),
          $push: {
            statusHistory: {
              status: 'applied',
              date: new Date(),
              notes: `Submission confirmed via ${context.atsType} Auto-Apply.`,
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
            statusHistory: {
              status: 'created',
              date: new Date(),
              notes: `Application staged in Tracker (${applyResult.message || 'Manual submission required with tailored documents'}).`,
            },
          },
        });

        if (docResult.journeyId) {
          await ApplicationJourney.findByIdAndUpdate(docResult.journeyId, {
            status: 'ready',
          });
        }
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
          statusHistory: {
            status: 'created',
            date: new Date(),
            notes: `Auto-submission encountered an issue: ${applyErr.message}. Staged for manual review.`,
          },
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
      statusHistory: [
        { status: 'saved', date: new Date(), notes: 'Job initiated via Auto-Apply' },
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

    return {
      success: true,
      atsType: 'greenhouse',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Tailored application prepared for ${context.company}. Review documents in Studio or complete submission.`,
      screeningAnswers,
      nextStep: 'Submit tailored resume via Greenhouse application form',
    };
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
    return {
      success: true,
      atsType: 'lever',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Tailored application prepared for ${context.company}. Review documents in Studio or complete submission.`,
      screeningAnswers,
      nextStep: 'Submit tailored resume via Lever application form',
    };
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
    return {
      success: true,
      atsType: 'ashby',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Tailored application prepared for ${context.company}. Review documents in Studio or complete submission.`,
      screeningAnswers,
      nextStep: 'Submit tailored resume via Ashby application form',
    };
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
    return {
      success: true,
      atsType: 'workable',
      applicationId: jobApp._id.toString(),
      status: 'action_required',
      message: `Tailored application prepared for ${context.company}. Review documents in Studio or complete submission.`,
      screeningAnswers,
      nextStep: 'Submit tailored resume via Workable form',
    };
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
      message: `Documents staged for ${context.company}. Redirecting to employer application.`,
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
}
