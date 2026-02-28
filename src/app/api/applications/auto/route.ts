import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { ApplicationService } from '@/lib/services/applicationService';
import { AutomationService } from '@/lib/services/automationService';
import type { Job, JobMatch, AdminRules, AutoApplyResponse } from '@/types/automation-schema';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'jobId is required' } },
        { status: 400 }
      );
    }

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const [isEnabled, hasReachedLimit, cooldownRemaining, job, match, adminRules] = await Promise.all([
      AutomationService.isAutomationEnabled(userId),
      AutomationService.checkDailyLimit(userId).then(canApply => !canApply),
      AutomationService.getFailureCooldownRemaining(userId),
      db.collection<Job>('jobs').findOne({ _id: new ObjectId(jobId) }),
      db.collection<JobMatch>('job_matches').findOne({
        userId: new ObjectId(userId),
        jobId: new ObjectId(jobId),
      }),
      db.collection<AdminRules>('admin_rules').findOne({}),
    ]);

    if (!isEnabled) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTOMATION_DISABLED',
            message: 'Automation is not enabled for your account',
          },
        },
        { status: 403 }
      );
    }

    if (hasReachedLimit) {
      return NextResponse.json(
        {
          error: {
            code: 'DAILY_LIMIT_EXCEEDED',
            message: 'You have reached your daily application limit',
          },
        },
        { status: 429 }
      );
    }

    if (cooldownRemaining > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'COOLDOWN_ACTIVE',
            message: `Your account is in cooldown. Resume in ${cooldownRemaining} hours`,
            details: { cooldownHoursRemaining: cooldownRemaining },
          },
        },
        { status: 429 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      );
    }

    if (!match || !match.eligibleForAutoApply) {
      return NextResponse.json(
        {
          error: {
            code: 'JOB_NOT_ELIGIBLE',
            message: 'This job is not eligible for auto-apply',
          },
        },
        { status: 403 }
      );
    }

    if (job.atsType === 'unknown') {
      return NextResponse.json(
        {
          error: {
            code: 'ATS_UNSUPPORTED',
            message: 'ATS type is not supported for auto-apply',
          },
        },
        { status: 403 }
      );
    }

    if (adminRules && !adminRules.globalAutoApplyEnabled) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTOMATION_DISABLED',
            message: 'Auto-apply is temporarily disabled',
          },
        },
        { status: 503 }
      );
    }

    const existingApp = await ApplicationService.getApplicationByJobId(userId, jobId);
    if (existingApp) {
      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_APPLIED',
            message: 'You have already applied to this job',
          },
        },
        { status: 409 }
      );
    }

    const settings = await AutomationService.getAutomationSettings(userId);
    const mode = settings?.mode || 'assisted';

    const application = await ApplicationService.createApplication(
      userId,
      jobId,
      mode
    );

    await ApplicationService.updateApplicationStatus(
      application._id.toString(),
      'queued'
    );

    const response: AutoApplyResponse = {
      applicationId: application._id.toString(),
      status: 'queued',
      queuePosition: undefined,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[API] POST /api/applications/auto error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to queue application',
        },
      },
      { status: 500 }
    );
  }
}
