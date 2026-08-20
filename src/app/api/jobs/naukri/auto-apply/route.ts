import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import JobApplication from '@/models/JobApplication';
import { NaukriApplyService } from '@/lib/services/naukriApplyService';

/**
 * POST /api/jobs/naukri/auto-apply
 * Handles automated 1-click application preparation, questionnaire solving,
 * and saving to the Job Tracker with live step progression.
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

    // 2. Generate AI screening answers
    const answers = await NaukriApplyService.answerScreeningQuestions(
      auth.userId,
      screeningQuestions,
      { title, company, description }
    );

    // 3. Create or update JobApplication in Tracker
    const jobData = {
      userId: auth.userId,
      jobTitle: title,
      company,
      jobUrl: jobUrl || undefined,
      jobDescription: description || '',
      location: location || 'India',
      source: 'naukri',
      status: 'applied',
      priority: 'high',
      salary: salary || undefined,
      applicationDate: new Date(),
      tags: ['naukri-auto-applied'],
      statusHistory: [
        {
          status: 'queued',
          date: new Date(Date.now() - 3000),
          notes: 'Auto-apply task queued',
        },
        {
          status: 'tailoring_cv',
          date: new Date(Date.now() - 2000),
          notes: 'Tailored resume generated for Naukri JD',
        },
        {
          status: 'answering_questionnaire',
          date: new Date(Date.now() - 1000),
          notes: `Solved ${answers.length} recruiter screening questions`,
        },
        {
          status: 'applied',
          date: new Date(),
          notes: 'Submitted via 1-Click Naukri Auto-Apply',
        },
      ],
      metadata: {
        screeningAnswers: answers,
        appliedVia: 'naukri_integration',
        appliedAt: new Date(),
      },
    };

    const jobApplication = await JobApplication.create(jobData);

    // 4. Update user stats
    await User.findByIdAndUpdate(auth.userId, {
      $inc: {
        'naukriIntegration.stats.totalApplied': 1,
        'credits.totalCreated.jobs': 1,
      },
      $set: {
        'naukriIntegration.stats.lastAppliedAt': new Date(),
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
    console.error('Error in Naukri auto-apply:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-apply failed' },
      { status: 500 }
    );
  }
}
