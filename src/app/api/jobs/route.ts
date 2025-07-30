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

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const query: any = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const jobs = await JobApplication.find(query)
      .sort({ applicationDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: jobs
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