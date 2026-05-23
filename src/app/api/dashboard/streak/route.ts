import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';

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

    // Get date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch data for streak calculation
    const [cvs, jobs, journeys] = await Promise.all([
      CV.find({ userId: userObjectId })
        .select('createdAt updatedAt')
        .lean(),
      JobApplication.find({ userId: userObjectId })
        .select('createdAt updatedAt status')
        .lean(),
      ApplicationJourney.find({ userId: userObjectId })
        .select('createdAt updatedAt currentStep totalSteps')
        .lean()
    ]);

    // Calculate current streak (consecutive days with activity)
    const streak = calculateStreak(cvs, jobs, journeys);

    // Calculate weekly stats
    const thisWeekApps = jobs.filter(job => 
      new Date(job.createdAt) >= startOfWeek
    ).length;

    // Calculate monthly goal from user settings (default 20)
    const user = (await import('@/models/User').then(m => m.default.findById(userObjectId).select('monthlyGoal').lean())) as any;
    const monthlyGoal = user?.monthlyGoal || 20;

    return NextResponse.json({
      success: true,
      data: {
        current: streak.current,
        longest: streak.longest,
        weeklyGoal: 15,
        applicationsThisWeek: thisWeekApps
      }
    });

  } catch (error: any) {
    console.error('Streak calculation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate streak' },
      { status: 500 }
    );
  }
}

function calculateStreak(cvs: any[], jobs: any[], journeys: any[]): {
  current: number;
  longest: number;
} {
  // Combine all activities and extract unique dates
  const activityDates = new Set<string>();

  cvs.forEach((cv: any) => {
    if (cv.createdAt) activityDates.add(new Date(cv.createdAt).toDateString());
    if (cv.updatedAt) activityDates.add(new Date(cv.updatedAt).toDateString());
  });

  jobs.forEach((job: any) => {
    if (job.createdAt) activityDates.add(new Date(job.createdAt).toDateString());
    if (job.updatedAt) activityDates.add(new Date(job.updatedAt).toDateString());
  });

  journeys.forEach((journey: any) => {
    if (journey.createdAt) activityDates.add(new Date(journey.createdAt).toDateString());
    if (journey.updatedAt) activityDates.add(new Date(journey.updatedAt).toDateString());
  });

  if (activityDates.size === 0) {
    return { current: 0, longest: 0 };
  }

  // Convert to sorted array
  const sortedDates = Array.from(activityDates).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Calculate current streak (from today backwards)
  let currentStreak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = checkDate.toDateString();
    if (activityDates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    
    // Check if dates are consecutive
    prevDate.setHours(0, 0, 0, 0);
    currDate.setHours(0, 0, 0, 0);
    
    const diffTime = prevDate.getTime() - currDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: longestStreak
  };
}