import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';

/**
 * Admin API for subscription analytics
 * Returns metrics grouped by region, plan type, and subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'region'; // 'region', 'plan', 'status'
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter['subscription.startDate'] = {};
      if (dateFrom) {
        dateFilter['subscription.startDate'].$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter['subscription.startDate'].$lte = new Date(dateTo);
      }
    }

    // Aggregate subscriptions by the requested grouping
    let analytics: any = {};

    if (groupBy === 'region') {
      // Group by purchase region
      const pipeline = [
        { $match: { ...dateFilter, 'subscription.planKey': { $ne: 'free' } } },
        {
          $group: {
            _id: '$subscription.purchaseRegion',
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$subscription.purchasePrice', 0] } },
            plans: {
              $push: {
                planKey: '$subscription.planKey',
                status: '$subscription.status',
                purchasePrice: '$subscription.purchasePrice'
              }
            }
          }
        },
        { $sort: { count: -1 } as any }
      ];

      const results = await User.aggregate(pipeline);

      analytics = {
        byRegion: results.map((item: any) => ({
          region: item._id || 'unknown',
          totalSubscriptions: item.count,
          totalRevenue: item.revenue,
          plans: item.plans.reduce((acc: any, plan: any) => {
            acc[plan.planKey] = (acc[plan.planKey] || 0) + 1;
            return acc;
          }, {})
        }))
      };
    } else if (groupBy === 'plan') {
      // Group by plan type
      const pipeline = [
        { $match: { ...dateFilter, 'subscription.planKey': { $ne: 'free' } } },
        {
          $group: {
            _id: '$subscription.planKey',
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$subscription.purchasePrice', 0] } },
            avgPrice: { $avg: { $ifNull: ['$subscription.purchasePrice', 0] } },
            regions: {
              $push: '$subscription.purchaseRegion'
            },
            statuses: {
              $push: '$subscription.status'
            }
          }
        },
        { $sort: { count: -1 } as any }
      ];

      const results = await User.aggregate(pipeline);

      analytics = {
        byPlan: results.map((item: any) => ({
          planKey: item._id,
          totalSubscriptions: item.count,
          totalRevenue: item.revenue,
          averagePrice: item.avgPrice,
          regionDistribution: item.regions.reduce((acc: any, region: string) => {
            acc[region || 'unknown'] = (acc[region || 'unknown'] || 0) + 1;
            return acc;
          }, {}),
          statusDistribution: item.statuses.reduce((acc: any, status: string) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {})
        }))
      };
    } else if (groupBy === 'status') {
      // Group by subscription status
      const pipeline = [
        { $match: { ...dateFilter, 'subscription.planKey': { $ne: 'free' } } },
        {
          $group: {
            _id: '$subscription.status',
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$subscription.purchasePrice', 0] } },
            plans: {
              $push: '$subscription.planKey'
            }
          }
        }
      ];

      const results = await User.aggregate(pipeline);

      analytics = {
        byStatus: results.map((item: any) => ({
          status: item._id || 'unknown',
          count: item.count,
          revenue: item.revenue,
          planDistribution: item.plans.reduce((acc: any, plan: string) => {
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
          }, {})
        }))
      };
    }

    // Get overall statistics
    const totalUsers = await User.countDocuments({ 'subscription.planKey': { $ne: 'free' } });
    const activeSubscriptions = await User.countDocuments({
      'subscription.status': 'active',
      'subscription.planKey': { $ne: 'free' }
    });
    const expiredSubscriptions = await User.countDocuments({
      'subscription.status': 'expired',
      'subscription.planKey': { $ne: 'free' }
    });

    // Calculate total revenue
    const revenuePipeline = [
      { $match: { ...dateFilter, 'subscription.planKey': { $ne: 'free' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$subscription.purchasePrice', 0] } },
          avgRevenue: { $avg: { $ifNull: ['$subscription.purchasePrice', 0] } }
        }
      }
    ];

    const revenueStats = await User.aggregate(revenuePipeline);
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const avgRevenue = revenueStats[0]?.avgRevenue || 0;

    // Day pass statistics
    const dayPassStats = await User.aggregate([
      { $match: { 'subscription.planKey': 'day_pass' } },
      {
        $project: {
          dayPassCount: { $size: { $ifNull: ['$dayPassPurchases', []] } },
          purchasePrice: '$subscription.purchasePrice'
        }
      },
      {
        $group: {
          _id: null,
          totalDayPasses: { $sum: '$dayPassCount' },
          totalRevenue: { $sum: { $ifNull: ['$purchasePrice', 0] } },
          uniqueUsers: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      analytics,
      summary: {
        totalUsers,
        activeSubscriptions,
        expiredSubscriptions,
        totalRevenue,
        averageRevenue: avgRevenue,
        dayPassStats: dayPassStats[0] || {
          totalDayPasses: 0,
          totalRevenue: 0,
          uniqueUsers: 0
        }
      },
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null
      }
    });

  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
