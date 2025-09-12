import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User, JobApplication, CV } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get current user count
    const totalUsers = await User.countDocuments();
    
    // Add 1000 to current users for active users display
    const activeUsers = totalUsers + 1000;
    
    // Get jobs landed (applications with status 'accepted' or 'offer')
    const jobsLanded = await JobApplication.countDocuments({
      status: { $in: ['accepted', 'offer'] }
    });
    
    // Add 500 to actual value for display
    const displayJobsLanded = jobsLanded + 500;
    
    // Calculate success rate
    const totalJobsCreated = await JobApplication.countDocuments();
    const totalJobsApplied = await JobApplication.countDocuments({
      status: { $ne: 'created' }
    });
    
    // Refined success rate formula: (jobs landed / total users) * 100
    // Ensure minimum 50% and maximum 95%
    let successRate = totalUsers > 0 ? (jobsLanded / totalUsers) * 100 : 50;
    successRate = Math.max(50, Math.min(95, Math.round(successRate)));

    const metrics = {
      activeUsers: activeUsers.toLocaleString() + '+',
      successRate: successRate + '%',
      jobsLanded: displayJobsLanded.toLocaleString() + '+'
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
