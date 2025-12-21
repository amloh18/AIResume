import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import CV from '@/models/CV';
import { JobApplication } from '@/models';
import ApplicationJourney from '@/models/ApplicationJourney';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

/**
 * POST /api/cvs/[id]/convert-to-journey
 * Converts a Standalone CV to a Journey CV
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 Starting CV to Journey conversion...');

    await getConnection();
    const { id: cvId } = await params;

    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log('✅ User authenticated:', authResult.userEmail);

    // Parse request body
    const body = await request.json();
    const { jobData, jobId } = body;

    // Validate CV exists and belongs to user
    const cv = await CV.findOne({
      _id: new mongoose.Types.ObjectId(cvId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // EDGE CASE 2: Check if CV is already linked to a journey
    if (cv.cvType === 'journey' && cv.journeyId) {
      // Check if it's linked to the same journey (idempotent operation)
      if (jobId && cv.journeyId.toString() === jobId) {
        const existingJourney = await ApplicationJourney.findOne({
          jobId: finalJobId,
          userId: new mongoose.Types.ObjectId(userId)
        });
        
        if (existingJourney && existingJourney._id.toString() === cv.journeyId.toString()) {
          return NextResponse.json({
            success: true,
            message: 'CV is already linked to this journey',
            data: {
              cv: {
                id: cv._id.toString(),
                cvType: cv.cvType,
                journeyId: cv.journeyId?.toString()
              },
              journey: {
                id: existingJourney._id.toString(),
                jobId: existingJourney.jobId.toString(),
                cvId: existingJourney.cvId,
                status: existingJourney.status
              }
            }
          });
        }
      }
      
      return NextResponse.json(
        { success: false, error: 'CV is already linked to another journey. Please use a different CV or unlink it first.' },
        { status: 400 }
      );
    }

    let finalJobId = jobId;
    let job: any = null;

    // Create job if not provided
    if (!jobId && jobData) {
      console.log('📝 Creating new job application...');
      try {
        job = await JobApplication.create({
          userId: new mongoose.Types.ObjectId(userId),
          jobTitle: jobData.title || 'Unknown Role',
          company: jobData.company || 'Unknown Company',
          jobDescription: jobData.description || jobData.jobDescription,
          status: 'created',
          source: 'resume-enhancer',
          priority: 'medium',
          tags: [],
          contacts: [],
          interviews: [],
          followUps: [],
          attachments: [],
          isArchived: false
        });
        finalJobId = job._id.toString();
        console.log('✅ Job created:', finalJobId);
      } catch (jobError) {
        // EDGE CASE 3: Job creation fails - don't proceed with CV conversion
        console.error('❌ Convert-to-Journey API - Job creation failed:', jobError);
        return NextResponse.json(
          { success: false, error: 'Job not found. Cannot convert CV to journey.' },
          { status: 400 }
        );
      }
    } else if (jobId) {
      // Verify job exists and belongs to user
      job = await JobApplication.findOne({
        _id: new mongoose.Types.ObjectId(jobId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!job) {
        // EDGE CASE 3: Job not found
        return NextResponse.json(
          { success: false, error: 'Job not found. Cannot convert CV to journey.' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Job data or job ID required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    const existingJourney = await ApplicationJourney.findOne({
      jobId: finalJobId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    let journey: any;

    if (existingJourney) {
      // EDGE CASE 8: Check if journey already has auto-created CV
      if (existingJourney.cvId && existingJourney.cvId.toString() !== cvId) {
        console.log('⚠️ Convert-to-Journey API - Journey already has CV, deleting auto-created CV:', existingJourney.cvId);
        try {
          const autoCreatedCV = await CV.findById(existingJourney.cvId);
          if (autoCreatedCV) {
            await CV.deleteOne({ _id: autoCreatedCV._id });
            console.log('✅ Convert-to-Journey API - Auto-created CV deleted:', existingJourney.cvId);
          }
        } catch (deleteError) {
          console.error('⚠️ Convert-to-Journey API - Failed to delete auto-created CV (non-critical):', deleteError);
          // Continue with linking even if deletion fails
        }
      }

      // Update existing journey with CV
      journey = existingJourney;
      journey.cvId = cvId;
      journey.status = 'in-progress';
      journey.lastWorkedOn = new Date();
      await journey.save();
      console.log('✅ Updated existing journey:', journey._id.toString());
    } else {
      // Create new journey
      console.log('📝 Creating new application journey...');
      journey = await ApplicationJourney.create({
        journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: new mongoose.Types.ObjectId(userId),
        jobId: finalJobId,
        cvId: cvId,
        status: 'in-progress',
        currentStep: 2, // CV tailoring step
        totalSteps: 5,
        jobTitle: job.jobTitle,
        company: job.company,
        journeyType: 'standard',
        steps: [
          {
            stepId: 1,
            name: 'Job Saved',
            status: 'completed',
            completedAt: new Date(),
            data: {}
          },
          {
            stepId: 2,
            name: 'CV Tailoring',
            status: 'active',
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
        lastWorkedOn: new Date(),
        atsScoreHistory: [],
        downloadHistory: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date()
        }
      });
      console.log('✅ Journey created:', journey._id.toString());
      
      // EDGE CASE 6: If journey creation fails, rollback would happen in catch block
      // But since we're using create(), if it fails, it will throw and be caught
    }

    // EDGE CASE 7: Retry mechanism for CV update with exponential backoff
    let cvUpdateSuccess = false;
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Update CV to journey type
        cv.cvType = 'journey';
        cv.journeyId = journey._id;
        await cv.save();
        
        cvUpdateSuccess = true;
        console.log('✅ CV converted to journey type');
        break;
      } catch (updateError) {
        console.error(`⚠️ Convert-to-Journey API - CV update attempt ${attempt + 1} failed:`, updateError);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        } else {
          console.error('❌ Convert-to-Journey API - CV update failed after all retries');
          throw new Error('Failed to update CV after multiple attempts. Please try again.');
        }
      }
    }

    if (!cvUpdateSuccess) {
      throw new Error('Failed to update CV');
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'CV successfully converted to journey',
      data: {
        cv: {
          id: cv._id.toString(),
          cvType: cv.cvType,
          journeyId: cv.journeyId?.toString()
        },
        journey: {
          id: journey._id.toString(),
          jobId: journey.jobId.toString(),
          cvId: journey.cvId,
          status: journey.status
        },
        job: {
          id: job._id.toString(),
          title: job.jobTitle,
          company: job.company
        }
      }
    });

  } catch (error) {
    console.error('❌ Convert to journey error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert CV to journey'
      },
      { status: 500 }
    );
  }
}

