import { NextRequest, NextResponse } from 'next/server';
import type {
  JobListing,
  PaginatedJobsResponse,
} from '@/types/automation-schema';
import { MATCH_SCORE_THRESHOLDS } from '@/types/automation-schema';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobDiscoveryService, type DiscoveryCriteria, type DiscoveryRegion } from '@/lib/services/jobDiscoveryService';

const validRegions: DiscoveryRegion[] = ['UK', 'India', 'Global'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const countriesParam = searchParams.get('countries');
    const countryList = countriesParam ? countriesParam.split(',').map((c) => c.trim()).filter(Boolean) : [];

    let region: DiscoveryRegion = 'Global';
    if (countryList.length === 1 && countryList[0].toLowerCase() === 'india') {
      region = 'India';
    } else if (countryList.length === 1 && (countryList[0].toLowerCase() === 'united kingdom' || countryList[0].toLowerCase() === 'uk')) {
      region = 'UK';
    } else {
      const regionParam = (searchParams.get('region') || 'Global') as DiscoveryRegion;
      region = validRegions.includes(regionParam) ? regionParam : 'Global';
    }

    const keywords = searchParams
      .get('keywords')
      ?.split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const remoteOnly = searchParams.get('remoteOnly') === 'true';

    const companyFilter = searchParams.get('companies')?.split(',').filter(Boolean) || [];
    const locationFilter = searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const sourceFilter = searchParams.get('sources')?.split(',').filter(Boolean) || [];
    const atsFilter = searchParams.get('atsTypes')?.split(',').filter(Boolean) || [];
    const workplaceFilter = searchParams.get('workplaceType')?.split(',').filter(Boolean) || [];
    const roleFilter = searchParams.get('roles')?.split(',').filter(Boolean) || [];
    const jobTypeFilter = searchParams.get('jobTypes')?.split(',').filter(Boolean) || [];
    const experienceFilter = searchParams.get('experienceLevel')?.split(',').filter(Boolean) || [];
    const datePostedFilter = searchParams.get('datePosted');
    const sponsorsVisaFilter = searchParams.get('sponsorsVisa') === 'true';

    const matchScoreMax = parseInt(
      searchParams.get('matchScoreMax') || '100'
    );
    const sortBy = (searchParams.get('sortBy') || 'matchScore') as string;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Resolve the real user (session cookie or extension token); may be null.
    const auth = await authenticateRequest(request);
    const userId = auth?.userId;

    const criteria: DiscoveryCriteria = {
      region,
      keywords,
      remoteOnly,
      limit,
      ingestLimit: Math.max(60, limit * 2),
    };

    const discovered = await JobDiscoveryService.fetchAndStore(criteria);

    if (discovered.length === 0) {
      return NextResponse.json({
        jobs: [],
        total: 0,
        page,
        pageSize: limit,
        hasMore: false,
      } as PaginatedJobsResponse);
    }

    const scores = await JobDiscoveryService.scoreDiscoveredJobs(discovered, userId);

    let listings: JobListing[] = discovered.map((job) => {
      const scored = scores.get(job.externalId);
      return {
        _id: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency || undefined,
        matchScore: scored?.score || 0,
        matchBreakdown: scored?.breakdown,
        source: (job.source || 'discovery') as any,
        atsType: job.atsType,
        applyUrl: job.applyUrl,
        postedDate: job.postedDate || (job as any).postedAt,
        userId: userId || '',
        description: job.description,
        keywords: job.keywords,
      };
    });

    if (companyFilter.length > 0) {
      listings = listings.filter((job) =>
        companyFilter.some((c) => job.company.toLowerCase().includes(c.toLowerCase()))
      );
    }

    if (locationFilter.length > 0) {
      listings = listings.filter((job) =>
        locationFilter.some((loc) => job.location.toLowerCase().includes(loc.toLowerCase()))
      );
    }

    if (sourceFilter.length > 0) {
      listings = listings.filter((job) => sourceFilter.includes(job.source));
    }

    if (atsFilter.length > 0) {
      listings = listings.filter((job) => atsFilter.includes(job.atsType));
    }

    // Country list filter
    if (countryList.length > 0 && !countryList.includes('Worldwide / Remote')) {
      listings = listings.filter((job) => {
        if (job.remote) return true;
        const locLower = job.location.toLowerCase();
        return countryList.some((c) => {
          const cLower = c.toLowerCase();
          if (cLower === 'india') return locLower.includes('india') || locLower.includes('bangalore') || locLower.includes('mumbai') || locLower.includes('pune') || locLower.includes('delhi') || locLower.includes('hyderabad') || locLower.includes('noida') || locLower.includes('gurgaon');
          if (cLower === 'united kingdom' || cLower === 'uk') return locLower.includes('uk') || locLower.includes('united kingdom') || locLower.includes('london') || locLower.includes('manchester') || locLower.includes('edinburgh');
          if (cLower === 'united states' || cLower === 'us') return locLower.includes('us') || locLower.includes('united states') || locLower.includes('san francisco') || locLower.includes('new york') || locLower.includes('austin') || locLower.includes('seattle');
          if (cLower === 'germany') return locLower.includes('germany') || locLower.includes('berlin') || locLower.includes('munich');
          if (cLower === 'canada') return locLower.includes('canada') || locLower.includes('toronto') || locLower.includes('vancouver');
          if (cLower === 'singapore') return locLower.includes('singapore');
          if (cLower === 'australia') return locLower.includes('australia') || locLower.includes('sydney') || locLower.includes('melbourne');
          if (cLower === 'united arab emirates' || cLower === 'uae') return locLower.includes('dubai') || locLower.includes('abu dhabi') || locLower.includes('uae');
          return locLower.includes(cLower);
        });
      });
    }

    // Workplace Type filter (remote, hybrid, onsite)
    if (workplaceFilter.length > 0) {
      listings = listings.filter((job) => {
        const locLower = job.location.toLowerCase();
        const titleLower = job.title.toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const isRemote = job.remote || locLower.includes('remote') || titleLower.includes('remote');
        const isHybrid = locLower.includes('hybrid') || descLower.includes('hybrid');
        const isOnsite = !isRemote && !isHybrid;

        return (
          (workplaceFilter.includes('remote') && isRemote) ||
          (workplaceFilter.includes('hybrid') && isHybrid) ||
          (workplaceFilter.includes('onsite') && isOnsite)
        );
      });
    }

    // Role filter
    if (roleFilter.length > 0) {
      listings = listings.filter((job) => {
        const titleLower = job.title.toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        return roleFilter.some((role) => {
          const rLower = role.toLowerCase();
          return (
            titleLower.includes(rLower) ||
            job.keywords?.some((k) => k.toLowerCase().includes(rLower)) ||
            descLower.includes(rLower)
          );
        });
      });
    }

    // Job Type filter (fulltime, contract, parttime, internship)
    if (jobTypeFilter.length > 0) {
      listings = listings.filter((job) => {
        const text = `${job.title} ${job.description || ''}`.toLowerCase();
        return jobTypeFilter.some((jt) => {
          if (jt === 'fulltime') return text.includes('full-time') || text.includes('full time') || !text.includes('contract');
          if (jt === 'contract') return text.includes('contract') || text.includes('freelance') || text.includes('temporary');
          if (jt === 'parttime') return text.includes('part-time') || text.includes('part time');
          if (jt === 'internship') return text.includes('intern') || text.includes('internship');
          return false;
        });
      });
    }

    // Experience Level filter (entry, mid, senior, lead)
    if (experienceFilter.length > 0) {
      listings = listings.filter((job) => {
        const text = `${job.title} ${job.description || ''}`.toLowerCase();
        return experienceFilter.some((exp) => {
          if (exp === 'entry') return text.includes('junior') || text.includes('entry') || text.includes('graduate') || text.includes('0-2') || text.includes('1-2');
          if (exp === 'mid') return text.includes('mid') || text.includes('3-5') || text.includes('2-4');
          if (exp === 'senior') return text.includes('senior') || text.includes('sr.') || text.includes('5-8') || text.includes('5+');
          if (exp === 'lead') return text.includes('lead') || text.includes('principal') || text.includes('staff') || text.includes('architect') || text.includes('8+');
          return true;
        });
      });
    }

    // Date Posted filter (24h, 7d, 30d)
    if (datePostedFilter && datePostedFilter !== 'all') {
      const now = Date.now();
      const maxAgeMs =
        datePostedFilter === '24h'
          ? 24 * 60 * 60 * 1000
          : datePostedFilter === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      listings = listings.filter((job) => {
        const postedTime = job.postedDate ? new Date(job.postedDate).getTime() : now;
        return now - postedTime <= maxAgeMs;
      });
    }

    // Sponsors Visa filter
    if (sponsorsVisaFilter) {
      listings = listings.filter((job) => {
        const text = `${job.title} ${job.description || ''} ${job.location}`.toLowerCase();
        return (
          text.includes('visa') ||
          text.includes('sponsor') ||
          text.includes('relocation') ||
          text.includes('global') ||
          job.remote
        );
      });
    }

    const minScore = parseInt(
      searchParams.get('matchScoreMin') || String(MATCH_SCORE_THRESHOLDS.DISPLAY_MIN)
    );
    listings = listings.filter(
      (job) => job.matchScore >= minScore && job.matchScore <= matchScoreMax
    );

    const dir = sortOrder === 'asc' ? 1 : -1;
    listings.sort((a, b) => {
      if (sortBy === 'postedDate') {
        return ((a.postedDate?.getTime() || 0) - (b.postedDate?.getTime() || 0)) * dir;
      }
      if (sortBy === 'salary') {
        return ((a.salaryMin || 0) - (b.salaryMin || 0)) * dir;
      }
      if (sortBy === 'company') {
        return a.company.localeCompare(b.company) * dir;
      }
      return (a.matchScore - b.matchScore) * dir;
    });

    const total = listings.length;
    const start = (page - 1) * limit;
    const paginated = listings.slice(start, start + limit);

    return NextResponse.json({
      jobs: paginated,
      total,
      page,
      pageSize: limit,
      hasMore: start + limit < total,
    } as PaginatedJobsResponse);
  } catch (error: any) {
    console.error('[API] GET /api/jobs/discover error:', error);
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