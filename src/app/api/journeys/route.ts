import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { JobApplication, CV } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'in-progress' | 'completed' | 'all'
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch job applications for the user (including those in 'created' stage)
    const jobApplications = await JobApplication.find({ 
      userId, 
      isArchived: false 
    }).lean();

    console.log(`🔍 Journeys API - Found ${jobApplications.length} job applications for user ${userId}`);
    console.log(`🔍 Journeys API - Job statuses:`, jobApplications.map(job => ({ id: job._id, status: job.status, jobTitle: job.jobTitle, company: job.company })));

    // Fetch CVs for the user
    const cvs = await CV.find({ userId }).lean();

    // Create a map of CVs by jobId for quick lookup
    const cvMap = new Map();
    cvs.forEach(cv => {
      if (cv.linkedJobId) {
        cvMap.set(cv.linkedJobId.toString(), cv);
      }
    });

    // Transform job applications into journeys
    const journeys = jobApplications.map(job => {
      const linkedCV = cvMap.get(job._id.toString());
      
      // Determine journey status and current step
      let status: 'in-progress' | 'completed' = 'in-progress';
      let currentStep = 1; // Start with step 1 (Add Job)
      let atsScore: number | undefined;
      let cvId: string | undefined;
      let coverLetterId: string | undefined;

      // Step 1: Job Added (always true if we have a job application)
      if (job.jobTitle && job.company) {
        currentStep = 1;
        // For jobs in 'created' stage, ensure they start the journey
        if (job.status === 'created') {
          status = 'in-progress';
          currentStep = 1;
        }
      }

      // Step 2: CV Created
      if (linkedCV) {
        currentStep = 2;
        cvId = linkedCV._id.toString();
        
        // Check if CV has ATS score data
        if (linkedCV.metadata?.atsScore) {
          currentStep = 3;
          atsScore = linkedCV.metadata.atsScore;
        }
      }

      // Step 3: ATS Score Checked (if CV exists and has ATS data)
      if (linkedCV && linkedCV.metadata?.atsScore) {
        currentStep = 3;
        atsScore = linkedCV.metadata.atsScore;
      }

      // Step 4: Cover Letter Created (check if cover letter exists)
      // This would need to be implemented when cover letter functionality is added
      // For now, we'll assume it's not completed
      
      // Step 5: Download (if all previous steps are complete)
      if (currentStep >= 3 && atsScore && atsScore >= 80) {
        currentStep = 5;
        status = 'completed';
      }

      return {
        id: job._id.toString(),
        jobId: job._id.toString(),
        jobTitle: job.jobTitle,
        company: job.company,
        status,
        currentStep,
        totalSteps: 5,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        atsScore,
        cvId,
        coverLetterId,
        // Additional job data
        location: job.location,
        salary: job.salary,
        applicationDate: job.applicationDate,
        deadline: job.deadline,
        priority: job.priority
      };
    });

    // Filter by status if specified
    let filteredJourneys = journeys;
    if (status && status !== 'all') {
      filteredJourneys = journeys.filter(journey => journey.status === status);
    }

    // Sort by creation date (newest first)
    filteredJourneys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate counts
    const totalJourneys = journeys.length;
    const inProgressJourneys = journeys.filter(j => j.status === 'in-progress').length;
    const completedJourneys = journeys.filter(j => j.status === 'completed').length;

    return NextResponse.json({
      success: true,
      data: {
        journeys: filteredJourneys,
        counts: {
          total: totalJourneys,
          inProgress: inProgressJourneys,
          completed: completedJourneys
        }
      }
    });

  } catch (error: any) {
    console.error('Get journeys error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const journeyId = searchParams.get('journeyId'); // This is actually the jobId
    const userId = searchParams.get('userId');
    
    if (!journeyId) {
      return NextResponse.json(
        { success: false, message: 'Journey ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Journeys API - Deleting journey (job) with ID: ${journeyId} for user: ${userId}`);

    // First, find any CVs linked to this job
    const linkedCVs = await CV.find({
      linkedJobId: journeyId,
      userId: userId
    });

    console.log(`🔍 Journeys API - Found ${linkedCVs.length} CVs linked to job ${journeyId}`);

    // Delete the job application from the database
    const result = await JobApplication.findOneAndDelete({
      _id: journeyId,
      userId: userId
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Journey not found or already deleted' },
        { status: 404 }
      );
    }

    // Optionally, you can also delete linked CVs if you want to completely remove all related data
    // Uncomment the following lines if you want to delete linked CVs as well:
    /*
    if (linkedCVs.length > 0) {
      const cvDeleteResult = await CV.deleteMany({
        linkedJobId: journeyId,
        userId: userId
      });
      console.log(`🔍 Journeys API - Deleted ${cvDeleteResult.deletedCount} linked CVs`);
    }
    */

    console.log(`🔍 Journeys API - Successfully deleted journey (job): ${journeyId}`);

    return NextResponse.json({
      success: true,
      message: 'Journey deleted successfully',
      data: {
        deletedJourneyId: journeyId
      }
    });

  } catch (error: any) {
    console.error('Delete journey error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
