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

// Utility function to cleanup orphaned journey references
async function cleanupOrphanedJourneyReferences(userId: string) {
  try {
    await connectDB();
    
    console.log('🔍 Cleaning up orphaned journey references for user:', userId);
    
    // Get all journeys for the user
    const journeys = await CVJourney.find({ userId }).lean();
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
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');
    const cvId = searchParams.get('cvId');
    const coverLetterId = searchParams.get('coverLetterId');
    const status = searchParams.get('status');
    const cleanup = searchParams.get('cleanup') === 'true';
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Cleanup orphaned references if requested
    if (cleanup) {
      console.log('🔍 Cleanup requested for user:', userId);
      const cleanupResult = await cleanupOrphanedJourneyReferences(userId);
      if (!cleanupResult.success) {
        console.error('❌ Cleanup failed:', cleanupResult.error);
      } else {
        console.log('✅ Cleanup completed:', cleanupResult.cleanedCount, 'journeys updated');
      }
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
          id: (journey._id as any).toString(),
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
    console.log('🔍 CV Journey API - Fetching job with ID:', jobId);
    
    let job;
    try {
      job = await JobApplication.findById(jobId);
    } catch (error) {
      console.error('❌ CV Journey API - Error fetching job:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid job ID format' },
        { status: 400 }
      );
    }
    
    if (!job) {
      console.error('❌ CV Journey API - Job not found with ID:', jobId);
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ CV Journey API - Job found:', { id: job._id, title: job.jobTitle, company: job.company });

    // Check if journey already exists for this job
    let journey = await CVJourney.findOne({ userId, jobId });

    if (journey) {
      console.log('🔍 CV Journey API - Found existing journey:', journey._id);
      
      // Update existing journey
      if (cvId !== undefined) journey.cvId = cvId;
      if (coverLetterId !== undefined) journey.coverLetterId = coverLetterId;
      if (atsScore !== undefined) journey.atsScore = atsScore;
      if (currentStep !== undefined) journey.currentStep = currentStep;
      if (status !== undefined) journey.status = status;
      
      // Update job title and company from job data
      journey.jobTitle = job.jobTitle;
      journey.company = job.company;
      
      // Generate journeyId if it doesn't exist
      if (!journey.journeyId) {
        journey.journeyId = `journey_${jobId}_${userId}`;
        console.log('🔍 CV Journey API - Generated journeyId:', journey.journeyId);
      }
      
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();
      
      try {
        await journey.save();
        console.log('✅ CV Journey API - Existing journey updated successfully');
      } catch (saveError: any) {
        console.error('❌ CV Journey API - Error updating existing journey:', saveError);
        // If there's a duplicate key error, try to find the existing journey again
        if (saveError.code === 11000) {
          console.log('🔍 CV Journey API - Duplicate key error, fetching existing journey...');
          journey = await CVJourney.findOne({ userId, jobId });
          if (journey) {
            console.log('✅ CV Journey API - Found existing journey after duplicate error');
          }
        } else {
          throw saveError;
        }
      }
      
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
      console.log('🔍 CV Journey API - Creating new journey with data:', {
        userId,
        jobId,
        cvId: cvId || null,
        coverLetterId: coverLetterId || null,
        status,
        currentStep: currentStep || 1,
        jobTitle: job.jobTitle,
        company: job.company
      });
      
      const newJourney = new CVJourney({
        journeyId: `journey_${jobId}_${userId}`, // Generate unique journey ID
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

      console.log('🔍 CV Journey API - Attempting to save journey...');
      try {
        await newJourney.save();
        console.log('✅ CV Journey API - Journey saved successfully with ID:', newJourney._id);
      } catch (saveError: any) {
        console.error('❌ CV Journey API - Error saving new journey:', saveError);
        
        // If there's a duplicate key error, check if journey already exists
        if (saveError.code === 11000 || saveError.message.includes('E11000')) {
          console.log('🔍 CV Journey API - Duplicate key error, checking for existing journey...');
          const existingJourney = await CVJourney.findOne({ userId, jobId });
          if (existingJourney) {
            console.log('✅ CV Journey API - Found existing journey, returning it instead');
            journey = existingJourney;
          } else {
            throw saveError;
          }
        } else {
          throw saveError;
        }
      }

      // Use the journey variable (which might be existing or new)
      const finalJourney = journey || newJourney;
      console.log('✅ CV Journey API - Journey processed successfully:', finalJourney._id);
      
      return NextResponse.json({
        success: true,
        message: journey ? 'Journey updated successfully' : 'Journey created successfully',
        data: {
          journey: {
            id: finalJourney._id.toString(),
            _id: finalJourney._id.toString(), // Include both for compatibility
            journeyId: finalJourney.journeyId,
            userId: finalJourney.userId,
            jobId: finalJourney.jobId,
            cvId: finalJourney.cvId,
            coverLetterId: finalJourney.coverLetterId,
            status: finalJourney.status,
            currentStep: finalJourney.currentStep,
            totalSteps: finalJourney.totalSteps,
            atsScore: finalJourney.atsScore,
            jobTitle: finalJourney.jobTitle,
            company: finalJourney.company,
            steps: finalJourney.steps,
            metadata: finalJourney.metadata
          }
        }
      });
    }

  } catch (error: any) {
    console.error('❌ CV Journey API - Create/Update error:', error);
    console.error('❌ CV Journey API - Error stack:', error.stack);
    console.error('❌ CV Journey API - Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors
    });
    
    // Handle specific Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        statusCode: 400
      }, { status: 400 });
    }
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        message: 'Journey already exists for this job',
        statusCode: 409
      }, { status: 409 });
    }
    
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
