import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authResult;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Fetch activities from ActivityLog - show only resume, cv, job, cover letter related logs
    const activities = await ActivityLog.find({
      userId: userObjectId,
      logType: 'user_action',
      $or: [
        { 'resource.type': { $in: ['cv', 'cover_letter', 'job', 'journey'] } },
        { action: { $in: ['cv_updated', 'cv_created', 'applied', 'interview', 'ats_check', 'improvement', 'recommendation'] } }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

    // Map to the format expected by the frontend
    const mappedActivities = activities.map((log: any) => {
      let type: 'cv_updated' | 'applied' | 'interview' | 'improvement' | 'recommendation' = 'cv_updated';
      
      // Determine type based on action or resource
      if (log.action === 'applied' || log.resource?.type === 'job') {
        type = 'applied';
      } else if (log.action === 'interview' || log.resource?.type === 'journey') {
        type = 'interview';
      } else if (log.action === 'ats_check' || log.action === 'improvement') {
        type = 'improvement';
      } else if (log.action === 'recommendation') {
        type = 'recommendation';
      }

      // Format message with resource name if available
      let message = log.action;
      const resourceName = log.resource?.name || log.metadata?.name || log.metadata?.title;
      const resourceType = log.resource?.type;
      
      if (log.action === 'cv_updated' || log.action === 'updated' && resourceType === 'cv') {
        const cvType = log.metadata?.cvType || 'CV';
        const typeLabel = cvType === 'master' ? 'Master CV' : cvType === 'journey' ? 'Journey CV' : 'Standalone CV';
        message = `Updated ${typeLabel}: ${resourceName || 'Untitled'}`;
        type = 'cv_updated';
      } else if (log.action === 'cv_created' || log.action === 'created' && resourceType === 'cv') {
        const cvType = log.metadata?.cvType || 'CV';
        const typeLabel = cvType === 'master' ? 'Master CV' : cvType === 'journey' ? 'Journey CV' : 'Standalone CV';
        message = `Created ${typeLabel}: ${resourceName || 'Untitled'}`;
        type = 'cv_updated';
      } else if (log.action === 'applied' || resourceType === 'job') {
        message = `Applied for: ${resourceName || 'a new role'}`;
      } else if (log.action === 'user_action') {
        message = log.metadata?.message || log.action;
      }

      return {
        id: log._id.toString(),
        type,
        message,
        timestamp: log.timestamp,
        metadata: log.metadata
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activities: mappedActivities
      }
    });

  } catch (error: any) {
    console.error('Activity feed error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
