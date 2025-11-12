import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { ApplicationJourney, CV, JobApplication, CoverLetter } from '@/models';
import mongoose from 'mongoose';

/**
 * GET endpoint to fetch a journey by ID with all related data (CV, job, cover letter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const resolvedParams = await params;
    const journeyId = resolvedParams.id;
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from session
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Find the journey with user validation
    const journey = await ApplicationJourney.findOne({
      _id: journeyId,
      userId: new mongoose.Types.ObjectId(userId)
    }).lean();
    
    if (!journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Load related data in parallel
    const [jobData, cvData, coverLetterData] = await Promise.allSettled([
      // Load job data
      journey.jobId 
        ? JobApplication.findOne({
            _id: journey.jobId,
            userId: new mongoose.Types.ObjectId(userId)
          }).lean()
        : Promise.resolve(null),
      
      // Load CV data
      journey.cvId
        ? CV.findOne({
            _id: journey.cvId,
            userId: new mongoose.Types.ObjectId(userId)
          }).lean()
        : Promise.resolve(null),
      
      // Load cover letter data
      journey.coverLetterId
        ? CoverLetter.findOne({
            _id: journey.coverLetterId,
            userId: new mongoose.Types.ObjectId(userId)
          }).lean()
        : Promise.resolve(null)
    ]);

    // Extract data from settled promises
    const job = jobData.status === 'fulfilled' ? jobData.value : null;
    const cv = cvData.status === 'fulfilled' ? cvData.value : null;
    const coverLetter = coverLetterData.status === 'fulfilled' ? coverLetterData.value : null;

    // Transform journey data
    const journeyResponse = {
      id: journey._id.toString(),
      journeyId: journey.journeyId,
      jobId: journey.jobId,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      status: journey.status,
      currentStep: journey.currentStep,
      totalSteps: journey.totalSteps,
      atsScore: journey.atsScore,
      jobTitle: journey.jobTitle,
      company: journey.company,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt
    };

    // Transform job data
    const jobResponse = job ? {
      id: job._id.toString(),
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      status: job.status,
      salary: job.salary,
      deadline: job.deadline,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    } : null;

    // Transform CV data
    const cvResponse = cv ? {
      id: cv._id.toString(),
      title: cv.title,
      cvData: cv.cvData,
      templateId: cv.templateId,
      status: cv.status,
      metadata: cv.metadata,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt
    } : null;

    // Transform cover letter data
    const coverLetterResponse = coverLetter ? {
      id: coverLetter._id.toString(),
      title: coverLetter.title,
      content: coverLetter.content,
      status: coverLetter.status,
      metadata: coverLetter.metadata,
      createdAt: coverLetter.createdAt,
      updatedAt: coverLetter.updatedAt
    } : null;

    console.log('✅ Journey GET API - Journey data loaded successfully:', journeyId);

    return NextResponse.json({
      success: true,
      data: {
        journey: journeyResponse,
        jobData: jobResponse,
        cvData: cvResponse,
        coverLetterData: coverLetterResponse
      }
    });

  } catch (error: any) {
    console.error('❌ Journey GET API - Error fetching journey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch journey' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint to update a journey by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const resolvedParams = await params;
    const journeyId = resolvedParams.id;
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from session
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Find the journey with user validation
    const journeyQuery: Record<string, any> = { 
      _id: journeyId,
      userId 
    };

    const journey = await ApplicationJourney.findOne(journeyQuery);
    
    if (!journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Get update data from request body
    const body = await request.json();
    
    // Update allowed fields
    if (body.atsScore !== undefined) {
      journey.atsScore = body.atsScore;
    }
    
    if (body.cvId !== undefined) {
      journey.cvId = body.cvId;
      if (body.cvId) {
        journey.currentStep = Math.max(journey.currentStep, 2);
      }
    }
    
    if (body.coverLetterId !== undefined) {
      journey.coverLetterId = body.coverLetterId;
      if (body.coverLetterId) {
        journey.currentStep = Math.max(journey.currentStep, 4);
      }
    }
    
    if (body.status !== undefined) {
      journey.status = body.status;
    }
    
    if (body.currentStep !== undefined) {
      journey.currentStep = body.currentStep;
    }
    
    // Update metadata
    if (body.metadata) {
      journey.metadata = {
        ...journey.metadata,
        ...body.metadata,
        updatedAt: new Date()
      };
    } else {
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();
    }

    await journey.save();

    console.log('✅ Journey PUT API - Journey updated successfully:', journeyId);

    return NextResponse.json({
      success: true,
      message: 'Journey updated successfully',
      data: {
        journey: {
          id: journey._id,
          journeyId: journey.journeyId,
          jobId: journey.jobId,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          status: journey.status,
          currentStep: journey.currentStep,
          atsScore: journey.atsScore,
          updatedAt: journey.metadata.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Journey PUT API - Error updating journey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update journey' },
      { status: 500 }
    );
  }
}

