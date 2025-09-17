import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CVJourney } from '@/models/CVJourney';
import { JobApplication } from '@/models/JobApplication';
import { CV } from '@/models/CV';
import { CoverLetter } from '@/models/CoverLetter';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30d';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    console.log('🔍 CV Journey KPIs - Calculating metrics for range:', timeRange, 'from', startDate, 'to', now);

    // ========================================
    // 1. USER ENGAGEMENT & ADOPTION KPIs
    // ========================================

    // 1.1 Core Activity Metrics
    const cvJourneysInitiated = await CVJourney.countDocuments({
      createdAt: { $gte: startDate }
    });

    const cvJourneysWithBothDocuments = await CVJourney.countDocuments({
      createdAt: { $gte: startDate },
      cvId: { $exists: true, $ne: null },
      coverLetterId: { $exists: true, $ne: null }
    });

    const cvJourneyCompletionRate = cvJourneysInitiated > 0 
      ? (cvJourneysWithBothDocuments / cvJourneysInitiated) * 100 
      : 0;

    // Average Documents per Journey
    const totalTailoredCVs = await CV.countDocuments({
      createdAt: { $gte: startDate },
      isMaster: false
    });

    const totalCoverLetters = await CoverLetter.countDocuments({
      createdAt: { $gte: startDate }
    });

    const totalUsers = await User.countDocuments();
    const averageDocumentsPerJourney = totalUsers > 0 
      ? (totalTailoredCVs + totalCoverLetters) / totalUsers 
      : 0;

    // 1.2 Feature Adoption Metrics
    const usersWithMasterCV = await CV.countDocuments({
      isMaster: true
    });

    const masterCVOnboardingCompletion = totalUsers > 0 
      ? (usersWithMasterCV / totalUsers) * 100 
      : 0;

    // Studio Usage Frequency (CV saves + Cover Letter saves)
    const cvSaves = await CV.countDocuments({
      updatedAt: { $gte: startDate }
    });

    const coverLetterSaves = await CoverLetter.countDocuments({
      updatedAt: { $gte: startDate }
    });

    const studioUsageFrequency = cvSaves + coverLetterSaves;

    // ========================================
    // 2. APPLICATION FUNNEL & EFFECTIVENESS KPIs
    // ========================================

    // Application Status Funnel
    const applicationStatusFunnel = await JobApplication.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Tracked-to-Applied Conversion Rate
    const totalTrackedJobs = await JobApplication.countDocuments({
      createdAt: { $gte: startDate }
    });

    const appliedJobs = await JobApplication.countDocuments({
      createdAt: { $gte: startDate },
      status: 'applied'
    });

    const trackedToAppliedConversionRate = totalTrackedJobs > 0 
      ? (appliedJobs / totalTrackedJobs) * 100 
      : 0;

    // Average ATS Score
    const atsScores = await CVJourney.aggregate([
      {
        $match: {
          atsScore: { $exists: true, $ne: null },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$atsScore' },
          count: { $sum: 1 }
        }
      }
    ]);

    const averageATSScore = atsScores.length > 0 ? atsScores[0].averageScore : 0;
    const atsScoreCount = atsScores.length > 0 ? atsScores[0].count : 0;

    // ========================================
    // 3. CONTENT & SYSTEM HEALTH KPIs
    // ========================================

    // Orphaned or Stale Journeys (14+ days old without CV)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const orphanedJourneys = await CVJourney.countDocuments({
      createdAt: { $lt: fourteenDaysAgo },
      cvId: { $exists: false }
    });

    // Asset Growth Rate (cumulative counts over time)
    const assetGrowthData = await Promise.all([
      // CVs by day
      CV.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]),
      // Cover Letters by day
      CoverLetter.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ])
    ]);

    // Master CV to Tailored CV Ratio
    const totalMasterCVs = await CV.countDocuments({ isMaster: true });
    const masterCVToTailoredCVRatio = totalMasterCVs > 0 
      ? totalTailoredCVs / totalMasterCVs 
      : 0;

    // ========================================
    // ADDITIONAL METRICS
    // ========================================

    // Journey Status Distribution
    const journeyStatusDistribution = await CVJourney.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average Journey Completion Time
    const completedJourneys = await CVJourney.find({
      status: 'completed',
      createdAt: { $gte: startDate },
      'metadata.completedAt': { $exists: true }
    });

    const averageCompletionTime = completedJourneys.length > 0 
      ? completedJourneys.reduce((sum, journey) => {
          const completionTime = journey.metadata.completedAt!.getTime() - journey.createdAt.getTime();
          return sum + completionTime;
        }, 0) / completedJourneys.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // User Retention (users who created journeys in both periods)
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const usersInCurrentPeriod = await CVJourney.distinct('userId', {
      createdAt: { $gte: startDate }
    });
    const usersInPreviousPeriod = await CVJourney.distinct('userId', {
      createdAt: { $gte: previousPeriodStart, $lt: startDate }
    });

    const retainedUsers = usersInCurrentPeriod.filter(userId => 
      usersInPreviousPeriod.includes(userId)
    ).length;

    const userRetentionRate = usersInPreviousPeriod.length > 0 
      ? (retainedUsers / usersInPreviousPeriod.length) * 100 
      : 0;

    console.log('✅ CV Journey KPIs calculated successfully');

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        period: {
          startDate,
          endDate: now
        },
        userEngagement: {
          cvJourneysInitiated,
          cvJourneyCompletionRate: Math.round(cvJourneyCompletionRate * 100) / 100,
          averageDocumentsPerJourney: Math.round(averageDocumentsPerJourney * 100) / 100,
          masterCVOnboardingCompletion: Math.round(masterCVOnboardingCompletion * 100) / 100,
          studioUsageFrequency,
          userRetentionRate: Math.round(userRetentionRate * 100) / 100
        },
        applicationFunnel: {
          applicationStatusFunnel,
          trackedToAppliedConversionRate: Math.round(trackedToAppliedConversionRate * 100) / 100,
          averageATSScore: Math.round(averageATSScore * 100) / 100,
          atsScoreCount,
          totalTrackedJobs,
          appliedJobs
        },
        contentHealth: {
          orphanedJourneys,
          assetGrowthData: {
            cvs: assetGrowthData[0],
            coverLetters: assetGrowthData[1]
          },
          masterCVToTailoredCVRatio: Math.round(masterCVToTailoredCVRatio * 100) / 100,
          journeyStatusDistribution,
          averageCompletionTime: Math.round(averageCompletionTime * 100) / 100
        },
        summary: {
          totalUsers,
          totalMasterCVs,
          totalTailoredCVs,
          totalCoverLetters,
          totalJourneys: cvJourneysInitiated,
          completedJourneys: completedJourneys.length
        }
      }
    });

  } catch (error: any) {
    console.error('CV Journey KPIs error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to calculate CV Journey KPIs',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
