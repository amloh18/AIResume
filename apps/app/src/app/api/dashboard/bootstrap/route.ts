import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

export const dynamic = 'force-dynamic';

/**
 * Dashboard Bootstrap API
 *
 * Returns a small, focused payload of dashboard-critical data that can be
 * prefetched immediately after authentication. This eliminates the waterfall
 * where Dashboard must mount -> fetch auth -> fetch 13 endpoints sequentially.
 *
 * The payload includes ONLY what's needed for the initial dashboard shell:
 * - User basics (name, email, avatar)
 * - Profile completion status
 * - Master CV existence
 * - Summary counts (jobs, applications, CVs, cover letters)
 * - Recent jobs (lightweight, first 5)
 * - Recent applications (lightweight, first 5)
 * - Onboarding status
 *
 * Full CV data, job details, analytics, and heavy payloads remain on-demand.
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authResult;
    // `User.findById` and the `Job` / `CV` / `CoverLetter` queries key on an `ObjectId` path, so the
    // cast value is exact for them. `JobApplication.userId` is `Schema.Types.Mixed` and is therefore
    // **not** cast — it needs both shapes or it silently misses the string-stored rows (SB-06;
    // measured on production 2026-09-27: objectId 84 / string 15).
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const userFilter = mixedIdFilter(userId);

    // Import models dynamically to avoid circular dependencies
    const { default: User } = await import('@/models/User');
    const { default: CV } = await import('@/models/CV');
    const { default: Job } = await import('@/models/Job');
    const { default: JobApplication } = await import('@/models/JobApplication');
    const { default: CoverLetter } = await import('@/models/CoverLetter');

    // Run all independent queries in parallel
    const [userDoc, cvCount, jobCount, applicationCounts, recentJobs, recentApplications, coverLetterCount] =
      await Promise.all([
        // User basics - only fields needed for dashboard shell
        User.findById(userObjectId)
          .select('firstName lastName email avatar onboarding currentPlanKey subscription')
          .lean()
          .exec() as Promise<any>,

        // CV count (lightweight)
        CV.countDocuments({ userId: userObjectId }),

        // Job count (lightweight)
        Job.countDocuments({ userId: userObjectId }),

        // Application status counts - single aggregation pipeline
        // (`$match` on a Mixed path needs both shapes too — an aggregation does not cast.)
        JobApplication.aggregate([
          { $match: { userId: userFilter } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        // Recent jobs - lightweight projection, limited to 5
        Job.find({ userId: userObjectId })
          .select('jobTitle company companyLogo location status priority applicationDate createdAt')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        // Recent applications - lightweight projection, limited to 5
        JobApplication.find({ userId: userFilter })
          .select('jobTitle company companyLogo status location applicationDate createdAt')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        // Cover letter count
        CoverLetter.countDocuments({ userId: userObjectId }),
      ]);

    const user = userDoc as any;

    // Build application summary from aggregation
    const applicationSummary = {
      total: 0,
      saved: 0,
      created: 0,
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      accepted: 0,
      withdrawn: 0,
    };

    for (const item of applicationCounts) {
      const status = item._id as keyof typeof applicationSummary;
      if (status in applicationSummary) {
        applicationSummary[status] = item.count;
        applicationSummary.total += item.count;
      }
    }

    // Profile completion status (lightweight)
    const onboarding = user?.onboarding;
    const profileComplete = onboarding?.activation_status === 'complete';

    const duration = Date.now() - startTime;
    console.log(`⚡ Bootstrap API: ${duration}ms for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        user: user
          ? {
              id: user._id.toString(),
              name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
              email: user.email,
              avatar: user.avatar,
            }
          : null,
        profile: {
          completionStatus: profileComplete ? 'complete' : 'pending',
          activationRoute: onboarding?.activation_route || null,
          masterCvExists: cvCount > 0,
        },
        summary: {
          cvs: cvCount,
          jobs: jobCount,
          applications: applicationSummary,
          coverLetters: coverLetterCount,
        },
        recentJobs,
        recentApplications,
        _meta: {
          generatedAt: new Date().toISOString(),
          duration,
        },
      },
    });
  } catch (error: any) {
    console.error('Bootstrap API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load dashboard bootstrap' },
      { status: 500 }
    );
  }
}
