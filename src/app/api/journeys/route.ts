import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { JobApplication, CV, CoverLetter, CVJourney } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'in-progress' | 'completed' | 'all'
    const jobId = searchParams.get('jobId'); // Filter by specific job ID
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query for CV Journeys
    let journeyQuery: any = { userId };
    
    // Add jobId filter if provided
    if (jobId) {
      journeyQuery.jobId = jobId;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      journeyQuery.status = status;
    }

    // Fetch CV Journeys for the user with optimized query
    const cvJourneys = await CVJourney.find(journeyQuery)
      .select('_id jobId jobTitle company status currentStep totalSteps createdAt updatedAt atsScore cvId coverLetterId')
      .sort({ updatedAt: -1 })
      .lean();

    // Transform CV Journeys into the expected format
    const journeys = cvJourneys.map(journey => ({
      id: journey._id.toString(),
      jobId: journey.jobId,
      jobTitle: journey.jobTitle,
      company: journey.company,
      status: journey.status,
      currentStep: journey.currentStep,
      totalSteps: journey.totalSteps || 5,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
      atsScore: journey.atsScore,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId
    }));

    return NextResponse.json({
      success: true,
      data: {
        journeys
      }
    });

  } catch (error: any) {
    console.error('Journeys API error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Journeys API - POST request received');
    await connectDB();
    
    const body = await request.json();
    const { userId, jobId, cvId, coverLetterId, journeyName } = body;

    if (!userId || !jobId) {
      return NextResponse.json(
        { success: false, message: 'User ID and Job ID are required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    let journey = await CVJourney.findOne({ userId, jobId });

    if (journey) {
      // Update existing journey
      if (cvId !== undefined) journey.cvId = cvId;
      if (coverLetterId !== undefined) journey.coverLetterId = coverLetterId;
      
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();
      
      await journey.save();
      
      return NextResponse.json({
        success: true,
        message: 'Journey updated successfully',
        data: {
          journey: {
            id: journey._id.toString(),
            jobId: journey.jobId,
            cvId: journey.cvId,
            coverLetterId: journey.coverLetterId,
            status: journey.status,
            currentStep: journey.currentStep,
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
        status: 'in-progress',
        currentStep: 1,
        totalSteps: 5,
        atsScore: null,
        jobTitle: '', // Will be populated from job data
        company: '', // Will be populated from job data
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

      // Fetch job data to populate job title and company
      const job = await JobApplication.findById(jobId);
      if (job) {
        newJourney.jobTitle = job.jobTitle;
        newJourney.company = job.company;
      }

      await newJourney.save();

      return NextResponse.json({
        success: true,
        message: 'Journey created successfully',
        data: {
          journey: {
            id: newJourney._id.toString(),
            jobId: newJourney.jobId,
            cvId: newJourney.cvId,
            coverLetterId: newJourney.coverLetterId,
            status: newJourney.status,
            currentStep: newJourney.currentStep,
            jobTitle: newJourney.jobTitle,
            company: newJourney.company
          }
        }
      });
    }

  } catch (error: any) {
    console.error('Create/Update journey error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 Journeys API - DELETE request received');
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
    console.error('Delete journey error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}