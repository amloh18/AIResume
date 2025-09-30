import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Job from '@/models/Job';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || '30d';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Calculate date range
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Handle both MongoDB ObjectId and Firebase UID
    const queryCondition = userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)
      ? { userId: userId } // MongoDB ObjectId
      : { firebaseUid: userId }; // Firebase UID

    // Fetch jobs created in the date range
    const jobs = await Job.find({
      ...queryCondition,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Fetch CVs created in the date range
    const cvs = await CV.find({
      ...queryCondition,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Fetch cover letters created in the date range
    const coverLetters = await CoverLetter.find({
      ...queryCondition,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Group data by date
    const dataByDate: { [key: string]: { jobs: number; cvs: number; coverLetters: number } } = {};

    // Initialize all dates in range with zero values
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dataByDate[dateKey] = { jobs: 0, cvs: 0, coverLetters: 0 };
    }

    // Count jobs by date
    jobs.forEach(job => {
      const dateKey = job.createdAt.toISOString().split('T')[0];
      if (dataByDate[dateKey]) {
        dataByDate[dateKey].jobs++;
      }
    });

    // Count CVs by date
    cvs.forEach(cv => {
      const dateKey = cv.createdAt.toISOString().split('T')[0];
      if (dataByDate[dateKey]) {
        dataByDate[dateKey].cvs++;
      }
    });

    // Count cover letters by date
    coverLetters.forEach(coverLetter => {
      const dateKey = coverLetter.createdAt.toISOString().split('T')[0];
      if (dataByDate[dateKey]) {
        dataByDate[dateKey].coverLetters++;
      }
    });

    // Convert to array format
    const progressData = Object.entries(dataByDate).map(([date, counts]) => ({
      date,
      jobs: counts.jobs,
      cvs: counts.cvs,
      coverLetters: counts.coverLetters
    }));

    return NextResponse.json({
      success: true,
      data: progressData,
      summary: {
        totalJobs: jobs.length,
        totalCVs: cvs.length,
        totalCoverLetters: coverLetters.length,
        dateRange: { start: startDate.toISOString(), end: now.toISOString() }
      }
    });

  } catch (error) {
    console.error('Error fetching progress data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
}
