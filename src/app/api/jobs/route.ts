import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import JobApplication from '@/models/JobApplication';
import { createErrorResponse } from '@/lib/db-utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const period = searchParams.get('period') || 'all';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const limit = searchParams.get('limit');
    const hasInterviewWithin = searchParams.get('hasInterviewWithin');
    // cvId removed - relationships now managed through CVJourney

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create base query - handle both ObjectId and string types
    let query: any;
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      // MongoDB ObjectId format (24 hex chars) - try both ObjectId and string
      query = { 
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { userId: userId }
        ],
        $and: [
          {
            $or: [
              { isArchived: false },
              { isArchived: { $exists: false } }
            ]
          }
        ]
      };
    } else {
      // NextAuth string format - use as string
      query = { 
        userId: userId, 
        $or: [
          { isArchived: false },
          { isArchived: { $exists: false } }
        ]
      };
    }

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add period filter
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
      
      query.createdAt = { $gte: startDate };
    }

    // Add interview filter
    if (hasInterviewWithin) {
      const now = new Date();
      let endDate = new Date();
      
      switch (hasInterviewWithin) {
        case 'week':
          endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
      }
      
      query['interviews.date'] = { $gte: now, $lte: endDate };
    }

    // CV filter removed - relationships now managed through CVJourney

    // Add job ID filter
    if (jobId) {
      // Convert jobId to ObjectId if it's a valid ObjectId string
      if (/^[0-9a-fA-F]{24}$/.test(jobId)) {
        query._id = new mongoose.Types.ObjectId(jobId);
      } else {
        query._id = jobId;
      }
    }

    // Build the query
    let jobsQuery = JobApplication.find(query);

    // Apply sorting
    const sortOrder = order === 'asc' ? 1 : -1;
    jobsQuery = jobsQuery.sort({ [sort]: sortOrder });

    // Apply limit if specified
    if (limit) {
      jobsQuery = jobsQuery.limit(parseInt(limit));
    }

    // Execute query
    const jobs = await jobsQuery.lean();

    // Helper function to create count query
    const createCountQuery = (additionalFilters: any = {}) => {
      if (/^[0-9a-fA-F]{24}$/.test(userId)) {
        // MongoDB ObjectId format - try both ObjectId and string
        return {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            { userId: userId }
          ],
          $and: [
            {
              $or: [
                { isArchived: false },
                { isArchived: { $exists: false } }
              ]
            },
            additionalFilters
          ]
        };
      } else {
        // NextAuth string format
        return {
          userId: userId,
          $or: [
            { isArchived: false },
            { isArchived: { $exists: false } }
          ],
          ...additionalFilters
        };
      }
    };

    // Calculate counts for different statuses
    const counts = await Promise.all([
      JobApplication.countDocuments(createCountQuery()),
      JobApplication.countDocuments(createCountQuery({ status: 'created' })),
      JobApplication.countDocuments(createCountQuery({ status: 'applied' })),
      JobApplication.countDocuments(createCountQuery({ status: 'interview' })),
      JobApplication.countDocuments(createCountQuery({ status: 'offer' })),
      JobApplication.countDocuments(createCountQuery({ status: 'rejected' }))
    ]);

    const [total, created, applied, interview, offer, rejected] = counts;

    // Calculate deltas (comparing with previous period)
    const calculateDeltas = async () => {
      if (period === 'all') return { totalJobs: '0%', created: '0%', applied: '0%', interviews: '0%', offers: '0%' };
      
      const now = new Date();
      let currentStartDate = new Date();
      let previousStartDate = new Date();
      let previousEndDate = new Date();
      
      switch (period) {
        case 'day':
          currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
      
      const previousCounts = await Promise.all([
        JobApplication.countDocuments(createCountQuery({ createdAt: { $gte: previousStartDate, $lt: previousEndDate } })),
        JobApplication.countDocuments(createCountQuery({ status: 'created', createdAt: { $gte: previousStartDate, $lt: previousEndDate } })),
        JobApplication.countDocuments(createCountQuery({ status: 'applied', createdAt: { $gte: previousStartDate, $lt: previousEndDate } })),
        JobApplication.countDocuments(createCountQuery({ status: 'interview', createdAt: { $gte: previousStartDate, $lt: previousEndDate } })),
        JobApplication.countDocuments(createCountQuery({ status: 'offer', createdAt: { $gte: previousStartDate, $lt: previousEndDate } }))
      ]);
      
      const [prevTotal, prevCreated, prevApplied, prevInterview, prevOffer] = previousCounts;
      
      const calculateDelta = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const delta = ((current - previous) / previous) * 100;
        return `${delta >= 0 ? '+' : ''}${Math.round(delta)}%`;
      };
      
      return {
        totalJobs: calculateDelta(total, prevTotal),
        created: calculateDelta(created, prevCreated),
        applied: calculateDelta(applied, prevApplied),
        interviews: calculateDelta(interview, prevInterview),
        offers: calculateDelta(offer, prevOffer)
      };
    };

    const deltas = await calculateDeltas();

    // Transform jobs for response
    const transformedJobs = jobs.map(job => ({
      id: job._id,
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location,
      status: job.status,
      priority: job.priority,
      jobDescription: job.jobDescription,
      jobUrl: job.jobUrl,
      sponsorship: job.sponsorship,
      applicationDate: job.applicationDate,
      deadline: job.deadline,
      interviews: job.interviews,
      contacts: job.contacts,
      notes: job.notes,
      salary: job.salary,
      tags: job.tags,
      isArchived: job.isArchived,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      daysSinceApplication: job.daysSinceApplication
    }));

    return NextResponse.json({
      success: true,
      data: {
        jobs: transformedJobs,
        total,
        counts: {
          total,
          created,
          applied,
          interview,
          offer,
          rejected
        },
        summary: {
          totalJobs: total,
          created,
          applied,
          interviews: interview,
          offers: offer,
          deltas
        }
      }
    });

  } catch (error: any) {
    console.error('Get jobs error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Job API - Starting POST request');
    await connectDB();
    console.log('🔍 Job API - Database connected');
    
    const body = await request.json();
    console.log('🔍 Job API - Request body:', JSON.stringify(body, null, 2));
    const { userId, ...jobData } = body; // cvId removed - relationships now managed through CVJourney

    console.log('🔍 Job API - Extracted userId:', userId);
    console.log('🔍 Job API - Job data:', jobData);

    if (!userId) {
      console.log('❌ Job API - Missing required fields:', { userId: !!userId });
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log('✅ Job API - Required fields validation passed');

    // Set application date when status is 'applied'
    if (jobData.status === 'applied') {
      jobData.applicationDate = new Date();
    }
    // Clear application date when status is 'created'
    if (jobData.status === 'created') {
      jobData.applicationDate = undefined;
    }

    console.log('🔍 Job API - Creating JobApplication with data:', {
      userId,
      ...jobData
    });

    const job = new JobApplication({
      userId,
      ...jobData
    });

    console.log('🔍 Job API - JobApplication instance created, saving...');
    console.log('🔍 Job API - Job instance data before save:', {
      _id: job._id,
      applicationDate: job.applicationDate,
      deadline: job.deadline,
      status: job.status
    });
    
    await job.save();
    console.log('✅ Job API - Job saved successfully with ID:', job._id);

    // Automatically create CV Journey for this job
    try {
      const { CVJourney } = await import('@/models');
      console.log('🔍 Job API - Creating CV Journey for job:', job._id);
      
      const cvJourney = new CVJourney({
        userId,
        jobId: job._id.toString(),
        cvId: null, // Will be populated when CV is created
        coverLetterId: null, // Will be populated when cover letter is created
        status: 'in-progress',
        currentStep: 1,
        totalSteps: 5,
        atsScore: null,
        jobTitle: job.jobTitle,
        company: job.company,
        steps: [
          { stepId: 1, name: 'Add Job', status: 'completed' },
          { stepId: 2, name: 'Create CV', status: 'pending' },
          { stepId: 3, name: 'ATS Score', status: 'pending' },
          { stepId: 4, name: 'Cover Letter', status: 'pending' },
          { stepId: 5, name: 'Download', status: 'pending' }
        ],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date()
        }
      });

      await cvJourney.save();
      console.log('✅ Job API - CV Journey created successfully with ID:', cvJourney._id);
    } catch (cvJourneyError) {
      console.error('❌ Job API - Failed to create CV Journey:', cvJourneyError);
      // Don't fail the job creation if CV Journey creation fails
    }

    // Log activity
    try {
      const { ActivityService } = await import('@/lib/services/activityService');
      await ActivityService.logJobCreated(userId, job._id.toString(), jobData.jobTitle, jobData.company);
    } catch (activityError) {
      console.error('Failed to log job creation activity:', activityError);
    }

    console.log('🔍 Job API - Preparing response...');
    const jobResponse = job.toJSON();
    console.log('🔍 Job API - Job data after toJSON:', jobResponse);
    
    return NextResponse.json({
      success: true,
      message: 'Job application created successfully',
      data: jobResponse
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create job error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Job API - Starting PUT request');
    await connectDB();
    
    const body = await request.json();
    console.log('🔍 Job API - PUT request body:', JSON.stringify(body, null, 2));
    const { id, ...updateData } = body;

    console.log('🔍 Job API - Extracted ID:', id);
    console.log('🔍 Job API - Update data:', updateData);

    if (!id) {
      console.log('❌ Job API - Missing job ID');
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get the current job to track status changes
    console.log('🔍 Job API - Looking up job with ID:', id);
    const currentJob = await JobApplication.findById(id);
    console.log('🔍 Job API - Current job found:', currentJob ? 'Yes' : 'No');
    
    if (!currentJob) {
      console.log('❌ Job API - Job not found with ID:', id);
      return NextResponse.json(
        { success: false, message: 'Job application not found' },
        { status: 404 }
      );
    }

    // Set application date when status changes to 'applied'
    if (updateData.status === 'applied' && !updateData.applicationDate) {
      updateData.applicationDate = new Date();
    }
    // Clear application date when status changes to 'created'
    if (updateData.status === 'created') {
      updateData.applicationDate = undefined;
    }

    console.log('🔍 Job API - Final update data:', updateData);

    const job = await JobApplication.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job application not found' },
        { status: 404 }
      );
    }

    // Log status change activity
    if (updateData.status && updateData.status !== currentJob.status) {
      try {
        const { ActivityService } = await import('@/lib/services/activityService');
        await ActivityService.logJobStatusChange(
          job.userId.toString(),
          job._id.toString(),
          job.jobTitle,
          job.company,
          currentJob.status,
          updateData.status
        );
      } catch (activityError) {
        console.error('Failed to log job status change activity:', activityError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Job application updated successfully',
      data: job
    });

  } catch (error: any) {
    console.error('Update job error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = await JobApplication.findByIdAndDelete(id);

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job application deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete job error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 