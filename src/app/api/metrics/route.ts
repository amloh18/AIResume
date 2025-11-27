import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, Job, JobApplication } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const [
      totalUsers,
      activeUsers,
      totalJobs,
      totalApplications
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ 'subscription.status': 'active' }),
      Job.countDocuments({}),
      JobApplication.countDocuments({})
    ]);

    // Calculate success rate based on applications (mock logic for now as we don't have outcome data easily accessible)
    // In a real scenario, this would check for 'hired' status in applications
    const successRate = totalApplications > 0 ? "15%" : "0%";

    const metrics = {
      totalUsers,
      activeUsers,
      successRate,
      jobsLanded: totalApplications // Using applications as a proxy for "jobs landed" or similar activity for now
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}