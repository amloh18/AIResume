import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { ApplicationJourney } from '@/models';
import mongoose from 'mongoose';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';

/**
 * Background job endpoint to create CV and cover letter for a journey
 * This is called asynchronously after journey creation
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
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

    const body = await request.json();
    const { journeyId } = body;

    if (!journeyId) {
      return NextResponse.json(
        { success: false, error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    // Find the journey - simplified for Next Auth only (no Firebase)
    let journey: any = null;
    
    try {
      // First, try with ObjectId
      journey = await ApplicationJourney.findById(journeyId);
      
      // Verify ownership - check userId only
      if (journey) {
        const journeyUserId = journey.userId?.toString();
        if (journeyUserId !== userId) {
          journey = null; // Ownership doesn't match
        }
      }
    } catch (error) {
      console.error('❌ Journey Documents API - Error finding journey by ID:', error);
    }
    
    // If not found, try query approach with userId
    if (!journey) {
      journey = await ApplicationJourney.findOne({ 
        _id: journeyId,
        userId
      });
    }
    
    if (!journey) {
      console.error('❌ Journey Documents API - Journey not found:', { journeyId, userId });
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Check if documents already exist - refresh journey from DB to get latest state
    // This prevents race conditions where multiple requests check simultaneously
    const freshJourney = await ApplicationJourney.findById(journey._id);
    if (freshJourney && freshJourney.cvId && freshJourney.coverLetterId) {
      // Documents already created, update status to ready
      freshJourney.status = 'ready';
      freshJourney.metadata.updatedAt = new Date();
      await freshJourney.save();
      
      return NextResponse.json({
        success: true,
        message: 'Documents already exist',
        data: {
          cvId: freshJourney.cvId,
          coverLetterId: freshJourney.coverLetterId
        }
      });
    }
    
    // Update journey reference to use fresh data
    if (freshJourney) {
      journey = freshJourney;
    }

    // Get job details
    const { JobApplication } = await import('@/models');
    const job = await JobApplication.findById(journey.jobId);
    
    if (!job) {
      journey.status = 'creation_failed';
      journey.metadata.updatedAt = new Date();
      await journey.save();
      
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get MongoDB userId from journey
    const mongoUserId = journey.userId?.toString() || userId;

    // Use the service function to create documents
    const result = await createJourneyDocuments(journeyId, mongoUserId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Documents created successfully',
        data: {
          cvId: result.cvId,
          coverLetterId: result.coverLetterId
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to create documents'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Journey Documents API - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

