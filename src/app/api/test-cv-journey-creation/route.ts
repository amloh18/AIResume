import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CVJourney, JobApplication } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Testing CV Journey creation for user:', userId);

    // Get all jobs for the user
    const jobs = await JobApplication.find({ userId }).sort({ createdAt: -1 }).limit(5);
    console.log(`✅ Found ${jobs.length} jobs for user`);

    // Get all CV Journeys for the user
    const cvJourneys = await CVJourney.find({ userId }).sort({ createdAt: -1 });
    console.log(`✅ Found ${cvJourneys.length} CV Journeys for user`);

    // Check if each job has a corresponding CV Journey
    const jobsWithJourneys = jobs.map(job => {
      const journey = cvJourneys.find(j => j.jobId === job._id.toString());
      return {
        jobId: job._id.toString(),
        jobTitle: job.jobTitle,
        company: job.company,
        createdAt: job.createdAt,
        hasCVJourney: !!journey,
        journeyId: journey?._id.toString(),
        journeyStatus: journey?.status,
        journeyCurrentStep: journey?.currentStep
      };
    });

    return NextResponse.json({
      success: true,
      message: 'CV Journey creation test completed',
      data: {
        totalJobs: jobs.length,
        totalCVJourneys: cvJourneys.length,
        jobsWithJourneys,
        cvJourneys: cvJourneys.map(journey => ({
          id: journey._id.toString(),
          jobId: journey.jobId,
          jobTitle: journey.jobTitle,
          company: journey.company,
          status: journey.status,
          currentStep: journey.currentStep,
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId,
          createdAt: journey.createdAt
        }))
      }
    });

  } catch (error: any) {
    console.error('CV Journey creation test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to test CV Journey creation',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
