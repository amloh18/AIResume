import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import JobApplication from '@/models/JobApplication';

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

    // Check if journey is completed
    if (journey.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Journey is not completed',
        journey: {
          id: journey._id,
          status: journey.status
        }
      }, { status: 400 });
    }

    // Check if completed within last 5 seconds
    const now = new Date();
    const completedAt = journey.completedAt;
    
    if (!completedAt) {
      return NextResponse.json({ 
        error: 'Journey completion date not found' 
      }, { status: 400 });
    }

    const timeDiff = now.getTime() - completedAt.getTime();
    const fiveSeconds = 5 * 1000;

    if (timeDiff > fiveSeconds) {
      return NextResponse.json({ 
        error: 'Undo window has expired (5 seconds)',
        timeRemaining: 0
      }, { status: 400 });
    }

    // Get the job to revert its status
    const job = await JobApplication.findOne({
      _id: journey.jobId,
      userId: session.user.id
    });

    // Revert journey to in-progress
    const revertedJourney = await ApplicationJourney.findByIdAndUpdate(
      journeyId,
      {
        status: 'in-progress',
        $unset: {
          completedAt: 1,
          journeyDuration: 1,
          applicationDate: 1,
          'steps.4.completedAt': 1
        },
        'steps.4.status': 'active'
      },
      { new: true }
    );

    // Revert job status (store previous status in metadata if available)
    let revertedJob = null;
    if (job) {
      // Try to get previous status from job metadata or default to 'interested'
      const previousStatus = (job as any).metadata?.previousStatus || 'interested';
      
      revertedJob = await JobApplication.findByIdAndUpdate(
        job._id,
        {
          status: previousStatus,
          $unset: {
            applicationDate: 1
          },
          updatedAt: now
        },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Journey completion undone successfully',
      journey: {
        id: revertedJourney._id,
        status: revertedJourney.status,
        completedAt: revertedJourney.completedAt
      },
      job: revertedJob ? {
        id: revertedJob._id,
        status: revertedJob.status,
        applicationDate: revertedJob.applicationDate
      } : null,
      timeRemaining: Math.max(0, fiveSeconds - timeDiff)
    });

  } catch (error) {
    console.error('Error undoing journey completion:', error);
    return NextResponse.json(
      { error: 'Failed to undo journey completion' },
      { status: 500 }
    );
  }
}
