import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { ApplicationJourney } from '@/models';
import { extractUserIdentifier } from '@/lib/firebase-uid-utils';
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

    // Extract user identifier
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

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
      
      // Verify ownership - check userId only (no Firebase)
      if (journey) {
        const journeyUserId = journey.userId?.toString();
        const requestUserId = userIdentifier.type === 'objectid' ? userIdentifier.id : null;
        
        // If we don't have a request userId, try to get it from User collection
        if (!requestUserId && userIdentifier.id) {
          const { User } = await import('@/models');
          const user = await User.findOne({ 
            $or: [
              { _id: userIdentifier.id },
              { email: session?.user?.email }
            ]
          }).lean();
          if (user && journeyUserId !== (user as any)._id.toString()) {
            journey = null; // Ownership doesn't match
          }
        } else if (requestUserId && journeyUserId !== requestUserId) {
          journey = null; // Ownership doesn't match
        }
      }
    } catch (error) {
      console.error('❌ Journey Documents API - Error finding journey by ID:', error);
    }
    
    // If not found, try query approach with userId only
    if (!journey) {
      const { User } = await import('@/models');
      let mongoUserId = userIdentifier.id;
      
      // If userIdentifier is not a valid ObjectId, find user by email
      if (userIdentifier.type !== 'objectid' || !mongoose.Types.ObjectId.isValid(userIdentifier.id)) {
        if (session?.user?.email) {
          const user = await User.findOne({ email: session.user.email }).lean();
          if (user) {
            mongoUserId = (user as any)._id.toString();
          }
        }
      }
      
      journey = await ApplicationJourney.findOne({ 
        _id: journeyId,
        userId: mongoUserId
      });
    }
    
    if (!journey) {
      console.error('❌ Journey Documents API - Journey not found:', { journeyId, userIdentifier });
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

    // Get MongoDB userId from journey or resolve from userIdentifier (Next Auth only)
    let userId: string;
    if (journey.userId) {
      userId = journey.userId.toString();
    } else {
      // Resolve userId from User collection by email (Next Auth)
      const { User } = await import('@/models');
      let user = null;
      
      if (userIdentifier.type === 'objectid' && mongoose.Types.ObjectId.isValid(userIdentifier.id)) {
        user = await User.findById(userIdentifier.id).lean();
      }
      
      if (!user && session?.user?.email) {
        user = await User.findOne({ email: session.user.email }).lean();
      }
      
      if (!user) {
        console.error('❌ Journey Documents API - User not found:', { userIdentifier, email: session?.user?.email });
        journey.status = 'creation_failed';
        journey.metadata.updatedAt = new Date();
        await journey.save();
        
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      userId = (user as any)._id.toString();
    }

    // Use the service function to create documents
    const result = await createJourneyDocuments(journeyId, userId);

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

