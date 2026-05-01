import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { ApplicationJourney } from '@/models';
import {
  createQueuedGenerationState,
  getJourneyGenerationEntitlement
} from '@/lib/utils/journey-generation';

/**
 * Retry endpoint to re-trigger document creation for a journey
 * This is called when the user clicks "Retry" button
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

    // Update journey status to processing
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

    journey.status = 'processing_documents';
    const generationEntitlement = await getJourneyGenerationEntitlement(userId);
    journey.generationState = createQueuedGenerationState(generationEntitlement);
    journey.metadata.updatedAt = new Date();
    await journey.save();

    // Trigger document creation by calling the create endpoint
    // Use internal fetch to the create endpoint
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const createUrl = `${baseUrl}/api/journey-documents/create`;
    
    // Fire and forget - don't wait for the response
    fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the session cookie if available
        ...(request.headers.get('cookie') && { Cookie: request.headers.get('cookie')! })
      },
      body: JSON.stringify({ journeyId })
    }).catch(error => {
      console.error('❌ Journey Documents Retry API - Error triggering creation:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Document creation retry triggered',
      generationState: journey.generationState
    });

  } catch (error: any) {
    console.error('❌ Journey Documents Retry API - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
