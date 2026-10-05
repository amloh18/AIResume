// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import type { JobsMetrics, Job, JobMatch, Application } from '@/types/automation-schema';

export async function GET(request: NextRequest) {
  try {
    // Identity from the session — a request header is not authentication.
    const auth = await getAuthenticatedUser(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }
    const userId = auth.userId;

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    let userObjId;
    try {
      userObjId = new ObjectId(userId);
    } catch (e) {
      userObjId = userId;
    }

    const [matches, applications] = await Promise.all([
      db
        .collection<JobMatch>('job_matches')
        .find({ userId: userObjId })
        .toArray(),
      db
        .collection<Application>('applications')
        .find({ userId: userObjId })
        .toArray(),
    ]);

    if (matches.length === 0) {
      return NextResponse.json({
        totalJobsMatched: 0,
        averageMatchScore: 0,
        applicationSuccessRate: 0,
        pendingApplications: 0,
        appliedThisWeek: 0,
        appliedLastWeek: 0,
        companiesCount: 0,
        locationsCount: 0,
        sourceDistribution: {},
        salaryStats: { min: 0, max: 0, average: 0, median: 0 },
        matchDistribution: { excellent: 0, good: 0, moderate: 0, fair: 0, low: 0 },
        topCompanies: [],
        topLocations: [],
        trendData: [],
      } as JobsMetrics);
    }

    const jobIds = matches.map((m) => m.jobId);
    const jobs = await db
      .collection<Job>('jobs')
      .find({ _id: { $in: jobIds } })
      .toArray();

    const totalJobsMatched = matches.length;
    const averageMatchScore =
      matches.reduce((sum, m) => sum + m.score, 0) / matches.length;

    const appliedApps = applications.filter((app) => app.status === 'applied');
    const interviewOrOfferApps = applications.filter((app) =>
      ['interview', 'offer'].includes(app.status)
    );
    const applicationSuccessRate =
      appliedApps.length > 0
        ? (interviewOrOfferApps.length / appliedApps.length) * 100
        : 0;

    const pendingApplications = applications.filter((app) =>
      ['queued', 'applying'].includes(app.status)
    ).length;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const appliedThisWeek = applications.filter(
      (app) => app.createdAt && new Date(app.createdAt) >= oneWeekAgo && ['applied', 'interview', 'offer'].includes(app.status)
    ).length;

    const appliedLastWeek = applications.filter(
      (app) =>
        app.createdAt && new Date(app.createdAt) >= twoWeeksAgo &&
        new Date(app.createdAt) < oneWeekAgo &&
        ['applied', 'interview', 'offer'].includes(app.status)
    ).length;

    const companies = new Set(jobs.map((job) => job.company));
    const companiesCount = companies.size;

    const locations = new Set(jobs.map((job) => job.location));
    const locationsCount = locations.size;

    const sourceDistribution: Record<string, number> = {};
    jobs.forEach((job) => {
      sourceDistribution[job.source] = (sourceDistribution[job.source] || 0) + 1;
    });

    const salaries = jobs
      .filter((job) => job.salaryMin && job.salaryMin > 0)
      .map((job) => job.salaryMin!);
    
    const salaryStats = {
      min: salaries.length > 0 ? Math.min(...salaries) : 0,
      max: salaries.length > 0 ? Math.max(...salaries) : 0,
      average: salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
      median: salaries.length > 0 ? salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)] : 0,
    };

    const matchDistribution = {
      excellent: matches.filter((m) => m.score >= 80).length,
      good: matches.filter((m) => m.score >= 60 && m.score < 80).length,
      moderate: matches.filter((m) => m.score >= 40 && m.score < 60).length,
      fair: matches.filter((m) => m.score >= 20 && m.score < 40).length,
      low: matches.filter((m) => m.score < 20).length,
    };

    const companyJobCount = new Map<string, { count: number; totalScore: number }>();
    jobs.forEach((job) => {
      const match = matches.find((m) => m.jobId.toString() === job._id.toString());
      const current = companyJobCount.get(job.company) || { count: 0, totalScore: 0 };
      companyJobCount.set(job.company, {
        count: current.count + 1,
        totalScore: current.totalScore + (match?.score || 0),
      });
    });

    const topCompanies = Array.from(companyJobCount.entries())
      .map(([company, data]) => ({
        company,
        count: data.count,
        avgMatch: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const locationJobCount = new Map<string, number>();
    jobs.forEach((job) => {
      locationJobCount.set(job.location, (locationJobCount.get(job.location) || 0) + 1);
    });

    const topLocations = Array.from(locationJobCount.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyData = new Map<string, { applications: number; matches: number }>();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.set(dateStr, { applications: 0, matches: 0 });
    }

    applications.forEach((app) => {
      if (app.createdAt && new Date(app.createdAt) >= thirtyDaysAgo) {
        const dateStr = new Date(app.createdAt).toISOString().split('T')[0];
        const data = dailyData.get(dateStr);
        if (data) {
          data.applications++;
        }
      }
    });

    matches.forEach((match) => {
      if (match.createdAt && new Date(match.createdAt) >= thirtyDaysAgo) {
        const dateStr = new Date(match.createdAt).toISOString().split('T')[0];
        const data = dailyData.get(dateStr);
        if (data) {
          data.matches++;
        }
      }
    });

    const trendData = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        applications: data.applications,
        matches: data.matches,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const metrics: JobsMetrics = {
      totalJobsMatched,
      averageMatchScore: Math.round(averageMatchScore),
      applicationSuccessRate: Math.round(applicationSuccessRate * 10) / 10,
      pendingApplications,
      appliedThisWeek,
      appliedLastWeek,
      companiesCount,
      locationsCount,
      sourceDistribution,
      salaryStats,
      matchDistribution,
      topCompanies,
      topLocations,
      trendData,
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('[API] GET /api/jobs/metrics error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch metrics',
        },
      },
      { status: 500 }
    );
  }
}
