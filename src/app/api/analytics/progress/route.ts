import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import Job from '@/models/Job';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || '30d';

    console.log('Progress API: Request received', { userId, range });

    if (!userId) {
      console.log('Progress API: No userId provided');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Calculate date range
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Handle both MongoDB ObjectId and Firebase UID
    const queryCondition = userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)
      ? { userId: userId } // MongoDB ObjectId
      : { firebaseUid: userId }; // Firebase UID

    // Fetch jobs created in the date range OR updated in the date range
    const jobs = await Job.find({
      ...queryCondition,
      $or: [
        { createdAt: { $gte: startDate } }, // Jobs created in the date range
        { updatedAt: { $gte: startDate } } // Jobs updated (status changes) in the date range
      ]
    }).sort({ createdAt: 1 });

    // Fetch CVs created or updated in the date range
    const cvs = await CV.find({
      ...queryCondition,
      $or: [
        { createdAt: { $gte: startDate } }, // CVs created in the date range
        { updatedAt: { $gte: startDate } } // CVs updated in the date range
      ]
    }).sort({ createdAt: 1 });

    // Fetch cover letters created or updated in the date range
    const coverLetters = await CoverLetter.find({
      ...queryCondition,
      $or: [
        { createdAt: { $gte: startDate } }, // Cover letters created in the date range
        { updatedAt: { $gte: startDate } } // Cover letters updated in the date range
      ]
    }).sort({ createdAt: 1 });

    // Group data by date
    const dataByDate: { [key: string]: { jobs: number; cvs: number; coverLetters: number } } = {};

    // Initialize all dates in range with zero values
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dataByDate[dateKey] = { jobs: 0, cvs: 0, coverLetters: 0 };
    }

    // Count jobs by date (consider both creation and update dates)
    jobs.forEach(job => {
      const createdDate = job.createdAt.toISOString().split('T')[0];
      const updatedDate = job.updatedAt ? job.updatedAt.toISOString().split('T')[0] : null;
      
      // Count job creation
      if (dataByDate[createdDate]) {
        dataByDate[createdDate].jobs++;
      }
      
      // If job was updated in the date range (status change), count it again for the update date
      if (updatedDate && updatedDate !== createdDate && dataByDate[updatedDate]) {
        dataByDate[updatedDate].jobs++;
      }
    });

    // Count CVs by date (consider both creation and update dates)
    cvs.forEach(cv => {
      const createdDate = cv.createdAt.toISOString().split('T')[0];
      const updatedDate = cv.updatedAt ? cv.updatedAt.toISOString().split('T')[0] : null;
      
      // Count CV creation
      if (dataByDate[createdDate]) {
        dataByDate[createdDate].cvs++;
      }
      
      // If CV was updated in the date range, count it again for the update date
      if (updatedDate && updatedDate !== createdDate && dataByDate[updatedDate]) {
        dataByDate[updatedDate].cvs++;
      }
    });

    // Count cover letters by date (consider both creation and update dates)
    coverLetters.forEach(coverLetter => {
      const createdDate = coverLetter.createdAt.toISOString().split('T')[0];
      const updatedDate = coverLetter.updatedAt ? coverLetter.updatedAt.toISOString().split('T')[0] : null;
      
      // Count cover letter creation
      if (dataByDate[createdDate]) {
        dataByDate[createdDate].coverLetters++;
      }
      
      // If cover letter was updated in the date range, count it again for the update date
      if (updatedDate && updatedDate !== createdDate && dataByDate[updatedDate]) {
        dataByDate[updatedDate].coverLetters++;
      }
    });

    // Convert to array format
    const progressData = Object.entries(dataByDate).map(([date, counts]) => ({
      date,
      jobs: counts.jobs,
      cvs: counts.cvs,
      coverLetters: counts.coverLetters
    }));

    console.log('Progress API: Data summary', {
      totalJobs: jobs.length,
      totalCVs: cvs.length,
      totalCoverLetters: coverLetters.length,
      progressDataPoints: progressData.length,
      sampleData: progressData.slice(0, 3)
    });

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
