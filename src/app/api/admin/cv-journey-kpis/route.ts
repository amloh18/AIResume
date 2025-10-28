import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User, CV, JobApplication, ApplicationJourney } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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
      applicationJourneys
    ] = await Promise.all([
      User.countDocuments(),
      CV.countDocuments(),
      ApplicationJourney.countDocuments(),
      ApplicationJourney.countDocuments({ status: 'completed' }),
      JobApplication.countDocuments(),
      ApplicationJourney.find({ createdAt: { $gte: startDate } }).lean()
    ]);

    // Calculate metrics
    const cvJourneyCompletionRate = totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0;
    const masterCVOnboardingCompletion = totalUsers > 0 ? (totalCVs / totalUsers) * 100 : 0;
    const userRetentionRate = 75; // Mock data
    const averageDocumentsPerJourney = totalJourneys > 0 ? totalCoverLetters / totalJourneys : 0;
    const studioUsageFrequency = 3.2; // Mock data

    // Application funnel data
    const applicationStatusFunnel = [
      { _id: 'created', count: Math.floor(totalJourneys * 0.3) },
      { _id: 'applied', count: Math.floor(totalJourneys * 0.2) },
      { _id: 'screening', count: Math.floor(totalJourneys * 0.15) },
      { _id: 'interview', count: Math.floor(totalJourneys * 0.1) },
      { _id: 'offer', count: Math.floor(totalJourneys * 0.05) },
      { _id: 'rejected', count: Math.floor(totalJourneys * 0.2) }
    ];

    const trackedToAppliedConversionRate = 25; // Mock data
    const averageATSScore = 78; // Mock data
    const atsScoreCount = Math.floor(totalJourneys * 0.6);
    const totalTrackedJobs = totalJourneys;
    const appliedJobs = Math.floor(totalJourneys * 0.2);

    // Content health metrics
    const orphanedJourneys = Math.floor(totalJourneys * 0.05);
    const masterCVToTailoredCVRatio = totalCVs > 0 ? (totalCVs - totalJourneys) / totalCVs : 0;
    const averageCompletionTime = 14; // Mock data in days

    const journeyStatusDistribution = [
      { _id: 'in-progress', count: Math.floor(totalJourneys * 0.4) },
      { _id: 'completed', count: completedJourneys },
      { _id: 'paused', count: Math.floor(totalJourneys * 0.1) },
      { _id: 'cancelled', count: Math.floor(totalJourneys * 0.05) }
    ];

    // Asset growth data (mock)
    const assetGrowthData = {
      cvs: [
        { _id: '2025-10-01', count: Math.floor(totalCVs * 0.1) },
        { _id: '2025-10-15', count: Math.floor(totalCVs * 0.3) },
        { _id: '2025-10-28', count: totalCVs }
      ],
      coverLetters: [
        { _id: '2025-10-01', count: Math.floor(totalCoverLetters * 0.1) },
        { _id: '2025-10-15', count: Math.floor(totalCoverLetters * 0.3) },
        { _id: '2025-10-28', count: totalCoverLetters }
      ]
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
        studioUsageFrequency: studioUsageFrequency,
        userRetentionRate: userRetentionRate
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
