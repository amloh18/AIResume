import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import { JobApplication } from '@/models';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    console.log('Progress API: Request received', { range });

    // Get authenticated user to ensure we have the correct MongoDB ObjectId
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult || !authResult.userId) {
      console.log('Progress API: No authenticated user found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Calculate date range
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // JobApplication uses Mixed type for userId, so we need to handle both ObjectId and string
    // Support both ObjectId and string userId formats
    let userIdQuery: any;
    if (mongoose.Types.ObjectId.isValid(authResult.userId)) {
      userIdQuery = { $in: [new mongoose.Types.ObjectId(authResult.userId), authResult.userId] };
    } else {
      userIdQuery = authResult.userId;
    }

    console.log('Progress API: Using userId from authenticated user', { 
      userId: authResult.userId,
      userIdQuery 
    });

    // Fetch jobs created in the date range OR updated in the date range
    const jobs = await JobApplication.find({
      userId: userIdQuery,
      $or: [
        { createdAt: { $gte: startDate } }, // Jobs created in the date range
        { updatedAt: { $gte: startDate } } // Jobs updated in the date range
      ]
    }).sort({ createdAt: 1 });

    console.log('Progress API: Query condition', { 
      userIdQuery, 
      startDate: startDate.toISOString(),
      jobsCount: jobs.length 
    });

    console.log('Progress API: Jobs fetched', { count: jobs.length, sample: jobs.slice(0, 2).map(j => ({ id: j._id, createdAt: j.createdAt, updatedAt: j.updatedAt })) });

    // CV and CoverLetter use ObjectId for userId, so we can use the ObjectId directly
    const userIdObjectId = mongoose.Types.ObjectId.isValid(authResult.userId) 
      ? new mongoose.Types.ObjectId(authResult.userId)
      : null;

    if (!userIdObjectId) {
      console.error('Progress API: Invalid userId format for CV/CoverLetter query', { userId: authResult.userId });
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Fetch CVs created or updated in the date range
    const cvs = await CV.find({
      userId: userIdObjectId,
      $or: [
        { createdAt: { $gte: startDate } }, // CVs created in the date range
        { updatedAt: { $gte: startDate } } // CVs updated in the date range
      ]
    }).sort({ createdAt: 1 });

    console.log('Progress API: CVs fetched', { count: cvs.length });

    // Fetch cover letters created or updated in the date range
    const coverLetters = await CoverLetter.find({
      userId: userIdObjectId,
      $or: [
        { createdAt: { $gte: startDate } }, // Cover letters created in the date range
        { updatedAt: { $gte: startDate } } // Cover letters updated in the date range
      ]
    }).sort({ createdAt: 1 });

    console.log('Progress API: Cover letters fetched', { count: coverLetters.length });

    // Group data by date
    const dataByDate: { [key: string]: { jobs: number; cvs: number; coverLetters: number } } = {};

    // Initialize all dates in range with zero values
    // Use UTC dates to avoid timezone issues
    const startDateUTC = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    ));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDateUTC.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dataByDate[dateKey] = { jobs: 0, cvs: 0, coverLetters: 0 };
    }
    
    console.log('Progress API: Date range initialized', { 
      startDate: startDateUTC.toISOString().split('T')[0],
      endDate: new Date(startDateUTC.getTime() + (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalDays: days,
      dateKeys: Object.keys(dataByDate).slice(0, 5)
    });

    // Count jobs by date (consider both creation and update dates, same as CVs and Cover Letters)
    jobs.forEach(job => {
      // Convert dates to UTC date strings (YYYY-MM-DD) for consistent comparison
      const createdDate = job.createdAt 
        ? new Date(job.createdAt).toISOString().split('T')[0] 
        : null;
      const updatedDate = job.updatedAt 
        ? new Date(job.updatedAt).toISOString().split('T')[0] 
        : null;
      
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

    console.log('Progress API: Jobs counted by date', { 
      totalJobs: jobs.length,
      jobsInDateRange: Object.values(dataByDate).reduce((sum, day) => sum + day.jobs, 0)
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
