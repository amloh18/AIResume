
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, JobApplication, CoverLetter, Subscription, Invoice } from '@/models';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch data from database with error handling
    let totalUsers = 0, activeUsers = 0, totalCVs = 0, totalJobs = 0, draftJobs = 0, totalCoverLetters = 0, recentUsers = 0;

    try {
      const [
        totalUsersResult,
        activeUsersResult,
        totalCVsResult,
        totalJobsResult,
        draftJobsResult,
        totalCoverLettersResult,
        recentUsersResult
      ] = await Promise.all([
        User.countDocuments().catch(() => 0),
        User.countDocuments({
          lastActiveAt: { $gte: startDate }
        }).catch(() => 0),
        CV.countDocuments().catch(() => 0),
        JobApplication.countDocuments().catch(() => 0),
        JobApplication.countDocuments({ status: 'saved' }).catch(() => 0),
        CoverLetter.countDocuments().catch(() => 0),
        User.countDocuments({
          createdAt: { $gte: startDate }
        }).catch(() => 0)
      ]);

      totalUsers = totalUsersResult || 0;
      activeUsers = activeUsersResult || 0;
      totalCVs = totalCVsResult || 0;
      totalJobs = totalJobsResult || 0;
      draftJobs = draftJobsResult || 0;
      totalCoverLetters = totalCoverLettersResult || 0;
      recentUsers = recentUsersResult || 0;
    } catch (error) {
      console.log('Database query failed', error);
      // Removed fallback data, keep it 0 if failure
      totalUsers = 0;
      activeUsers = 0;
      totalCVs = 0;
      totalJobs = 0;
      draftJobs = 0;
      totalCoverLetters = 0;
      recentUsers = 0;
    }

    // Calculate growth rate with error handling
    let growthRate = 0;
    try {
      const previousPeriodUsers = await User.countDocuments({
        createdAt: {
          $gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())),
          $lt: startDate
        }
      }).catch(() => 0);

      growthRate = previousPeriodUsers > 0
        ? ((recentUsers - previousPeriodUsers) / previousPeriodUsers) * 100
        : 0; // Fallback growth rate
    } catch (error) {
      console.log('Growth rate calculation failed', error);
      growthRate = 0; // Fallback growth rate
    }

    // Calculate AI usage from ActivityLog (Total Tokens)
    let aiUsage = 0;
    try {
      const result = await ActivityLog.aggregate([
        {
          $match: {
            logType: 'ai',
            createdAt: { $gte: startDate } // Fixed timestamp -> createdAt
          }
        },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$aiMetadata.tokensUsed' }
          }
        }
      ]);

      aiUsage = result[0]?.totalTokens || 0;
    } catch (error) {
      console.log('ActivityLog AI usage query failed', error);
      aiUsage = 0; // Removed mock
    }

    // Calculate revenue from subscriptions and invoices with fallback
    let revenue = 0;
    try {
      let totalRevenue = 0;
      if (Subscription) {
        const activeSubscriptions = await Subscription.find({
          status: 'active',
          createdAt: { $gte: startDate }
        }).lean();

        totalRevenue = activeSubscriptions.reduce((sum, sub) => {
          return sum + (sub.amount || 0);
        }, 0);
      }

      let invoiceTotal = 0;
      if (Invoice) {
        const invoiceRevenue = await Invoice.aggregate([
          {
            $match: {
              status: 'paid',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]);
        invoiceTotal = invoiceRevenue[0]?.total || 0;
      }
      
      revenue = totalRevenue + invoiceTotal;
      
    } catch (error) {
      console.log('Revenue calculation failed', error);
      revenue = 0; // Removed mock
    }

    // Calculate system stats (mocked for now but could be wired to actual metrics)
    const systemHealth = {
      speed: 18 + Math.floor(Math.random() * 10),
      status: 100,
      load: 35 + Math.floor(Math.random() * 15)
    };

    const kpiData = {
      totalUsers,
      activeUsers,
      totalCVs,
      totalJobs,
      draftJobs,
      totalCoverLetters,
      aiUsage,
      revenue,
      growthRate: Math.round(growthRate * 100) / 100,
      systemHealth,
      efficiency: totalUsers > 0 ? Math.min(100, Math.round((activeUsers / totalUsers) * 100 + (growthRate > 0 ? 5 : 0))) : 0
    };

    return NextResponse.json(kpiData);

  } catch (error: any) {
    console.error('Error fetching KPI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data', details: error.message },
      { status: 500 }
    );
  }
}
