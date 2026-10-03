import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, JobApplication, ApplicationJourney } from '@/models';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch recent activities from various collections
    const [recentUsers, recentCVs, recentJobs, recentJourneys] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email createdAt').lean(),
      CV.find().sort({ createdAt: -1 }).limit(5).select('name createdAt').lean(),
      JobApplication.find().sort({ createdAt: -1 }).limit(5).select('jobTitle company createdAt').lean(),
      ApplicationJourney.find().sort({ createdAt: -1 }).limit(5).select('status createdAt').lean()
    ]);

    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: Date;
      icon: string;
      status: string;
      priority: string;
    }> = [];

    // Add user activities
    recentUsers.forEach((user, index) => {
      activities.push({
        id: `user-${user._id}`,
        type: 'user',
        title: 'New user registered',
        description: `${user.firstName} ${user.lastName} (${user.email}) joined the platform`,
        timestamp: user.createdAt,
        icon: 'user',
        status: 'success',
        priority: 'medium'
      });
    });

    // Add CV activities
    recentCVs.forEach((cv, index) => {
      activities.push({
        id: `cv-${cv._id}`,
        type: 'template',
        title: 'CV created',
        description: `New CV "${cv.name}" was created`,
        timestamp: cv.createdAt,
        icon: 'file',
        status: 'success',
        priority: 'low'
      });
    });

    // Add job application activities
    recentJobs.forEach((job, index) => {
      activities.push({
        id: `job-${job._id}`,
        type: 'system',
        title: 'Job application tracked',
        description: `Application for "${job.jobTitle}" at ${job.company}`,
        timestamp: job.createdAt,
        icon: 'briefcase',
        status: 'info',
        priority: 'medium'
      });
    });

    // Add journey activities
    recentJourneys.forEach((journey, index) => {
      activities.push({
        id: `journey-${journey._id}`,
        type: 'system',
        title: 'Application journey updated',
        description: `Journey status changed to ${journey.status}`,
        timestamp: journey.createdAt,
        icon: 'activity',
        status: 'info',
        priority: 'low'
      });
    });

    // Sort by timestamp (most recent first) and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      activities: limitedActivities,
      total: activities.length
    });

  } catch (error: any) {
    console.error('Error fetching activity data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity data', details: error.message },
      { status: 500 }
    );
  }
});
