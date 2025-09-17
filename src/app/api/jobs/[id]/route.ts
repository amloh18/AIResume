import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { JobApplication } from '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const resolvedParams = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const job = await JobApplication.findOne({
      _id: resolvedParams.id,
      userId: userId
    });

    if (!job) {
      return NextResponse.json({ 
        success: false,
        message: 'Job not found',
        error: 'Job not found' 
      }, { status: 404 });
    }

    // Transform the job data to match the expected format
    const transformedJob = {
      id: job._id,
      _id: job._id, // Include both id and _id for compatibility
      title: job.jobTitle,
      jobTitle: job.jobTitle, // Include both title and jobTitle for compatibility
      company: job.company,
      location: job.location,
      description: job.jobDescription,
      jobDescription: job.jobDescription, // Include both description and jobDescription for compatibility
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      salary: job.salary,
      type: job.type || 'full-time',
      remote: job.remote || false,
      postedDate: job.postedDate,
      applicationDeadline: job.applicationDeadline,
      status: job.status,
      // cvId removed - relationships now managed through CVJourney
      userId: job.userId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };

    return NextResponse.json({ 
      success: true,
      data: { job: transformedJob },
      job: transformedJob // Keep for backwards compatibility
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const resolvedParams = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const job = await JobApplication.findOneAndUpdate(
      {
        _id: resolvedParams.id,
        userId: userId
      },
      {
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update CV journeys with new job data if job title or company changed
    if (body.jobTitle || body.company) {
      try {
        const { CVJourney } = await import('@/models');
        await CVJourney.updateMany(
          { jobId: resolvedParams.id },
          { 
            $set: { 
              jobTitle: job.jobTitle,
              company: job.company,
              'metadata.updatedAt': new Date()
            }
          }
        );
        console.log(`Updated CV journeys with new job data for job ${resolvedParams.id}`);
      } catch (error) {
        console.error('Error updating CV journeys with job data:', error);
        // Don't fail the job update if journey update fails
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const resolvedParams = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const job = await JobApplication.findOneAndDelete({
      _id: resolvedParams.id,
      userId: userId
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
