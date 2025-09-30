import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Job from '@/models/Job';
import { ApplicationJourney } from '@/models';

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

    await connectDB();

    // Calculate date range
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch all jobs for the user
    // Handle both MongoDB ObjectId and Firebase UID
    const jobQuery = userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)
      ? { userId: userId } // MongoDB ObjectId
      : { firebaseUid: userId }; // Firebase UID

    const allJobs = await Job.find(jobQuery);

    // Fetch CV journeys for the user
    // Handle both MongoDB ObjectId and Firebase UID
    const journeyQuery = userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)
      ? { userId: userId } // MongoDB ObjectId
      : { firebaseUid: userId }; // Firebase UID

    const journeys = await ApplicationJourney.find(journeyQuery);

    // Calculate application stats
    const totalApplications = allJobs.length;
    
    // Jobs with CV journeys are considered "applied"
    const appliedApplications = journeys.length;
    
    // Calculate status breakdown
    const statusCounts = {
      pending: 0,
      rejected: 0,
      interview: 0,
      offer: 0
    };

    // Count jobs by status
    allJobs.forEach(job => {
      switch (job.status?.toLowerCase()) {
        case 'pending':
        case 'applied':
          statusCounts.pending++;
          break;
        case 'rejected':
        case 'declined':
          statusCounts.rejected++;
          break;
        case 'interview':
        case 'interviewing':
          statusCounts.interview++;
          break;
        case 'offer':
        case 'accepted':
          statusCounts.offer++;
          break;
        default:
          statusCounts.pending++;
      }
    });

    // Calculate rates
    const applicationRate = totalApplications > 0 ? Math.round((appliedApplications / totalApplications) * 100) : 0;
    const successRate = appliedApplications > 0 ? Math.round(((statusCounts.interview + statusCounts.offer) / appliedApplications) * 100) : 0;

    const stats = {
      totalApplications,
      appliedApplications,
      pendingApplications: statusCounts.pending,
      rejectedApplications: statusCounts.rejected,
      interviewApplications: statusCounts.interview,
      offerApplications: statusCounts.offer,
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
