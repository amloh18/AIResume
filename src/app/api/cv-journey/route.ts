import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CVJourney } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';

// Utility function to update job data in CV journeys
async function updateJobDataInJourneys(jobId: string) {
  try {
    const { JobApplication } = await import('@/models');
    const job = await JobApplication.findById(jobId);
    
    if (!job) {
      console.warn(`Job ${jobId} not found for journey update`);
      return;
    }

    // Update all journeys for this job
    const result = await CVJourney.updateMany(
      { jobId },
      { 
        $set: { 
          jobTitle: job.jobTitle,
          company: job.company,
          'metadata.updatedAt': new Date()
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} journeys with job data for job ${jobId}`);
  } catch (error) {
    console.error('Error updating job data in journeys:', error);
  }
}

// GET - Get CV journeys for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');
    const cvId = searchParams.get('cvId');
    const coverLetterId = searchParams.get('coverLetterId');
    const status = searchParams.get('status');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query: any = { userId };
    
    if (jobId) {
      query.jobId = jobId;
    }
    
    if (cvId) {
      query.cvId = cvId;
    }
    
    if (coverLetterId) {
      query.coverLetterId = coverLetterId;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const journeys = await CVJourney.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        journeys: journeys.map(journey => ({
          id: journey._id.toString(),
          journeyId: journey.journeyId,
          userId: journey.userId,
          jobId: journey.jobId,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          status: journey.status,
          currentStep: journey.currentStep,
          totalSteps: journey.totalSteps,
          atsScore: journey.atsScore,
          atsScoreJobId: journey.atsScoreJobId,
          jobTitle: journey.jobTitle,
          company: journey.company,
          steps: journey.steps,
          metadata: journey.metadata,
          createdAt: journey.createdAt,
          updatedAt: journey.updatedAt
        }))
      }
    });

  } catch (error: any) {
    console.error('Get CV journeys error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// POST - Create or update a CV journey
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      userId, 
      jobId, 
      cvId, 
      coverLetterId, 
      journeyName,
      atsScore,
      currentStep,
      status = 'in-progress'
    } = body;

    if (!userId || !jobId) {
      return NextResponse.json(
        { success: false, message: 'User ID and Job ID are required' },
        { status: 400 }
      );
    }

    // Fetch job data to get job title and company
    const { JobApplication } = await import('@/models');
    const job = await JobApplication.findById(jobId);
    
    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if journey already exists for this job
    let journey = await CVJourney.findOne({ userId, jobId });

    if (journey) {
      // Update existing journey
      if (cvId !== undefined) journey.cvId = cvId;
      if (coverLetterId !== undefined) journey.coverLetterId = coverLetterId;
      if (atsScore !== undefined) journey.atsScore = atsScore;
      if (currentStep !== undefined) journey.currentStep = currentStep;
      if (status !== undefined) journey.status = status;
      
      // Update job title and company from job data
      journey.jobTitle = job.jobTitle;
      journey.company = job.company;
      
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();
      
      await journey.save();
      
      return NextResponse.json({
        success: true,
        message: 'Journey updated successfully',
        data: {
          journey: {
            id: journey._id.toString(),
            journeyId: journey.journeyId,
            userId: journey.userId,
            jobId: journey.jobId,
            cvId: journey.cvId,
            coverLetterId: journey.coverLetterId,
            status: journey.status,
            currentStep: journey.currentStep,
            totalSteps: journey.totalSteps,
            atsScore: journey.atsScore,
            jobTitle: journey.jobTitle,
            company: journey.company
          }
        }
      });
    } else {
      // Create new journey
      const newJourney = new CVJourney({
        userId,
        jobId,
        cvId: cvId || null,
        coverLetterId: coverLetterId || null,
        status,
        currentStep: currentStep || 1,
        totalSteps: 5,
        atsScore: atsScore || null,
        jobTitle: job.jobTitle,
        company: job.company,
        steps: [
          { stepId: 1, name: 'Add Job', status: 'completed' },
          { stepId: 2, name: 'Create CV', status: cvId ? 'completed' : 'pending' },
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

      await newJourney.save();

      return NextResponse.json({
        success: true,
        message: 'Journey created successfully',
        data: {
          journey: {
            id: newJourney._id.toString(),
            journeyId: newJourney.journeyId,
            userId: newJourney.userId,
            jobId: newJourney.jobId,
            cvId: newJourney.cvId,
            coverLetterId: newJourney.coverLetterId,
            status: newJourney.status,
            currentStep: newJourney.currentStep,
            totalSteps: newJourney.totalSteps,
            atsScore: newJourney.atsScore,
            jobTitle: newJourney.jobTitle,
            company: newJourney.company
          }
        }
      });
    }

  } catch (error: any) {
    console.error('Create/Update CV journey error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// PUT - Update job data in CV journeys (refresh from job)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Update job data in all journeys for this job
    await updateJobDataInJourneys(jobId);

    return NextResponse.json({
      success: true,
      message: 'Job data updated in CV journeys'
    });

  } catch (error: any) {
    console.error('Update job data in journeys error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// DELETE - Delete a CV journey
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { journeyId, userId } = body;

    if (!journeyId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Journey ID and User ID are required' },
        { status: 400 }
      );
    }

    const result = await CVJourney.findOneAndDelete({ 
      _id: journeyId, 
      userId 
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Journey not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Journey deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete CV journey error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
