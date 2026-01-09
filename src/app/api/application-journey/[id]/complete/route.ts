import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import JobApplication from '@/models/JobApplication';

export async function PATCH(
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

    // Check if journey is already completed
    if (journey.status === 'completed') {
      return NextResponse.json({
        error: 'Journey is already completed',
        journey: {
          id: journey._id,
          status: journey.status,
          completedAt: journey.completedAt
        }
      }, { status: 400 });
    }

    // Calculate journey duration
    const startTime = journey.metadata.createdAt;
    const endTime = new Date();
    const journeyDuration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes

    // Update journey to completed
    const completedJourney = await ApplicationJourney.findByIdAndUpdate(
      journeyId,
      {
        status: 'completed',
        completedAt: endTime,
        journeyDuration: journeyDuration,
        applicationDate: endTime,
        currentStep: 5,
        'steps.4.status': 'completed',
        'steps.4.completedAt': endTime
      },
      { new: true }
    );

    // Update associated CV status to 'published'
    if (journey.cvId) {
      try {
        // Dynamic import to avoid circular dependency issues if any, though explicit import is better
        const { default: CV } = await import('@/models/CV');
        await CV.findByIdAndUpdate(journey.cvId, {
          status: 'published',
          updatedAt: endTime
        });
        console.log(`Marked CV ${journey.cvId} as published`);
      } catch (error) {
        console.error(`Failed to mark CV ${journey.cvId} as published:`, error);
        // Continue, don't fail the whole request
      }
    }

    // Update associated job status to 'applied'
    const updatedJob = await JobApplication.findOneAndUpdate(
      {
        _id: journey.jobId,
        userId: session.user.id
      },
      {
        status: 'applied',
        applicationDate: endTime,
        updatedAt: endTime
      },
      { new: true }
    );

    if (!updatedJob) {
      console.warn(`Job ${journey.jobId} not found for journey ${journeyId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Journey completed successfully',
      journey: {
        id: completedJourney._id,
        status: completedJourney.status,
        completedAt: completedJourney.completedAt,
        journeyDuration: completedJourney.journeyDuration,
        applicationDate: completedJourney.applicationDate
      },
      job: updatedJob ? {
        id: updatedJob._id,
        status: updatedJob.status,
        applicationDate: updatedJob.applicationDate
      } : null
    });

  } catch (error) {
    console.error('Error completing journey:', error);
    return NextResponse.json(
      { error: 'Failed to complete journey' },
      { status: 500 }
    );
  }
}
