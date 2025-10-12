import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const journeyId = resolvedParams.id;

    // Get journey data
    const journey = await ApplicationJourney.findOne({
      _id: journeyId,
      userId: session.user.id
    });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Get job data for ATS calculation
    const job = await JobApplication.findOne({
      _id: journey.jobId,
      userId: session.user.id
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get CV data
    const cv = await CV.findOne({
      _id: journey.cvId,
      userId: session.user.id
    });

    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    // Call existing ATS calculation service
    const atsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/ats/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvId: journey.cvId,
        jobId: journey.jobId,
        userId: session.user.id
      })
    });

    if (!atsResponse.ok) {
      return NextResponse.json({ error: 'Failed to calculate ATS score' }, { status: 500 });
    }

    const atsData = await atsResponse.json();
    const newAtsScore = atsData.score || 0;

    // Create ATS score history entry
    const atsHistoryEntry = {
      score: newAtsScore,
      calculatedAt: new Date(),
      cvVersion: cv.version?.toString() || '1'
    };

    // Update journey with new ATS score and history
    const updatedJourney = await ApplicationJourney.findByIdAndUpdate(
      journeyId,
      {
        $set: {
          atsScore: newAtsScore,
          lastWorkedOn: new Date()
        },
        $push: {
          atsScoreHistory: atsHistoryEntry
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      atsScore: newAtsScore,
      atsScoreHistory: updatedJourney.atsScoreHistory,
      lastCalculated: atsHistoryEntry.calculatedAt
    });

  } catch (error) {
    console.error('Error refreshing ATS score:', error);
    return NextResponse.json(
      { error: 'Failed to refresh ATS score' },
      { status: 500 }
    );
  }
}
