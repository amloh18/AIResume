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

    // Check if CV is already a journey CV
    if (cv.cvType === 'journey' && cv.journeyId) {
      return NextResponse.json(
        { success: false, error: 'CV is already linked to a journey' },
        { status: 400 }
      );
    }

    let finalJobId = jobId;
    let job: any = null;

    // Create job if not provided
    if (!jobId && jobData) {
      console.log('📝 Creating new job application...');
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
    } else if (jobId) {
      // Verify job exists and belongs to user
      job = await JobApplication.findOne({
        _id: new mongoose.Types.ObjectId(jobId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
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
    }

    // Update CV to journey type
    cv.cvType = 'journey';
    cv.journeyId = journey._id;
    await cv.save();
    console.log('✅ CV converted to journey type');

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

