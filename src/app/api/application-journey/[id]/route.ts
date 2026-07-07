import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { ApplicationJourney, CV, JobApplication, CoverLetter } from '@/models';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// Helper function to get userId from either session or extension token
async function getUserIdFromRequest(request: NextRequest): Promise<{ userId: string; source: 'session' | 'extension' } | null> {
  // Check if this is an extension request (with JWT token)
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extension request with JWT token
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
      
      if (decoded.type !== 'extension') {
        console.log('❌ Invalid token type');
        return null;
      }
      
      const userId = decoded.userId || decoded.id || '';
      if (!userId) {
        console.log('❌ No userId in extension token');
        return null;
      }
      
      console.log('✅ Extension token verified for user:', userId);
      return { userId, source: 'extension' };
    } catch (error) {
      console.log('❌ Invalid extension token:', error);
      return null;
    }
  } else {
    // Web interface request with session
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      console.log('❌ No valid authentication found for web request');
      return null;
    }
    
    console.log('✅ Web session verified for user:', authResult.userId);
    return { userId: authResult.userId, source: 'session' };
  }
}

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
    
    // Get userId from either session or extension token
    const authInfo = await getUserIdFromRequest(request);
    
    if (!authInfo) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authInfo.userId;
    console.log('🔍 Journey GET API - Using authenticated user:', userId, `(${authInfo.source})`);

    // Find the journey with user validation
    // Support both MongoDB _id and custom journeyId field
    const isObjectId = mongoose.Types.ObjectId.isValid(journeyId) && journeyId.length === 24;
    const journeyQuery: any = {
      userId: new mongoose.Types.ObjectId(userId)
    };
    
    if (isObjectId) {
      journeyQuery._id = journeyId;
    } else {
      journeyQuery.journeyId = journeyId;
    }
    
    const journey = await ApplicationJourney.findOne(journeyQuery).lean<any>();
    
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
          }).lean<any>()
        : Promise.resolve(null),
      
      // Load CV data
      journey.cvId
        ? CV.findOne({
            _id: journey.cvId,
            userId: new mongoose.Types.ObjectId(userId)
          }).lean<any>()
        : Promise.resolve(null),
      
      // Load cover letter data
      journey.coverLetterId
        ? CoverLetter.findOne({
            _id: journey.coverLetterId,
            userId: new mongoose.Types.ObjectId(userId)
          }).lean<any>()
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
      generationState: journey.generationState,
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
    
    // Get userId from either session or extension token
    const authInfo = await getUserIdFromRequest(request);
    
    if (!authInfo) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authInfo.userId;
    console.log('🔍 Journey PUT API - Using authenticated user:', userId, `(${authInfo.source})`);

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
    
    if (body.notes !== undefined) {
      journey.notes = body.notes;
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
          generationState: journey.generationState,
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
