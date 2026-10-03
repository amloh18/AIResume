import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, JobApplication, ActivityLog } from '@/models';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let interval: 'hour' | 'day' | 'week' | 'month';
    
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        interval = 'hour';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        interval = 'day';
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        interval = 'week';
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        interval = 'hour';
    }

    // Generate chart data based on interval
    const chartData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const nextDate = new Date(currentDate);
      
      if (interval === 'hour') {
        nextDate.setHours(currentDate.getHours() + 1);
      } else if (interval === 'day') {
        nextDate.setDate(currentDate.getDate() + 1);
      } else if (interval === 'week') {
        nextDate.setDate(currentDate.getDate() + 7);
      } else if (interval === 'month') {
        nextDate.setMonth(currentDate.getMonth() + 1);
      }

      // Get data for this period
      const usersTask = User.countDocuments({
        createdAt: { $gte: currentDate, $lt: nextDate }
      });
      const cvsTask = CV.countDocuments({
        createdAt: { $gte: currentDate, $lt: nextDate }
      });
      const jobsTask = JobApplication.countDocuments({
        createdAt: { $gte: currentDate, $lt: nextDate }
      });
      
      const aiTask = ActivityLog ? ActivityLog.aggregate([
        { $match: { logType: 'ai', createdAt: { $gte: currentDate, $lt: nextDate } } },
        { $group: { _id: null, totalTokens: { $sum: '$aiMetadata.tokensUsed' } } }
      ]) : Promise.resolve([]);

      const [users, cvs, jobs, aiResult] = await Promise.all([
        usersTask, cvsTask, jobsTask, aiTask
      ]);

      const aiUsage = aiResult[0]?.totalTokens || 0;

      chartData.push({
        date: currentDate.toISOString().split('T')[0],
        time: interval === 'hour' ? currentDate.getHours().toString().padStart(2, '0') + ':00' : undefined,
        users,
        cvs,
        jobs,
        aiUsage
      });

      currentDate.setTime(nextDate.getTime());
    }

    return NextResponse.json(chartData);

  } catch (error: any) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data', details: error.message },
      { status: 500 }
    );
  }
});
