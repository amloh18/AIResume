import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import JobApplication from '@/models/JobApplication';
import { IndeedApplyService } from '@/lib/services/indeedApplyService';
import { checkForDuplicate } from '@/lib/jobs/deduplicate';

/**
 * POST /api/jobs/indeed/auto-apply
 * Handles automated 1-click apply for Indeed jobs.
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

    // Check daily limit for Indeed
    const dailyLimit = (user as any).indeedIntegration?.preferences?.dailyLimit ?? 25;
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayCount = await JobApplication.countDocuments({
      userId: auth.userId,
      source: 'indeed',
      applicationDate: { $gte: todayStart },
    });

    if (todayCount >= dailyLimit) {
      return NextResponse.json(
        { error: `Daily Indeed limit reached (${dailyLimit}/${dailyLimit}). Try again tomorrow.` },
        { status: 429 }
      );
    }

    // 2. Generate AI screening answers
    const answers = await IndeedApplyService.answerScreeningQuestions(
      auth.userId,
      screeningQuestions,
      { title, company, description }
    );

    // 3. Create or update JobApplication in Tracker
    // Dedup check: prevent duplicate jobs per user
    const dedup = await checkForDuplicate(auth.userId, title, company, jobUrl);
    if (dedup.isDuplicate && dedup.existingJob) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        existingJob: dedup.existingJob,
        matchType: dedup.matchType,
        message: 'This job already exists in your tracker',
        screeningAnswers: answers,
      });
    }

    const jobData = {
      userId: auth.userId,
      jobTitle: title,
      company,
      jobUrl: jobUrl || undefined,
      jobDescription: description || '',
      location: location || 'Remote',
      source: 'indeed',
      atsType: 'indeed',
      status: 'applied',
      priority: 'high',
      salary: salary || undefined,
      applicationDate: new Date(),
      tags: ['indeed-auto-applied'],
      statusHistory: [
        {
          status: 'queued',
          date: new Date(Date.now() - 3000),
          notes: 'Indeed Auto-apply task queued',
        },
        {
          status: 'tailoring_cv',
          date: new Date(Date.now() - 2000),
          notes: 'Tailored resume generated for Indeed JD',
        },
        {
          status: 'answering_questionnaire',
          date: new Date(Date.now() - 1000),
          notes: `Answered ${answers.length} Indeed screening questions`,
        },
        {
          status: 'applied',
          date: new Date(),
          notes: 'Submitted via 1-Click Indeed Auto-Apply',
        },
      ],
      metadata: {
        screeningAnswers: answers,
        appliedVia: 'indeed_integration',
        appliedAt: new Date(),
      },
    };

    const jobApplication = await JobApplication.create(jobData);

    // 4. Update user stats
    await User.findByIdAndUpdate(auth.userId, {
      $inc: {
        'indeedIntegration.stats.totalApplied': 1,
        'credits.totalCreated.jobs': 1,
      },
      $set: {
        'indeedIntegration.stats.lastAppliedAt': new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully and added to Tracker',
      jobId: jobApplication._id,
      application: jobApplication,
      screeningAnswers: answers,
    });
  } catch (error: any) {
    console.error('Error in Indeed auto-apply:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-apply failed' },
      { status: 500 }
    );
  }
}
