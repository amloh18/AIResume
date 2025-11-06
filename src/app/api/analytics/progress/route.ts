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
        { updatedAt: { $gte: startDate } } // Jobs updated in the date range
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

    // Count jobs by date (consider both creation and update dates, same as CVs and Cover Letters)
    jobs.forEach(job => {
      const createdDate = job.createdAt ? job.createdAt.toISOString().split('T')[0] : null;
      const updatedDate = job.updatedAt ? job.updatedAt.toISOString().split('T')[0] : null;
      
      // Count job creation if it's within the date range
      if (createdDate && dataByDate[createdDate]) {
        dataByDate[createdDate].jobs++;
      }
      
      // Count job update if it's within the date range and different from creation date
      // This ensures jobs updated in the range are counted even if created before the range
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

    // Calculate totals from the grouped data (not from raw counts)
    const totalJobsInData = progressData.reduce((sum, item) => sum + item.jobs, 0);
    const totalCVsInData = progressData.reduce((sum, item) => sum + item.cvs, 0);
    const totalCoverLettersInData = progressData.reduce((sum, item) => sum + item.coverLetters, 0);

    console.log('Progress API: Data summary', {
      totalJobsFetched: jobs.length,
      totalCVsFetched: cvs.length,
      totalCoverLettersFetched: coverLetters.length,
      totalJobsInData: totalJobsInData,
      totalCVsInData: totalCVsInData,
      totalCoverLettersInData: totalCoverLettersInData,
      progressDataPoints: progressData.length,
      sampleData: progressData.slice(0, 3),
      dateRange: { start: startDate.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
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
