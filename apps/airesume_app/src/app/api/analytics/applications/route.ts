import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import { JobApplication, ApplicationJourney } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    console.log('Applications API: Request received', { range });

    // Get authenticated user to ensure we have the correct MongoDB ObjectId
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult || !authResult.userId) {
      console.log('Applications API: No authenticated user found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Calculate date range
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // JobApplication.userId is Mixed, so query both stored shapes (SB-06)
    const userFilter = mixedIdFilter(authResult.userId);

    console.log('Applications API: Using userId from authenticated user', { 
      userId: authResult.userId,
      userFilter 
    });

    // Fetch jobs and journeys in parallel (no data dependency)
    const [allJobs, journeys] = await Promise.all([
      JobApplication.find({
        userId: userFilter,
        createdAt: { $gte: startDate }
      }),
      // ApplicationJourney.userId is a String path; mixedIdFilter is safe and also covers
      // any legacy rows written with the ObjectId shape (SB-06).
      ApplicationJourney.find({ userId: mixedIdFilter(authResult.userId) }),
    ]);

    // Calculate application stats
    const totalApplications = allJobs.length;
    
    // Calculate status breakdown for spider chart: saved, created, applied, accepted, rejected
    const statusCounts = {
      saved: 0,
      created: 0,
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0
    };

    // Count jobs by status - use exact status matching
    allJobs.forEach(job => {
      const status = job.status?.toLowerCase() || 'created';
      switch (status) {
        case 'saved':
        case 'draft':
          statusCounts.saved++;
          break;
        case 'created':
          statusCounts.created++;
          break;
        case 'applied':
          statusCounts.applied++;
          break;
        case 'screening':
          statusCounts.screening++;
          break;
        case 'interview':
          statusCounts.interview++;
          break;
        case 'offer':
          statusCounts.offer++;
          break;
        case 'accepted':
          statusCounts.accepted++;
          break;
        case 'rejected':
          statusCounts.rejected++;
          break;
        case 'withdrawn':
          statusCounts.withdrawn++;
          break;
        default:
          // Default to 'created' for unknown statuses
          statusCounts.created++;
      }
    });

    // Calculate metrics:
    // - appliedApplications: jobs with status 'applied', 'screening', 'interview', 'offer', 'accepted', or 'rejected'
    //   (basically all jobs that have moved beyond 'created' stage)
    const appliedApplications = statusCounts.applied + 
                                statusCounts.screening + 
                                statusCounts.interview + 
                                statusCounts.offer + 
                                statusCounts.accepted + 
                                statusCounts.rejected;
    
    // - interviewApplications: jobs in 'interview' status
    const interviewApplications = statusCounts.interview;
    
    // - offerApplications: jobs with 'offer' or 'accepted' status
    const offerApplications = statusCounts.offer + statusCounts.accepted;
    
    // - pendingApplications: jobs that are in active stages (applied, screening, interview)
    const pendingApplications = statusCounts.applied + statusCounts.screening + statusCounts.interview;

    // Calculate rates
    const applicationRate = totalApplications > 0 
      ? Math.round((appliedApplications / totalApplications) * 100) 
      : 0;
    
    // Success rate: (accepted + offer) / applied applications
    const successfulApplications = statusCounts.accepted + statusCounts.offer;
    const successRate = appliedApplications > 0 
      ? Math.round((successfulApplications / appliedApplications) * 100) 
      : 0;

    const stats = {
      totalApplications,
      appliedApplications,
      pendingApplications,
      rejectedApplications: statusCounts.rejected,
      interviewApplications,
      offerApplications,
      // Spider chart data - map to simplified categories
      saved: statusCounts.saved,
      created: statusCounts.created,
      applied: statusCounts.applied + statusCounts.screening + statusCounts.interview, // All active application stages
      accepted: statusCounts.accepted + statusCounts.offer, // Successful outcomes
      rejected: statusCounts.rejected,
      applicationRate,
      successRate
    };

    console.log('Applications API: Stats calculated', {
      totalApplications,
      appliedApplications,
      pendingApplications,
      rejectedApplications: statusCounts.rejected,
      interviewApplications,
      offerApplications
    });

    return NextResponse.json({
      success: true,
      data: stats,
      summary: {
        dateRange: { start: startDate.toISOString(), end: now.toISOString() },
        totalJobs: totalApplications,
        totalJourneys: appliedApplications
      }
    });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch application stats' },
      { status: 500 }
    );
  }
}
