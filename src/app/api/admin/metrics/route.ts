import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, JobApplication } from '@/models';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();

    // Get basic metrics
    const [
      totalUsers,
      activeUsers,
      totalCVs,
      totalJobs,
      jobsLanded
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      }),
      CV.countDocuments(),
      JobApplication.countDocuments(),
      JobApplication.countDocuments({ status: { $in: ['offer', 'accepted'] } })
    ]);

    const successRate = totalJobs > 0 ? (jobsLanded / totalJobs) * 100 : 0;

    const metrics = {
      totalUsers,
      activeUsers,
      jobsLanded,
      successRate: Math.round(successRate * 100) / 100
    };

    return NextResponse.json({
      success: true,
      metrics
    });

  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
});
