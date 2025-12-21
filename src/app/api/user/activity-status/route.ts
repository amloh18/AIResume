import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import CV from '@/models/CV';
import ApplicationJourney from '@/models/ApplicationJourney';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // Check for journeys
    const journeyCount = await ApplicationJourney.countDocuments({
      userId: new mongoose.Types.ObjectId(userId)
    });

    // Check for standalone CVs (not master CVs)
    const standaloneCVCount = await CV.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { cvType: 'standalone' },
        { cvType: 'journey' }
      ],
      $and: [
        {
          $or: [
            { 'metadata.isMaster': { $ne: true } },
            { 'metadata.isMaster': { $ne: 'true' } },
            { 'metadata.isMaster': { $exists: false } }
          ]
        },
        {
          $or: [
            { isMaster: { $ne: true } },
            { isMaster: { $exists: false } }
          ]
        }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        hasJourney: journeyCount > 0,
        hasStandaloneCV: standaloneCVCount > 0,
        journeyCount,
        standaloneCVCount
      }
    });
  } catch (error: any) {
    console.error('Error checking user activity status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check activity status' },
      { status: 500 }
    );
  }
}

