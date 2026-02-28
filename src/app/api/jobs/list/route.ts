import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { Job, JobMatch, Application, PaginatedJobsResponse, JobListing } from '@/types/automation-schema';
import { MATCH_SCORE_THRESHOLDS } from '@/types/automation-schema';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const minScore = parseInt(searchParams.get('minScore') || String(MATCH_SCORE_THRESHOLDS.DISPLAY_MIN));
    
    const filters = {
      searchText: searchParams.get('searchText') || undefined,
      matchScoreMin: parseInt(searchParams.get('matchScoreMin') || String(minScore)),
      matchScoreMax: parseInt(searchParams.get('matchScoreMax') || '100'),
      companies: searchParams.get('companies')?.split(',').filter(Boolean),
      locations: searchParams.get('locations')?.split(',').filter(Boolean),
      sources: searchParams.get('sources')?.split(',').filter(Boolean),
      atsTypes: searchParams.get('atsTypes')?.split(',').filter(Boolean),
      appliedStatus: searchParams.get('appliedStatus')?.split(',').filter(Boolean),
      sortBy: (searchParams.get('sortBy') as any) || 'matchScore',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const matchQuery: any = {
      userId: new ObjectId(userId),
      score: { $gte: filters.matchScoreMin, $lte: filters.matchScoreMax },
    };

    const matches = await db
      .collection<JobMatch>('job_matches')
      .find(matchQuery)
      .toArray();

    if (matches.length === 0) {
      return NextResponse.json({
        jobs: [],
        total: 0,
        page,
        pageSize: limit,
        hasMore: false,
      } as PaginatedJobsResponse);
    }

    const jobIds = matches.map((m) => m.jobId);
    const jobQuery: any = { _id: { $in: jobIds } };

    if (filters.searchText) {
      jobQuery.$or = [
        { title: { $regex: filters.searchText, $options: 'i' } },
        { company: { $regex: filters.searchText, $options: 'i' } },
      ];
    }

    if (filters.companies && filters.companies.length > 0) {
      jobQuery.company = { $in: filters.companies };
    }

    if (filters.locations && filters.locations.length > 0) {
      jobQuery.location = { $in: filters.locations };
    }

    if (filters.sources && filters.sources.length > 0) {
      jobQuery.source = { $in: filters.sources };
    }

    if (filters.atsTypes && filters.atsTypes.length > 0) {
      jobQuery.atsType = { $in: filters.atsTypes };
    }

    const jobs = await db.collection<Job>('jobs').find(jobQuery).toArray();

    const applications = await db
      .collection<Application>('applications')
      .find({
        userId: new ObjectId(userId),
        jobId: { $in: jobIds },
      })
      .toArray();

    const applicationsMap = new Map(
      applications.map((app) => [app.jobId.toString(), app])
    );

    const matchesMap = new Map(
      matches.map((match) => [match.jobId.toString(), match])
    );

    let jobListings: JobListing[] = jobs.map((job) => {
      const match = matchesMap.get(job._id.toString());
      const application = applicationsMap.get(job._id.toString());

      return {
        _id: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency || 'GBP',
        matchScore: match?.score || 0,
        matchBreakdown: match?.breakdown,
        source: job.source,
        atsType: job.atsType,
        applyUrl: job.applyUrl,
        postedDate: job.postedDate,
        appliedStatus: application?.status,
        userId,
        description: job.description,
        keywords: job.keywords,
      };
    });

    if (filters.appliedStatus && filters.appliedStatus.length > 0) {
      jobListings = jobListings.filter((job) =>
        job.appliedStatus ? filters.appliedStatus!.includes(job.appliedStatus) : false
      );
    }

    const sortField = filters.sortBy;
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    jobListings.sort((a, b) => {
      let aVal: any = a[sortField as keyof JobListing];
      let bVal: any = b[sortField as keyof JobListing];

      if (sortField === 'salary') {
        aVal = a.salaryMin || 0;
        bVal = b.salaryMin || 0;
      }

      if (sortField === 'postedDate') {
        aVal = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        bVal = b.postedDate ? new Date(b.postedDate).getTime() : 0;
      }

      if (aVal < bVal) return -sortOrder;
      if (aVal > bVal) return sortOrder;
      return 0;
    });

    const total = jobListings.length;
    const skip = (page - 1) * limit;
    const paginatedJobs = jobListings.slice(skip, skip + limit);
    const hasMore = skip + limit < total;

    return NextResponse.json({
      jobs: paginatedJobs,
      total,
      page,
      pageSize: limit,
      hasMore,
    } as PaginatedJobsResponse);
  } catch (error: any) {
    console.error('[API] GET /api/jobs/list error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch jobs',
        },
      },
      { status: 500 }
    );
  }
}
