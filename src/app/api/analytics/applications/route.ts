import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import { JobApplication, ApplicationJourney } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || '30d';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Calculate date range
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch jobs for the user within the date range (using JobApplication model)
    const allJobs = await JobApplication.find({
      userId,
      createdAt: { $gte: startDate }
    });

    // Fetch CV journeys for the user
    const journeys = await ApplicationJourney.find({ userId });

    // Calculate application stats
    const totalApplications = allJobs.length;
    
    // Jobs with CV journeys are considered "applied"
    const appliedApplications = journeys.length;
    
    // Calculate status breakdown for spider chart: draft, created, applied, accepted, rejected
    const statusCounts = {
      draft: 0,
      created: 0,
      applied: 0,
      accepted: 0,
      rejected: 0
    };

    // Count jobs by status
    allJobs.forEach(job => {
      const status = job.status?.toLowerCase();
      switch (status) {
        case 'draft':
          statusCounts.draft++;
          break;
        case 'created':
          statusCounts.created++;
          break;
        case 'applied':
          statusCounts.applied++;
          break;
        case 'accepted':
          statusCounts.accepted++;
          break;
        case 'rejected':
          statusCounts.rejected++;
          break;
        default:
          // Map other statuses to closest match
          if (status === 'offer') {
            statusCounts.accepted++;
          } else if (status === 'screening' || status === 'interview') {
            statusCounts.applied++;
          } else {
            statusCounts.created++;
          }
      }
    });

    // Calculate rates
    const applicationRate = totalApplications > 0 ? Math.round((appliedApplications / totalApplications) * 100) : 0;
    const successRate = appliedApplications > 0 ? Math.round(((statusCounts.accepted) / appliedApplications) * 100) : 0;

    const stats = {
      totalApplications,
      appliedApplications,
      pendingApplications: statusCounts.applied || 0, // Keep for backward compatibility
      rejectedApplications: statusCounts.rejected,
      interviewApplications: 0, // Keep for backward compatibility
      offerApplications: statusCounts.accepted || 0, // Keep for backward compatibility
      // Spider chart data
      draft: statusCounts.draft,
      created: statusCounts.created,
      applied: statusCounts.applied,
      accepted: statusCounts.accepted,
      rejected: statusCounts.rejected,
      applicationRate,
      successRate
    };

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
