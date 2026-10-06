import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import { JobApplication, Notification } from '@/models';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';

/**
 * POST /api/applications/auto
 *
 * Records an application the user reports they have already submitted, so it shows up in the tracker.
 *
 * ## What changed and why
 *
 * This route presented itself as an automated submission. It wrote `status: 'applied'`, fired a
 * notification reading "Successfully applied to X at Y", and accepted `x-user-id` as identity.
 *
 * Nothing in this file submits anything: there is no browser, no HTTP call to an employer, no ATS
 * handler. It also filled in `'Software Engineer'`, `'Company'` and `matchScore: 85` whenever the caller
 * omitted them — inventing a job title, an employer and a fit score that nothing had measured.
 *
 * It is now explicit that this is a *user-asserted* record: identity comes from the session, the invented
 * defaults are gone, and the wording says the application was recorded rather than performed. Actual
 * submission lives in the queue and the ATS handlers, and reports its own outcome.
 */

/** Escape a user-supplied string before using it as a regex — `company` reaches this from a request body. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User authentication required' } },
        { status: 401 }
      );
    }
    const userId = auth.userId;

    await getConnection();

    const body = await request.json();
    const {
      jobId,
      title,
      jobTitle,
      company,
      location,
      source,
      atsType,
      applyUrl,
      jobUrl,
      salary,
      matchScore,
      description,
      jobDescription,
      skills,
    } = body;

    const roleTitle = typeof (title || jobTitle) === 'string' ? (title || jobTitle).trim() : '';
    const companyName = typeof company === 'string' ? company.trim() : '';

    /*
      A tracker row with an invented employer is worse than no row: it corrupts counts and every
      downstream "have I applied here before?" check. Require what the caller actually knows rather than
      substituting 'Company' / 'Software Engineer'.
    */
    if (!roleTitle || !companyName) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Job title and company are required' } },
        { status: 400 }
      );
    }

    const targetApplyUrl = applyUrl || jobUrl || '';
    const jobDesc = description || jobDescription || '';

    // Check if this job application already exists for this user
    let existingJobApp = null;
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
      existingJobApp = await JobApplication.findOne({ _id: jobId, userId });
    }

    if (!existingJobApp) {
      existingJobApp = await JobApplication.findOne({
        userId,
        company: new RegExp(`^${escapeRegex(companyName)}$`, 'i'),
        jobTitle: new RegExp(`^${escapeRegex(roleTitle)}$`, 'i'),
      });
    }

    let savedJob: any;

    if (existingJobApp) {
      existingJobApp.status = 'applied';
      existingJobApp.applicationMethod = existingJobApp.applicationMethod || 'manual';
      existingJobApp.appliedAt = existingJobApp.appliedAt || new Date();
      existingJobApp.applicationDate = existingJobApp.applicationDate || new Date();
      if (targetApplyUrl) existingJobApp.jobUrl = targetApplyUrl;
      if (typeof matchScore === 'number') existingJobApp.matchScore = matchScore;
      if (jobDesc && !existingJobApp.jobDescription) existingJobApp.jobDescription = jobDesc;
      if (atsType) existingJobApp.atsType = atsType;
      savedJob = await existingJobApp.save();
    } else {
      const cleanSource = sanitizeJobApplicationSource(source);

      const newJobApp = new JobApplication({
        userId,
        jobTitle: roleTitle,
        company: companyName,
        // `location || 'Remote'` used to claim every unlabelled job was remote.
        location: location || undefined,
        jobUrl: targetApplyUrl,
        jobDescription: jobDesc,
        status: 'applied',
        priority: 'medium',
        source: cleanSource,
        atsType: atsType || 'unknown',
        // Only record a fit score the caller actually supplied. There is deliberately no default.
        matchScore: typeof matchScore === 'number' ? matchScore : undefined,
        appliedAt: new Date(),
        applicationDate: new Date(),
        isArchived: false,
        applicationMethod: 'manual',
        salary: typeof salary === 'object' && salary !== null ? salary : undefined,
        tags: Array.isArray(skills) ? skills : [],
      });

      savedJob = await newJobApp.save();
    }

    /*
      "Application recorded", not "Application Submitted". This endpoint cannot know that a submission
      succeeded — the user is the one who told us it happened.
    */
    try {
      await Notification.create({
        userId,
        title: 'Application recorded',
        message: `${roleTitle} at ${companyName} was added to your tracker.`,
        category: 'application',
        type: 'info',
        priority: 'medium',
        read: false,
        actionUrl: `/dashboard/jobs?tab=applications&jobId=${savedJob._id}`,
        createdAt: new Date(),
      });
    } catch (notifErr) {
      console.warn('Failed to create notification for application:', notifErr);
    }

    return NextResponse.json({
      success: true,
      status: 'applied',
      submitted: false,
      applicationId: savedJob._id.toString(),
      jobId: savedJob._id.toString(),
      job: {
        id: savedJob._id.toString(),
        jobTitle: savedJob.jobTitle,
        company: savedJob.company,
        location: savedJob.location,
        status: savedJob.status,
        appliedAt: savedJob.appliedAt,
      },
    });
  } catch (error: any) {
    console.error('[API] POST /api/applications/auto error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to record application',
        },
      },
      { status: 500 }
    );
  }
}
