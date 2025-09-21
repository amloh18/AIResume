import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CVJourney } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import { extractUserIdentifier, findManyByFirebaseUid, createWithFirebaseUid } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

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

// Utility function to cleanup orphaned journey references
async function cleanupOrphanedJourneyReferences(userIdentifier: { type: string; id: string }) {
  try {
    await connectDB();
    
    console.log('🔍 Cleaning up orphaned journey references for user:', userIdentifier);
    
    // Get all journeys for the user based on identifier type
    let journeys;
    if (userIdentifier.type === 'firebase') {
      journeys = await CVJourney.find({ firebaseUid: userIdentifier.id }).lean();
    } else {
      journeys = await CVJourney.find({ userId: userIdentifier.id }).lean();
    }
    
    console.log('🔍 Found journeys:', journeys.length);
    
    const { CV, CoverLetter } = await import('@/models');
    let cleanedCount = 0;
    
    for (const journey of journeys) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Check if CV exists
      if (journey.cvId) {
        const cv = await CV.findById(journey.cvId);
        if (!cv) {
          console.log('❌ CV not found for journey:', journey._id, 'CV ID:', journey.cvId);
          updates.cvId = null;
          needsUpdate = true;
        }
      }
      
      // Check if Cover Letter exists
      if (journey.coverLetterId) {
        const coverLetter = await CoverLetter.findById(journey.coverLetterId);
        if (!coverLetter) {
          console.log('❌ Cover Letter not found for journey:', journey._id, 'Cover Letter ID:', journey.coverLetterId);
          updates.coverLetterId = null;
          needsUpdate = true;
        }
      }
      
      // Update journey if needed
      if (needsUpdate) {
        await CVJourney.updateOne(
          { _id: journey._id },
          { $set: updates }
        );
        cleanedCount++;
        console.log('✅ Cleaned up journey:', journey._id);
      }
    }
    
    console.log('✅ Cleanup completed. Updated journeys:', cleanedCount);
    return { success: true, cleanedCount };
  } catch (error) {
    console.error('❌ Error cleaning up orphaned references:', error);
    return { success: false, error: error.message };
  }
}

// GET - Get CV journeys for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV Journey API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 CV Journey API - User identifier:', userIdentifier);
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const cvId = searchParams.get('cvId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort') || 'createdAt';
    const cleanup = searchParams.get('cleanup') === 'true';

    // Perform cleanup if requested
    if (cleanup) {
      const cleanupResult = await cleanupOrphanedJourneyReferences(userIdentifier);
      console.log('🧹 Cleanup result:', cleanupResult);
    }

    // Build query conditions based on user identifier type
    let baseQuery: Record<string, any> = {};
    
    if (userIdentifier.type === 'firebase') {
      baseQuery.firebaseUid = userIdentifier.id;
    } else if (userIdentifier.type === 'objectid') {
      baseQuery.userId = userIdentifier.id;
    }

    console.log('🔍 CV Journey API - Base query:', baseQuery);

    // Add additional query conditions
    if (jobId) {
      baseQuery.jobId = jobId;
    }
    
    if (cvId) {
      baseQuery.cvId = cvId;
    }
    
    if (status) {
      baseQuery.status = status;
    }

    // Create the actual query
    let query = CVJourney.find(baseQuery);

    // Apply sorting
    const sortOrder = sort === 'createdAt' ? -1 : 1;
    query = query.sort({ [sort]: sortOrder });

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    // Execute query
    console.log('🔍 CV Journey API - Executing database query');
    const journeys = await query.lean();
    console.log('🔍 CV Journey API - Query executed, found journeys:', journeys.length);

    // Transform data for response
    const transformedJourneys = journeys.map(journey => ({
      id: journey._id,
      journeyId: journey.journeyId,
      userId: journey.userId,
      firebaseUid: journey.firebaseUid,
      jobId: journey.jobId,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      status: journey.status,
      currentStep: journey.currentStep,
      totalSteps: journey.totalSteps,
      atsScore: journey.atsScore,
      jobTitle: journey.jobTitle,
      company: journey.company,
      journeyType: journey.journeyType,
      steps: journey.steps,
      metadata: journey.metadata,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt
    }));

    // Calculate total count for pagination
    const totalCount = await CVJourney.countDocuments(baseQuery);

    return NextResponse.json({
      success: true,
      message: 'CV journeys retrieved successfully',
      data: {
        journeys: transformedJourneys,
        total: totalCount
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

// POST - Create a new CV journey
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV Journey POST API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 CV Journey POST API - User identifier:', userIdentifier);

    const body = await request.json();
    const {
      jobId,
      cvId,
      coverLetterId,
      jobTitle,
      company,
      journeyType = 'standard',
      steps = []
    } = body;

    // Validate required fields
    if (!jobId || !jobTitle || !company) {
      return NextResponse.json(
        { success: false, error: 'Job ID, job title, and company are required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    let existingJourneyQuery: Record<string, any> = { jobId };
    
    if (userIdentifier.type === 'firebase') {
      existingJourneyQuery.firebaseUid = userIdentifier.id;
    } else {
      existingJourneyQuery.userId = userIdentifier.id;
    }

    const existingJourney = await CVJourney.findOne(existingJourneyQuery);
    
    if (existingJourney) {
      return NextResponse.json(
        { success: false, error: 'A journey already exists for this job' },
        { status: 409 }
      );
    }

    // Prepare journey data for creation
    const journeyData = {
      journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userIdentifier.type === 'objectid' ? userIdentifier.id : '',
      jobId,
      cvId: cvId || null,
      coverLetterId: coverLetterId || null,
      status: 'in-progress',
      currentStep: 1,
      totalSteps: steps.length || 5,
      jobTitle,
      company,
      journeyType,
      steps: steps.length > 0 ? steps : [
        {
          stepId: 1,
          name: 'Job Analysis',
          status: 'active',
          data: {}
        },
        {
          stepId: 2,
          name: 'CV Tailoring',
          status: 'pending',
          data: {}
        },
        {
          stepId: 3,
          name: 'Cover Letter',
          status: 'pending',
          data: {}
        },
        {
          stepId: 4,
          name: 'ATS Check',
          status: 'pending',
          data: {}
        },
        {
          stepId: 5,
          name: 'Application Ready',
          status: 'pending',
          data: {}
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        tags: [],
        notes: ''
      }
    };

    console.log('🚀 CV Journey POST API - Journey data prepared:', {
      jobId,
      jobTitle,
      company,
      userIdentifier
    });

    // Create new journey using the helper function
    let userId: string;
    let firebaseUid: string;
    
    if (userIdentifier.type === 'firebase') {
      userId = ''; // Empty string for Firebase users
      firebaseUid = userIdentifier.id;
    } else {
      userId = userIdentifier.id;
      firebaseUid = ''; // Empty string for non-Firebase users
    }

    const newJourney = await createWithFirebaseUid(
      CVJourney,
      journeyData,
      userId,
      firebaseUid
    );

    console.log('✅ CV Journey POST API - Journey saved successfully:', {
      id: newJourney._id,
      journeyId: newJourney.journeyId,
      userId: newJourney.userId,
      firebaseUid: newJourney.firebaseUid,
      jobTitle: newJourney.jobTitle
    });

    return NextResponse.json({
      success: true,
      message: 'CV journey created successfully',
      data: {
        journey: {
          id: newJourney._id,
          journeyId: newJourney.journeyId,
          jobId: newJourney.jobId,
          jobTitle: newJourney.jobTitle,
          company: newJourney.company,
          status: newJourney.status,
          currentStep: newJourney.currentStep,
          totalSteps: newJourney.totalSteps,
          createdAt: newJourney.createdAt
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ CV Journey POST API - Error creating journey:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A journey with this ID already exists' },
        { status: 409 }
      );
    }
    
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
