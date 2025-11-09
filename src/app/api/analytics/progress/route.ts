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

    // OPTIMIZED: Use MongoDB aggregation pipeline to do counting in database
    // This is much faster than fetching all documents and processing in JavaScript
    const userIdObjectId = mongoose.Types.ObjectId.isValid(authResult.userId) 
      ? new mongoose.Types.ObjectId(authResult.userId)
      : null;

    if (!userIdObjectId) {
      console.error('Progress API: Invalid userId format', { userId: authResult.userId });
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Initialize date range
    const startDateUTC = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    ));
    
    // Use aggregation pipelines to count by date - much faster than fetching all documents
    const [jobsData, cvsData, coverLettersData] = await Promise.all([
      // Jobs aggregation
      JobApplication.aggregate([
        {
          $match: {
            userId: userIdQuery,
            $or: [
              { createdAt: { $gte: startDate } },
              { updatedAt: { $gte: startDate } }
            ]
          }
        },
        {
          $project: {
            createdDate: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            updatedDate: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }
          }
        },
        {
          $facet: {
            created: [
              { $group: { _id: '$createdDate', count: { $sum: 1 } } }
            ],
            updated: [
              { 
                $match: { $expr: { $ne: ['$createdDate', '$updatedDate'] } }
              },
              { $group: { _id: '$updatedDate', count: { $sum: 1 } } }
            ]
          }
        },
        {
          $project: {
            all: { $concatArrays: ['$created', '$updated'] }
          }
        },
        {
          $unwind: '$all'
        },
        {
          $group: {
            _id: '$all._id',
            count: { $sum: '$all.count' }
          }
        }
      ]),
      
      // CVs aggregation
      CV.aggregate([
        {
          $match: {
            userId: userIdObjectId,
            $or: [
              { createdAt: { $gte: startDate } },
              { updatedAt: { $gte: startDate } }
            ]
          }
        },
        {
          $project: {
            createdDate: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            updatedDate: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }
          }
        },
        {
          $facet: {
            created: [
              { $group: { _id: '$createdDate', count: { $sum: 1 } } }
            ],
            updated: [
              { 
                $match: { $expr: { $ne: ['$createdDate', '$updatedDate'] } }
              },
              { $group: { _id: '$updatedDate', count: { $sum: 1 } } }
            ]
          }
        },
        {
          $project: {
            all: { $concatArrays: ['$created', '$updated'] }
          }
        },
        {
          $unwind: '$all'
        },
        {
          $group: {
            _id: '$all._id',
            count: { $sum: '$all.count' }
          }
        }
      ]),
      
      // Cover Letters aggregation
      CoverLetter.aggregate([
        {
          $match: {
            userId: userIdObjectId,
            $or: [
              { createdAt: { $gte: startDate } },
              { updatedAt: { $gte: startDate } }
            ]
          }
        },
        {
          $project: {
            createdDate: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            updatedDate: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }
          }
        },
        {
          $facet: {
            created: [
              { $group: { _id: '$createdDate', count: { $sum: 1 } } }
            ],
            updated: [
              { 
                $match: { $expr: { $ne: ['$createdDate', '$updatedDate'] } }
              },
              { $group: { _id: '$updatedDate', count: { $sum: 1 } } }
            ]
          }
        },
        {
          $project: {
            all: { $concatArrays: ['$created', '$updated'] }
          }
        },
        {
          $unwind: '$all'
        },
        {
          $group: {
            _id: '$all._id',
            count: { $sum: '$all.count' }
          }
        }
      ])
    ]);

    // Initialize all dates in range with zero values
    const dataByDate: { [key: string]: { jobs: number; cvs: number; coverLetters: number } } = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDateUTC.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dataByDate[dateKey] = { jobs: 0, cvs: 0, coverLetters: 0 };
    }

    // Populate counts from aggregation results
    jobsData.forEach((item: any) => {
      if (dataByDate[item._id]) {
        dataByDate[item._id].jobs = item.count;
      }
    });

    cvsData.forEach((item: any) => {
      if (dataByDate[item._id]) {
        dataByDate[item._id].cvs = item.count;
      }
    });

    coverLettersData.forEach((item: any) => {
      if (dataByDate[item._id]) {
        dataByDate[item._id].coverLetters = item.count;
      }
    });

    // Convert to array format
    const progressData = Object.entries(dataByDate).map(([date, counts]) => ({
      date,
      jobs: counts.jobs,
      cvs: counts.cvs,
      coverLetters: counts.coverLetters
    }));

    // Calculate totals
    const totalJobs = jobsData.reduce((sum: number, item: any) => sum + item.count, 0);
    const totalCVs = cvsData.reduce((sum: number, item: any) => sum + item.count, 0);
    const totalCoverLetters = coverLettersData.reduce((sum: number, item: any) => sum + item.count, 0);

    console.log('Progress API: Optimized aggregation complete', {
      totalJobs,
      totalCVs,
      totalCoverLetters,
      progressDataPoints: progressData.length
    });

    return NextResponse.json({
      success: true,
      data: progressData,
      summary: {
        totalJobs,
        totalCVs,
        totalCoverLetters,
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
