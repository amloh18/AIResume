import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import JobApplication from '@/models/JobApplication';
import { createErrorResponse } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const period = searchParams.get('period') || 'all';
    const sort = searchParams.get('sort') || 'createdAt';
    const limit = searchParams.get('limit');
    const hasInterviewWithin = searchParams.get('hasInterviewWithin');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create base query
    let query: any = { userId, isArchived: false };

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

    // Build the query
    let jobsQuery = JobApplication.find(query);

    // Apply sorting
    const sortOrder = sort === 'createdAt' ? -1 : 1;
    jobsQuery = jobsQuery.sort({ [sort]: sortOrder });

    // Apply limit if specified
    if (limit) {
      jobsQuery = jobsQuery.limit(parseInt(limit));
    }

    // Execute query
    const jobs = await jobsQuery.lean();

    // Calculate counts for different statuses
    const counts = await Promise.all([
      JobApplication.countDocuments({ userId, isArchived: false }),
      JobApplication.countDocuments({ userId, status: 'created', isArchived: false }),
      JobApplication.countDocuments({ userId, status: 'applied', isArchived: false }),
      JobApplication.countDocuments({ userId, status: 'interview', isArchived: false }),
      JobApplication.countDocuments({ userId, status: 'offer', isArchived: false }),
      JobApplication.countDocuments({ userId, status: 'rejected', isArchived: false })
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
        JobApplication.countDocuments({ userId, createdAt: { $gte: previousStartDate, $lt: previousEndDate }, isArchived: false }),
        JobApplication.countDocuments({ userId, status: 'created', createdAt: { $gte: previousStartDate, $lt: previousEndDate }, isArchived: false }),
        JobApplication.countDocuments({ userId, status: 'applied', createdAt: { $gte: previousStartDate, $lt: previousEndDate }, isArchived: false }),
        JobApplication.countDocuments({ userId, status: 'interview', createdAt: { $gte: previousStartDate, $lt: previousEndDate }, isArchived: false }),
        JobApplication.countDocuments({ userId, status: 'offer', createdAt: { $gte: previousStartDate, $lt: previousEndDate }, isArchived: false })
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
      applicationDate: job.applicationDate,
      deadline: job.deadline,
      interviews: job.interviews,
      contacts: job.contacts,
      notes: job.notes,
      salary: job.salary,
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
    await connectDB();
    
    const body = await request.json();
    const { userId, cvId, ...jobData } = body;

    if (!userId || !cvId) {
      return NextResponse.json(
        { success: false, message: 'User ID and CV ID are required' },
        { status: 400 }
      );
    }

    // Set application date when status is 'applied'
    if (jobData.status === 'applied') {
      jobData.applicationDate = new Date();
    }
    // Clear application date when status is 'created'
    if (jobData.status === 'created') {
      jobData.applicationDate = null;
    }

    const job = new JobApplication({
      userId,
      cvId,
      ...jobData
    });

    await job.save();

    // Log activity
    try {
      const { ActivityService } = await import('@/lib/services/activityService');
      await ActivityService.logJobCreated(userId, job._id.toString(), jobData.jobTitle, jobData.company);
    } catch (activityError) {
      console.error('Failed to log job creation activity:', activityError);
    }

    return NextResponse.json({
      success: true,
      message: 'Job application created successfully',
      data: job
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
    await connectDB();
    
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get the current job to track status changes
    const currentJob = await JobApplication.findById(id);
    if (!currentJob) {
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
      updateData.applicationDate = null;
    }

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