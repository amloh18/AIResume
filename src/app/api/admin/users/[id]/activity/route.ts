import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, CoverLetter, JobApplication, ApplicationJourney, ActivityLog } from '@/models';
import { requireAdmin } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication using NextAuth session
    await requireAdmin(request);

    const { id } = await params;

    // Check database connection
    try {
      await getConnection();
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          details: dbError.message
        },
        { status: 500 }
      );
    }

    // Find user
    const user = await User.findById(id).lean() as any;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Convert userId to string for queries
    const userId = (user as any)._id?.toString() || (user as any)._id;

    // Count documents
    const [cvCount, masterCVExists, coverLetterCount, jobCount, journeyCount] = await Promise.all([
      CV.countDocuments({ userId: user._id }),
      CV.countDocuments({ userId: user._id, 'metadata.isMaster': true }),
      CoverLetter.countDocuments({ userId: user._id }),
      JobApplication.countDocuments({ userId: user._id }),
      ApplicationJourney.countDocuments({ userId }),
    ]);

    // Calculate total time spent using ActivityLog
    // We'll group logs into sessions. A new session starts if there's a gap of > 30 minutes.
    const logs = await ActivityLog.find({ userId: user._id })
      .sort({ timestamp: 1 })
      .select('timestamp')
      .lean();

    let estimatedSessionTime = 0; // in minutes

    if (logs.length > 0) {
      let currentSessionStart = new Date(logs[0].timestamp).getTime();
      let lastLogTime = currentSessionStart;
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

      for (let i = 1; i < logs.length; i++) {
        const currentLogTime = new Date(logs[i].timestamp).getTime();
        const timeDiff = currentLogTime - lastLogTime;

        if (timeDiff > SESSION_TIMEOUT) {
          // End of current session
          // Add duration of previous session (at least 1 minute per action if single action)
          const sessionDuration = Math.max(lastLogTime - currentSessionStart, 60000);
          estimatedSessionTime += sessionDuration;

          // Start new session
          currentSessionStart = currentLogTime;
        }

        lastLogTime = currentLogTime;
      }

      // Add the last session
      const lastSessionDuration = Math.max(lastLogTime - currentSessionStart, 60000);
      estimatedSessionTime += lastSessionDuration;

      // Convert to minutes
      estimatedSessionTime = Math.round(estimatedSessionTime / (1000 * 60));
    }

    // Get recent activity (last 10 CVs, journeys, etc.)
    const recentCVs = await CV.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title metadata.isMaster updatedAt')
      .lean();

    const recentJourneys = await ApplicationJourney.find({ userId })
      .sort({ lastWorkedOn: -1 })
      .limit(10)
      .select('jobTitle company status lastWorkedOn')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          registrationDate: user.createdAt,
          lastActive: user.lastLogin || user.updatedAt,
        },
        metrics: {
          masterCV: masterCVExists > 0,
          cvCount,
          coverLetterCount,
          jobCount,
          journeyCount,
          totalDocuments: cvCount + coverLetterCount + jobCount,
          estimatedSessionTimeMinutes: estimatedSessionTime,
          estimatedSessionTimeHours: Math.round((estimatedSessionTime / 60) * 10) / 10, // Round to 1 decimal
        },
        activity: {
          recentCVs: recentCVs.map(cv => ({
            title: cv.title,
            isMaster: cv.metadata?.isMaster || false,
            lastModified: cv.updatedAt,
          })),
          recentJourneys: recentJourneys.map(journey => ({
            jobTitle: journey.jobTitle,
            company: journey.company,
            status: journey.status,
            lastWorkedOn: journey.lastWorkedOn,
          })),
        },
      },
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('❌ Get user activity error:', error);

    // Handle authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get user activity',
      },
      { status: 500 }
    );
  }
}
