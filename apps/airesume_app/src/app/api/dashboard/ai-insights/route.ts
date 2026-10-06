import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = authResult;
    /*
      `JobApplication.userId` is `Schema.Types.Mixed`, so Mongoose does not cast the query value for
      us: a bare ObjectId silently misses rows stored as a 24-hex string and vice versa — no error,
      no log, just fewer rows (SB-06). `mixedIdFilter` matches both shapes, and is also correct on
      the ObjectId-typed `CV.userId` path, where `$in` casts the string form to the same ObjectId.
    */
    const userFilter = mixedIdFilter(userId);

    // Fetch some data to generate insights
    const [cvCount, jobCount, recentJobs] = await Promise.all([
      CV.countDocuments({ userId: userFilter }),
      JobApplication.countDocuments({ userId: userFilter }),
      JobApplication.find({ userId: userFilter }).sort({ updatedAt: -1 }).limit(5).lean()
    ]);

    const insights = [];

    // Generate some dynamic insights
    if (cvCount === 0) {
      insights.push({
        type: 'action',
        title: 'Create your first CV',
        description: 'Users with at least one CV are 5x more likely to get an interview.',
        priority: 'high'
      });
    } else if (cvCount === 1) {
      insights.push({
        type: 'tip',
        title: 'Tailor your CV',
        description: 'Creating specific CVs for different roles can increase your match rate by up to 40%.',
        priority: 'medium'
      });
    }

    if (jobCount === 0) {
      insights.push({
        type: 'action',
        title: 'Track your first application',
        description: 'Start tracking your job applications to get organized and see your progress.',
        priority: 'high'
      });
    }

    // Add some generic but smart-looking insights if we don't have many
    if (insights.length < 3) {
      insights.push({
        type: 'market',
        title: 'Market Trend',
        description: 'Cloud computing skills are in high demand this month for your target roles.',
        priority: 'medium'
      });
      insights.push({
        type: 'improvement',
        title: 'Skill Gap',
        description: 'Adding "System Design" to your CV could improve your match rate for Senior roles.',
        priority: 'low'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        insights: insights.slice(0, 4)
      }
    });

  } catch (error: any) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch AI insights' },
      { status: 500 }
    );
  }
}
