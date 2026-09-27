import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import JobApplication from '@/models/JobApplication';
import { NaukriApplyService } from '@/lib/services/naukriApplyService';
import { checkForDuplicate } from '@/lib/jobs/deduplicate';

/**
 * POST /api/jobs/naukri/auto-apply
 *
 * Prepares a Naukri application: generates AI answers to the recruiter's screening questions and adds the
 * job to the tracker so the user can submit it.
 *
 * ## What this route does NOT do
 *
 * It does not apply. This file calls exactly one service — `NaukriApplyService.answerScreeningQuestions`,
 * which is regex/AI text generation with no browser and no submit. (The one place a real Naukri submit is
 * implemented is `UnifiedApplyService.applyToNaukri`, and the worker's `isAutomatable` gate routes naukri
 * to `review_required` before it is ever reached.)
 *
 * The route used to claim otherwise: `status: 'applied'`, the tag `naukri-auto-applied`, an increment of
 * `naukriIntegration.stats.totalApplied`, and "Application submitted successfully" in the response. It
 * also wrote a `statusHistory` timeline narrating "Submitted via 1-Click Naukri Auto-Apply" and a
 * `metadata` block — neither field exists on `JobApplication`, so Mongoose's strict mode dropped both
 * silently. The `applied` status and the counter persisted; the narrative did not.
 *
 * Now it records a `saved` row with a truthful `stageHistory`, and returns `submitted: false`.
 */

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      company,
      jobUrl,
      description,
      location,
      salary,
      screeningQuestions = [],
    } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: 'Job title and company are required' },
        { status: 400 }
      );
    }

    await getConnection();

    // 1. Check Job Tracker limits
    const { checkJobLimit } = await import('@/lib/utils/subscription-helpers');
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const limitCheck = await checkJobLimit(
      auth.userId,
      user.currentPlanKey || 'free',
      user.subscription
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.message || 'Job limit exceeded. Please upgrade your plan.',
          limitInfo: limitCheck,
        },
        { status: 403 }
      );
    }

    /*
      Per-source daily cap. This now bounds *preparations* per day rather than submissions, because that is
      the only thing this route produces. The number is unchanged so existing plan expectations still hold.
    */
    const dailyLimit = (user as any).naukriIntegration?.preferences?.dailyLimit ?? 25;
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayCount = await JobApplication.countDocuments({
      userId: mixedIdFilter(auth.userId),
      source: 'naukri',
      applicationDate: { $gte: todayStart },
    });

    if (todayCount >= dailyLimit) {
      return NextResponse.json(
        { error: `Daily Naukri limit reached (${dailyLimit}/${dailyLimit}). Try again tomorrow.` },
        { status: 429 }
      );
    }

    // 2. Generate AI screening answers — this is the actual product value of this route.
    const answers = await NaukriApplyService.answerScreeningQuestions(
      auth.userId,
      screeningQuestions,
      { title, company, description }
    );

    // 3. Add to the tracker as SAVED. Nothing has been submitted, so nothing may say it was.
    const dedup = await checkForDuplicate(auth.userId, title, company, jobUrl);
    if (dedup.isDuplicate && dedup.existingJob) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        submitted: false,
        existingJob: dedup.existingJob,
        matchType: dedup.matchType,
        message: 'This job already exists in your tracker',
        screeningAnswers: answers,
      });
    }

    const jobApplication = await JobApplication.create({
      userId: auth.userId,
      jobTitle: title,
      company,
      jobUrl: jobUrl || undefined,
      jobDescription: description || '',
      // `location || 'India'` used to assert a country for every unlabelled posting.
      location: location || undefined,
      source: 'naukri',
      atsType: 'naukri',
      // Prepared, not applied.
      status: 'saved',
      currentStage: 'saved',
      internalStatus: 'saved',
      applicationMethod: 'manual',
      automationEnabled: false,
      priority: 'high',
      salary: salary || undefined,
      applicationDate: new Date(),
      tags: ['screening-answers-prepared'],
      stageHistory: [
        {
          stage: 'saved',
          internalStatus: 'saved',
          changedAt: new Date(),
          reason:
            answers.length > 0
              ? `Prepared ${answers.length} screening answer(s) for manual submission on Naukri`
              : 'Added to tracker for manual submission on Naukri',
          source: 'user',
        },
      ],
    });

    /*
      Only the credit counter is bumped: a tracker record genuinely was created. The previous
      `naukriIntegration.stats.totalApplied` increment is gone — it counted applications that never
      happened.
    */
    await User.findByIdAndUpdate(auth.userId, {
      $inc: { 'credits.totalCreated.jobs': 1 },
    });

    return NextResponse.json({
      success: true,
      submitted: false,
      requiresManualSubmission: true,
      message:
        answers.length > 0
          ? `Prepared ${answers.length} screening answer(s). Review them and submit the application on Naukri.`
          : 'Added to your tracker. Submit the application on Naukri when you are ready.',
      jobId: jobApplication._id,
      application: jobApplication,
      screeningAnswers: answers,
    });
  } catch (error: any) {
    console.error('Error preparing Naukri application:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to prepare application' },
      { status: 500 }
    );
  }
}
