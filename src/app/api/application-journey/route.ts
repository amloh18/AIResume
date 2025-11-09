import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { ApplicationJourney } from '@/models';
import type { IApplicationJourney } from '@/models/ApplicationJourney';
import { createErrorResponse } from '@/lib/db-utils';
import mongoose from 'mongoose';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';

// Type for journey object returned from Mongoose create operations
interface LeanJourney {
  _id: mongoose.Types.ObjectId;
  journeyId?: string;
  userId: string;
  jobId: string;
  cvId?: string;
  coverLetterId?: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  jobTitle: string;
  company: string;
  createdAt: Date;
  updatedAt?: Date;
  [key: string]: any; // Allow for other properties
}

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
    const result = await ApplicationJourney.updateMany(
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
    await getConnection();
    
    console.log('🔍 Cleaning up orphaned journey references for user:', userId);
    
    // Get all journeys for the user
    const journeys = await ApplicationJourney.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    
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
        await ApplicationJourney.updateOne(
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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// GET - Get CV journeys for a user
export async function GET(request: NextRequest) {
  try {
    await getConnection();
    
    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      console.log('❌ CV Journey API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    console.log('🔍 CV Journey API - Using authenticated user:', authResult.userEmail);
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const cvId = searchParams.get('cvId');
    const cvIds = searchParams.get('cvIds'); // Support batch queries with comma-separated CV IDs
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort') || 'createdAt';
    const cleanup = searchParams.get('cleanup') === 'true';

    // Perform cleanup if requested
    if (cleanup) {
      const cleanupResult = await cleanupOrphanedJourneyReferences(userId);
      console.log('🧹 Cleanup result:', cleanupResult);
    }

    // Build query conditions
    const baseQuery: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    console.log('🔍 CV Journey API - Base query:', baseQuery);

    // Add additional query conditions
    if (jobId) {
      baseQuery.jobId = jobId;
    }
    
    // Support batch CV ID queries (performance optimization)
    if (cvIds) {
      const cvIdArray = cvIds.split(',').filter(id => id.trim());
      if (cvIdArray.length > 0) {
        baseQuery.cvId = { $in: cvIdArray };
        console.log('🔍 CV Journey API - Batch query for CV IDs:', cvIdArray.length);
      }
    } else if (cvId) {
      baseQuery.cvId = cvId;
    }
    
    if (status) {
      baseQuery.status = status;
    }

    // Create the actual query
    let query = ApplicationJourney.find(baseQuery);

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

    // Check for journeys missing CV or cover letter and trigger creation automatically
    const journeysNeedingDocuments = journeys.filter(journey => {
      const journeyId = journey._id.toString();
      const hasNoCV = !journey.cvId;
      const hasNoCoverLetter = !journey.coverLetterId;
      const isProcessingOrInProgress = journey.status === 'processing_documents' || journey.status === 'in-progress';
      
      return (hasNoCV || hasNoCoverLetter) && isProcessingOrInProgress;
    });

    // Trigger document creation for journeys missing documents (run in background)
    if (journeysNeedingDocuments.length > 0) {
      console.log(`🚀 Application Journey API - Found ${journeysNeedingDocuments.length} journeys needing documents, triggering creation...`);
      
      journeysNeedingDocuments.forEach(journey => {
        const journeyId = journey._id.toString();
        
        // Update status to processing_documents if not already
        if (journey.status !== 'processing_documents') {
          ApplicationJourney.findByIdAndUpdate(journeyId, {
            status: 'processing_documents',
            'metadata.updatedAt': new Date()
          }).catch(err => {
            console.error(`❌ Application Journey API - Failed to update journey status for ${journeyId}:`, err);
          });
        }
        
        // Trigger document creation in background
        setImmediate(async () => {
          try {
            console.log(`🚀 Application Journey API - Auto-triggering document creation for journey: ${journeyId}`);
            const result = await createJourneyDocuments(journeyId, userId);
            
            if (result.success) {
              console.log(`✅ Application Journey API - Auto-created documents for journey ${journeyId}:`, {
                cvId: result.cvId,
                coverLetterId: result.coverLetterId
              });
            } else {
              console.error(`❌ Application Journey API - Auto-document creation failed for journey ${journeyId}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Application Journey API - Error in auto-document creation for journey ${journeyId}:`, error);
          }
        });
      });
    }

    // Calculate total count for pagination
    const totalCount = await ApplicationJourney.countDocuments(baseQuery);

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
    await getConnection();
    
    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      console.log('❌ CV Journey POST API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    console.log('🔍 CV Journey POST API - Using authenticated user:', authResult.userEmail);

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

    // Validate required fields for journey identification
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    const existingJourneyQuery: Record<string, any> = { 
      jobId,
      userId: new mongoose.Types.ObjectId(userId)
    };

    const existingJourney = await ApplicationJourney.findOne(existingJourneyQuery);
    
    if (existingJourney) {
      // Update existing journey with new CV/coverLetter data
      console.log('🔄 CV Journey POST API - Updating existing journey:', existingJourney._id);
      
      let updated = false;
      
      if (cvId && existingJourney.cvId !== cvId) {
        existingJourney.cvId = cvId;
        existingJourney.currentStep = Math.max(existingJourney.currentStep, 2);
        updated = true;
      }
      
      if (coverLetterId && existingJourney.coverLetterId !== coverLetterId) {
        existingJourney.coverLetterId = coverLetterId;
        existingJourney.currentStep = Math.max(existingJourney.currentStep, 3);
        updated = true;
      }
      
      if (steps && steps.length > 0) {
        existingJourney.steps = steps;
        updated = true;
      }
      
      if (updated) {
        existingJourney.metadata.updatedAt = new Date();
        existingJourney.metadata.lastAccessedAt = new Date();
        await existingJourney.save();
        
        console.log('✅ CV Journey POST API - Existing journey updated successfully');
        
        return NextResponse.json({
          success: true,
          message: 'Journey updated successfully',
          data: {
            journey: {
              id: existingJourney._id,
              journeyId: existingJourney.journeyId,
              jobId: existingJourney.jobId,
              jobTitle: existingJourney.jobTitle,
              company: existingJourney.company,
              status: existingJourney.status,
              currentStep: existingJourney.currentStep,
              totalSteps: existingJourney.totalSteps,
              cvId: existingJourney.cvId,
              coverLetterId: existingJourney.coverLetterId,
              createdAt: existingJourney.createdAt,
              updatedAt: existingJourney.metadata.updatedAt
            }
          }
        }, { status: 200 });
      } else {
        // No updates needed, return existing journey
        return NextResponse.json({
          success: true,
          message: 'Journey already exists with current data',
          data: {
            journey: {
              id: existingJourney._id,
              journeyId: existingJourney.journeyId,
              jobId: existingJourney.jobId,
              jobTitle: existingJourney.jobTitle,
              company: existingJourney.company,
              status: existingJourney.status,
              currentStep: existingJourney.currentStep,
              totalSteps: existingJourney.totalSteps,
              cvId: existingJourney.cvId,
              coverLetterId: existingJourney.coverLetterId,
              createdAt: existingJourney.createdAt,
              updatedAt: existingJourney.metadata.updatedAt
            }
          }
        }, { status: 200 });
      }
    }

    // Validate required fields for creating new journey
    if (!jobTitle || !company) {
      return NextResponse.json(
        { success: false, error: 'Job title and company are required for creating new journey' },
        { status: 400 }
      );
    }

    // Determine if documents need to be created
    const needsDocuments = !cvId && !coverLetterId;
    const initialStatus = needsDocuments ? 'processing_documents' : 'in-progress';

    // Prepare journey data for creation
    const journeyData = {
      journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: new mongoose.Types.ObjectId(userId),
      jobId,
      cvId: cvId || null,
      coverLetterId: coverLetterId || null,
      status: initialStatus,
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
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('🚀 CV Journey POST API - Journey data prepared:', {
      jobId,
      jobTitle,
      company,
      userId
    });

    // Create new journey directly with MongoDB userId
    const newJourney = await ApplicationJourney.create(journeyData) as LeanJourney;

    console.log('✅ CV Journey POST API - Journey saved successfully:', {
      id: newJourney._id,
      journeyId: newJourney.journeyId,
      userId: newJourney.userId,
      jobTitle: newJourney.jobTitle,
      status: newJourney.status
    });

    // If documents need to be created, trigger async creation with better error handling
    if (needsDocuments && newJourney.status === 'processing_documents') {
      // Call document creation service directly (no HTTP request needed)
      // Run in background to avoid blocking the response
      setImmediate(async () => {
        try {
          console.log('🚀 CV Journey POST API - Starting document creation for journey:', newJourney._id);
          const result = await createJourneyDocuments(newJourney._id.toString(), userId);
          
          if (result.success) {
            console.log('✅ CV Journey POST API - Document creation completed successfully:', {
              journeyId: newJourney._id,
              cvId: result.cvId,
              coverLetterId: result.coverLetterId
            });
          } else {
            console.error('❌ CV Journey POST API - Document creation failed:', result.error);
          }
        } catch (error) {
          console.error('❌ CV Journey POST API - Error in document creation:', error);
          // Journey status will be updated by the service on error
        }
      });
      
      console.log('🚀 CV Journey POST API - Triggered async document creation for journey:', newJourney._id);
    }

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
    
    // Return a proper error message
    const errorMessage = error.message || 'Failed to create CV journey';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 CV Journey DELETE API - Starting deletion request');
    console.log('🔍 CV Journey DELETE API - Request URL:', request.url);
    console.log('🔍 CV Journey DELETE API - Request method:', request.method);
    await getConnection();
    
    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      console.log('❌ CV Journey DELETE API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;

    const body = await request.json();
    console.log('🔍 CV Journey DELETE API - Request body:', body);
    const { journeyId } = body;

    if (!journeyId) {
      console.log('❌ CV Journey DELETE API - No journeyId provided');
      return NextResponse.json(
        { success: false, error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 CV Journey DELETE API - Deleting journey:', journeyId);

    // Find the journey first to get linked documents
    const journeyQuery: Record<string, any> = { 
      _id: journeyId,
      userId: new mongoose.Types.ObjectId(userId)
    };

    const journey = await ApplicationJourney.findOne(journeyQuery);
    
    if (!journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    console.log('🔍 CV Journey DELETE API - Found journey:', {
      id: journey._id,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      jobId: journey.jobId
    });

    // Import models
    const { CV, CoverLetter } = await import('@/models');

    // Step 1: Delete cover letter if it exists
    if (journey.coverLetterId) {
      try {
        console.log('🔍 CV Journey DELETE API - Deleting cover letter:', journey.coverLetterId);
        const coverLetterResult = await CoverLetter.findByIdAndDelete(journey.coverLetterId);
        if (coverLetterResult) {
          console.log('✅ CV Journey DELETE API - Cover letter deleted successfully');
        } else {
          console.log('⚠️ CV Journey DELETE API - Cover letter not found (already deleted)');
        }
      } catch (error) {
        console.error('❌ CV Journey DELETE API - Error deleting cover letter:', error);
        // Continue with deletion even if cover letter deletion fails
      }
    }

    // Step 2: Delete CV if it exists (but not if it's a Master CV)
    if (journey.cvId) {
      try {
        console.log('🔍 CV Journey DELETE API - Checking CV for deletion:', journey.cvId);
        const cv = await CV.findById(journey.cvId);
        
        if (cv) {
          // Hard stop for Master CV protection
          if (cv.isMaster || cv.metadata?.isMaster) {
            console.error(`❌ CRITICAL: Attempt to delete Master CV ${cv._id} from journey ${journeyId}. Aborting CV deletion.`);
            // Do NOT proceed with CV deletion - skip this step
            console.log('⚠️ CV Journey DELETE API - Skipping Master CV deletion (protected)');
          } else {
            console.log('🔍 CV Journey DELETE API - Deleting CV:', journey.cvId);
            const cvResult = await CV.findByIdAndDelete(journey.cvId);
            if (cvResult) {
              console.log('✅ CV Journey DELETE API - CV deleted successfully');
            }
          }
        } else {
          console.log('⚠️ CV Journey DELETE API - CV not found (already deleted)');
        }
      } catch (error) {
        console.error('❌ CV Journey DELETE API - Error deleting CV:', error);
        // Continue with deletion even if CV deletion fails
      }
    }

    // Step 3: Delete the journey itself (but NOT the job)
    console.log('🔍 CV Journey DELETE API - Deleting journey record');
    const journeyResult = await ApplicationJourney.findByIdAndDelete(journey._id);
    
    if (!journeyResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete journey' },
        { status: 500 }
      );
    }

    console.log('✅ CV Journey DELETE API - Journey deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'CV journey and associated documents deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ CV Journey DELETE API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
