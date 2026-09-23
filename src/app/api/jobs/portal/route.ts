/**
 * API Route: /api/jobs/portal
 * 
 * Fetches jobs from external job portals:
 * - Apify LinkedIn
 * - Apify Indeed
 * - SerpAPI Google Jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import PortalFetcherService, { JobSearchCriteria, JobListing } from '@/lib/services/portal-fetcher-service';
import QuotaService from '@/lib/services/quota-service';

// Sample jobs for demo/fallback
const sampleJobs: JobListing[] = [
  {
    id: '1',
    source: 'linkedin',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'London, UK',
    description: 'We are looking for a Senior Software Engineer to join our team...',
    jobUrl: 'https://linkedin.com/jobs/view/123456',
    salary: { min: 60000, max: 80000, currency: 'GBP', period: 'yearly' },
    remote: true,
    matchScore: 92,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    source: 'indeed',
    title: 'Full Stack Developer',
    company: 'StartupXYZ',
    location: 'Bangalore, India',
    description: 'Join our fast-growing startup as a Full Stack Developer...',
    jobUrl: 'https://indeed.com/jobs/123456',
    salary: { min: 1500000, max: 2500000, currency: 'INR', period: 'yearly' },
    remote: true,
    matchScore: 88,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    source: 'google',
    title: 'Backend Engineer',
    company: 'Google',
    location: 'Hyderabad, India',
    description: 'Work on Google Cloud Platform as a Backend Engineer...',
    jobUrl: 'https://careers.google.com/jobs/123456',
    salary: { min: 2000000, max: 3500000, currency: 'INR', period: 'yearly' },
    remote: false,
    matchScore: 85,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    source: 'linkedin',
    title: 'Product Manager',
    company: 'Amazon',
    location: 'London, UK',
    description: 'Lead product strategy for Amazon Web Services...',
    jobUrl: 'https://linkedin.com/jobs/view/234567',
    salary: { min: 55000, max: 75000, currency: 'GBP', period: 'yearly' },
    remote: false,
    matchScore: 78,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    source: 'indeed',
    title: 'DevOps Engineer',
    company: 'Microsoft',
    location: 'Remote',
    description: 'Join the Azure DevOps team...',
    jobUrl: 'https://indeed.com/jobs/234567',
    salary: { min: 1800000, max: 3000000, currency: 'INR', period: 'yearly' },
    remote: true,
    matchScore: 75,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '6',
    source: 'linkedin',
    title: 'Frontend Developer',
    company: 'Meta',
    location: 'Dublin, Ireland',
    description: 'Build React applications for Instagram...',
    jobUrl: 'https://linkedin.com/jobs/view/345678',
    salary: { min: 70000, max: 90000, currency: 'EUR', period: 'yearly' },
    remote: true,
    matchScore: 72,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '7',
    source: 'google',
    title: 'Data Scientist',
    company: 'Netflix',
    location: 'Mumbai, India',
    description: 'Work on recommendation algorithms...',
    jobUrl: 'https://careers.netflix.com/jobs/123456',
    salary: { min: 2200000, max: 4000000, currency: 'INR', period: 'yearly' },
    remote: false,
    matchScore: 70,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '8',
    source: 'indeed',
    title: 'Cloud Architect',
    company: 'Accenture',
    location: 'Pune, India',
    description: 'Design cloud solutions for enterprise clients...',
    jobUrl: 'https://indeed.com/jobs/345678',
    salary: { min: 2000000, max: 3200000, currency: 'INR', period: 'yearly' },
    remote: true,
    matchScore: 68,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function GET(request: NextRequest) {
  try {
    /*
      Identity from the session. The header path and the `demo-user-<timestamp>` fallback are gone: the
      fallback meant every call queried a brand-new, empty identity, so the response was fiction rather
      than anyone's real search.
    */
    const auth = await getAuthenticatedUser(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User authentication required' } },
        { status: 401 }
      );
    }
    const userId = auth.userId;

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
    const location = searchParams.get('location') || '';
    const region = (searchParams.get('region') as 'UK' | 'India') || 'UK';
    const remoteOnly = searchParams.get('remote') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const useCache = searchParams.get('cache') !== 'false';
    const action = searchParams.get('action');

    // Build search criteria
    const criteria: JobSearchCriteria = {
      keywords: keywords.length > 0 ? keywords : ['software engineer', 'developer'],
      location,
      region,
      remoteOnly,
      page,
      limit,
    };

    // Get user's plan type (would come from user data in production)
    const planType = 'free' as const;

    let jobs: JobListing[] = [];
    let errorMessage = '';

    // Try to fetch from external APIs
    try {
      if (useCache) {
        try {
          jobs = await PortalFetcherService.fetchJobs(criteria, userId, planType);
        } catch (apiError: any) {
          errorMessage = apiError.message;
          console.error('Error fetching from external APIs:', apiError);
          // Fall back to cached jobs or sample data
          try {
            jobs = await PortalFetcherService.getCachedJobs(criteria);
          } catch {
            jobs = [];
          }
        }
      } else {
        jobs = await PortalFetcherService.fetchJobs(criteria, userId, planType);
      }
    } catch (apiError: any) {
      errorMessage = apiError.message;
      console.error('API fetch error:', apiError);
    }

    // If no jobs from API, use sample data for demo
    if (jobs.length === 0) {
      jobs = sampleJobs;
      
      // Filter based on region
      if (region === 'UK') {
        jobs = jobs.filter(j => j.location.includes('UK') || j.location.includes('London') || j.salary?.currency === 'GBP');
      } else if (region === 'India') {
        jobs = jobs.filter(j => j.location.includes('India') || j.salary?.currency === 'INR');
      }
      
      // Filter by keywords if provided
      if (keywords.length > 0) {
        const keywordLower = keywords.map(k => k.toLowerCase());
        jobs = jobs.filter(j => 
          keywordLower.some(k => j.title.toLowerCase().includes(k) || j.description.toLowerCase().includes(k))
        );
      }
      
      // Filter by location if provided
      if (location) {
        jobs = jobs.filter(j => j.location.toLowerCase().includes(location.toLowerCase()));
      }
      
      // Filter remote only
      if (remoteOnly) {
        jobs = jobs.filter(j => j.remote);
      }
    }

    // Get quota status for response headers
    let quotaStatus;
    try {
      quotaStatus = await QuotaService.getQuotaDisplay(userId, planType);
    } catch {
      // Fallback if quota service fails
      quotaStatus = {
        hourly: { limit: 50, remaining: 50, used: 0 },
        daily: { limit: 100, remaining: 100, used: 0 },
        monthly: { limit: 500, remaining: 500, used: 0 },
        plan: 'free'
      };
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        jobs: jobs.slice(0, limit),
        total: jobs.length,
        page,
        limit,
        hasMore: jobs.length > limit,
        quota: quotaStatus,
        message: errorMessage || null,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit-Hourly': quotaStatus.hourly.limit.toString(),
          'X-RateLimit-Remaining-Hourly': quotaStatus.hourly.remaining.toString(),
          'X-RateLimit-Limit-Daily': quotaStatus.daily.limit.toString(),
          'X-RateLimit-Remaining-Daily': quotaStatus.daily.remaining.toString(),
        },
      }
    );

  } catch (error: any) {
    console.error('Error in jobs/portal API:', error);

    // Check if it's a quota error
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'QUOTA_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // Return sample data on error for demo purposes
    return NextResponse.json(
      {
        success: true,
        jobs: sampleJobs.slice(0, 8),
        total: sampleJobs.length,
        page: 1,
        limit: 20,
        hasMore: false,
        quota: {
          hourly: { limit: 50, remaining: 50, used: 0 },
          daily: { limit: 100, remaining: 100, used: 0 },
          monthly: { limit: 500, remaining: 500, used: 0 },
          plan: 'free'
        },
        message: 'Using sample data - API unavailable',
      },
      { status: 200 }
    );
  }
}

/**
 * POST /api/jobs/portal
 * 
 * Trigger a fresh fetch from external portals
 */
export async function POST(request: NextRequest) {
  try {
    // Identity from the session — see the note on GET.
    const auth = await getAuthenticatedUser(request);
    if (!auth?.userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User authentication required' } },
        { status: 401 }
      );
    }
    const userId = auth.userId;

    const body = await request.json();

    const { keywords, location, region, remoteOnly } = body;

    // Build search criteria
    const criteria: JobSearchCriteria = {
      keywords: keywords || ['software engineer'],
      location: location || '',
      region: region || 'UK',
      remoteOnly: remoteOnly || false,
      limit: 50,
    };

    // Get plan type
    const planType = 'free' as const;

    // Fetch jobs
    let jobs: JobListing[] = [];
    
    try {
      jobs = await PortalFetcherService.fetchJobs(criteria, userId, planType);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Return sample data on error
      jobs = sampleJobs;
    }

    // If no jobs from API, use sample data
    if (jobs.length === 0) {
      jobs = sampleJobs;
    }

    return NextResponse.json({
      success: true,
      jobs,
      count: jobs.length,
      message: `Successfully fetched ${jobs.length} jobs`,
    });

  } catch (error: any) {
    console.error('Error in jobs/portal POST:', error);

    return NextResponse.json(
      {
        success: true,
        jobs: sampleJobs,
        count: sampleJobs.length,
        message: 'Using sample data - API error: ' + error.message,
      },
      { status: 200 }
    );
  }
}
