import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { ApplicationJourney } from '@/models';
import { extractUserIdentifier } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

/**
 * PUT endpoint to update a journey by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
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

    // Extract user identifier
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    // Find the journey with user validation
    let journeyQuery: Record<string, any> = { _id: journeyId };
    
    if (userIdentifier.type === 'firebase') {
      journeyQuery.firebaseUid = userIdentifier.id;
    } else {
      journeyQuery.userId = userIdentifier.id;
    }

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

