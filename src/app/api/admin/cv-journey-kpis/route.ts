import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, JobApplication, ApplicationJourney } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch data from database
    const [
      totalUsers,
      totalCVs,
      totalJourneys,
      completedJourneys,
      totalCoverLetters,
      applicationJourneys,
      allJobs
    ] = await Promise.all([
      User.countDocuments(),
      CV.countDocuments(),
      ApplicationJourney.countDocuments(),
      ApplicationJourney.countDocuments({ status: 'completed' }),
      JobApplication.countDocuments({ coverLetterId: { $exists: true, $ne: null } }),
      ApplicationJourney.find({ createdAt: { $gte: startDate } }).lean(),
      JobApplication.find({ createdAt: { $gte: startDate } }).lean()
    ]);

    // Calculate metrics
    const cvJourneyCompletionRate = totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0;
    const masterCVOnboardingCompletion = totalUsers > 0 ? (totalCVs / totalUsers) * 100 : 0;
    
    // Average documents per journey (estimate based on total docs vs total journeys)
    const averageDocumentsPerJourney = totalJourneys > 0 ? (totalCVs + totalCoverLetters) / totalJourneys : 0;

    // Application funnel data
    const statusCounts = allJobs.reduce((acc: any, job: any) => {
      const status = job.status || 'saved';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const applicationStatusFunnel = Object.keys(statusCounts).map(status => ({
      _id: status,
      count: statusCounts[status]
    }));

    const totalTrackedJobs = allJobs.length;
    const appliedJobs = allJobs.filter((j: any) => j.status === 'applied' || j.status === 'interview' || j.status === 'offer' || j.status === 'rejected' || j.status === 'accepted').length;
    const trackedToAppliedConversionRate = totalTrackedJobs > 0 ? (appliedJobs / totalTrackedJobs) * 100 : 0;
    
    const jobsWithAts = allJobs.filter((j: any) => j.atsScore && typeof j.atsScore === 'number');
    const atsScoreCount = jobsWithAts.length;
    const averageATSScore = atsScoreCount > 0 ? jobsWithAts.reduce((sum: number, j: any) => sum + j.atsScore, 0) / atsScoreCount : 0;

    // Group status distribution
    const journeyStatusDistribution = Object.keys(journeyStatusCounts).map(status => ({
      _id: status,
      count: journeyStatusCounts[status]
    }));

    // Asset growth data aggregation (grouped by day)
    const cvsByDay = await CV.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    const clsByDay = await JobApplication.aggregate([
      { $match: { coverLetterId: { $exists: true, $ne: null }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    const assetGrowthData = {
      cvs: cvsByDay,
      coverLetters: clsByDay
    };

    const kpiData = {
      timeRange: range,
      period: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      userEngagement: {
        cvJourneysInitiated: totalJourneys,
        cvJourneyCompletionRate: Math.round(cvJourneyCompletionRate * 100) / 100,
        averageDocumentsPerJourney: Math.round(averageDocumentsPerJourney * 100) / 100,
        masterCVOnboardingCompletion: Math.round(masterCVOnboardingCompletion * 100) / 100,
        studioUsageFrequency: 0,
        userRetentionRate: 0
      },
      applicationFunnel: {
        applicationStatusFunnel,
        trackedToAppliedConversionRate,
        averageATSScore,
        atsScoreCount,
        totalTrackedJobs,
        appliedJobs
      },
      contentHealth: {
        orphanedJourneys,
        assetGrowthData,
        masterCVToTailoredCVRatio: Math.round(masterCVToTailoredCVRatio * 100) / 100,
        journeyStatusDistribution,
        averageCompletionTime
      },
      summary: {
        totalUsers,
        totalMasterCVs: totalCVs,
        totalTailoredCVs: totalJourneys,
        totalCoverLetters,
        totalJourneys,
        completedJourneys
      }
    };

    return NextResponse.json({
      success: true,
      data: kpiData
    });

  } catch (error: any) {
    console.error('Error fetching CV Journey KPI data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CV Journey KPI data', details: error.message },
      { status: 500 }
    );
  }
}
