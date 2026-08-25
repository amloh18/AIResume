import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import { UnifiedApplyService, ApplyJobContext } from '@/lib/services/unifiedApplyService';
import type { ATSType } from '@/types/automation-schema';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';

/**
 * POST /api/jobs/auto-apply
 * Unified auto-apply endpoint that handles all ATS types:
 * - Greenhouse, Lever, Ashby, Workable (public API apply)
 * - Naukri, Indeed (session-based apply)
 * - Adzuna (redirect to career page)
 * - Unknown ATS (generic handler)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobId,
      title,
      company,
      jobUrl,
      description,
      location,
      salary,
      atsType,
      source,
      screeningQuestions = [],
    } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: 'Job title and company are required' },
        { status: 400 }
      );
    }

    // Validate atsType
    const validAtsTypes: ATSType[] = ['greenhouse', 'lever', 'workable', 'naukri', 'indeed', 'adzuna', 'ashby', 'workday', 'unknown'];
    const resolvedAtsType: ATSType = validAtsTypes.includes(atsType) ? atsType : 'unknown';

    await getConnection();

    // Check job tracker limits
    const { checkJobLimit } = await import('@/lib/utils/subscription-helpers');
    const User = (await import('@/models/User')).default;
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

    // Check per-source daily limits
    const sourceName = source || resolvedAtsType;
    let sourceDailyLimit = 25;
    if (sourceName === 'naukri' && (user as any).naukriIntegration?.preferences?.dailyLimit) {
      sourceDailyLimit = (user as any).naukriIntegration.preferences.dailyLimit;
    } else if (sourceName === 'indeed' && (user as any).indeedIntegration?.preferences?.dailyLimit) {
      sourceDailyLimit = (user as any).indeedIntegration.preferences.dailyLimit;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const JobApplication = (await import('@/models/JobApplication')).default;
    const todayCount = await JobApplication.countDocuments({
      userId: auth.userId,
      source: sourceName,
      applicationDate: { $gte: todayStart },
    });

    if (todayCount >= sourceDailyLimit) {
      return NextResponse.json(
        {
          error: `Daily limit for ${sourceName} reached (${sourceDailyLimit}/${sourceDailyLimit}). Try again tomorrow.`,
          limitInfo: { source: sourceName, dailyLimit: sourceDailyLimit, used: todayCount },
        },
        { status: 429 }
      );
    }

    const sanitizedSource = sanitizeJobApplicationSource(source || resolvedAtsType);

    const context: ApplyJobContext = {
      jobId: jobId || `job_${Date.now()}`,
      title,
      company,
      description,
      location,
      salary,
      jobUrl: jobUrl || '',
      atsType: resolvedAtsType,
      source: sanitizedSource,
      screeningQuestions,
    };

    // Execute unified apply
    const result = await UnifiedApplyService.apply(auth.userId, context);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      applicationId: result.applicationId,
      status: result.status,
      atsType: result.atsType,
      screeningAnswers: result.screeningAnswers,
      nextStep: result.nextStep,
      error: result.error,
    }, { status: result.success ? 200 : 422 });
  } catch (error: any) {
    console.error('Error in unified auto-apply:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-apply failed' },
      { status: 500 }
    );
  }
}
