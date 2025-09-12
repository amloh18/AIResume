import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { JobApplication, CV, CoverLetter } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Journeys API - GET request received');
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'in-progress' | 'completed' | 'all'
    const jobId = searchParams.get('jobId'); // Filter by specific job ID
    
    console.log('🔍 Journeys API - Request params:', { userId, status, jobId });
    
    if (!userId) {
      console.log('🔍 Journeys API - No user ID provided');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query for job applications
    let jobQuery: any = { 
      userId, 
      isArchived: false 
    };
    
    // Add jobId filter if provided
    if (jobId) {
      jobQuery._id = jobId;
    }

    // Fetch job applications for the user (including those in 'created' stage)
    console.log('🔍 Journeys API - Querying job applications with query:', jobQuery);
    const jobApplications = await JobApplication.find(jobQuery).lean();

    console.log(`🔍 Journeys API - Found ${jobApplications.length} job applications for user ${userId}`);
    console.log(`🔍 Journeys API - Job statuses:`, jobApplications.map(job => ({ id: job._id, status: job.status, jobTitle: job.jobTitle, company: job.company })));

    // Fetch CVs for the user
    const cvs = await CV.find({ userId }).lean();

    // Fetch Cover Letters for the user
    const coverLetters = await CoverLetter.find({ userId }).lean();

    // Create a map of CVs by ID for quick lookup
    const cvMap = new Map();
    cvs.forEach(cv => {
      cvMap.set(cv._id.toString(), cv);
    });

    // Create a map of Cover Letters by jobId for quick lookup
    const coverLetterMap = new Map();
    coverLetters.forEach(coverLetter => {
      if (coverLetter.jobId) {
        coverLetterMap.set(coverLetter.jobId, coverLetter);
      }
    });

    console.log(`🔍 Journeys API - Found ${cvs.length} CVs and ${coverLetters.length} cover letters for user ${userId}`);

    // Transform job applications into journeys
    const journeys = jobApplications.map(job => {
      // Get linked CV using job.cvId
      const linkedCV = job.cvId ? cvMap.get(job.cvId.toString()) : null;
      const linkedCoverLetter = coverLetterMap.get(job._id.toString());
      
      console.log(`🔍 Journeys API - Processing job ${job._id}:`, {
        jobTitle: job.jobTitle,
        company: job.company,
        cvId: job.cvId,
        linkedCV: linkedCV ? { id: linkedCV._id, title: linkedCV.title, atsScore: linkedCV.metadata?.atsScore } : null,
        linkedCoverLetter: linkedCoverLetter ? { id: linkedCoverLetter._id, title: linkedCoverLetter.title } : null
      });
      
      // Determine journey status and current step based on database state
      // Use same strict logic as JobPipelineCardModal
      let status: 'in-progress' | 'completed' = 'in-progress';
      let currentStep = 1;
      let atsScore: number | undefined;
      let cvId: string | undefined;
      let coverLetterId: string | undefined;

      // Step 1: Job Added (always true if we have a job application)
      if (job.jobTitle && job.company) {
        currentStep = 1;
        
        // Step 2: CV Created/Linked (check if job has cvId AND CV exists)
        if (job.cvId && linkedCV) {
          currentStep = 2;
          cvId = job.cvId.toString();
          
          // Step 3: ATS Score Checked (check for job-specific ATS score in CV metadata)
          let hasATSScore = false;
          if (linkedCV.metadata?.atsScore && linkedCV.metadata?.atsScoreJobId === job._id.toString()) {
            hasATSScore = true;
            atsScore = linkedCV.metadata.atsScore;
          }
          
          if (hasATSScore) {
            currentStep = 3;
            
            // Step 4: Cover Letter Created (STRICT check - only if cover letter is linked to this specific job AND in our journey context)
            // We need to be more careful here - only consider completed if there's a cover letter specifically created for this journey
            if (linkedCoverLetter) {
              currentStep = 4;
              coverLetterId = linkedCoverLetter._id.toString();
              
              // Step 5: Download (only if ALL previous steps are verified complete)
              // For now, we'll only auto-complete to step 5 if the job status is explicitly 'applied'
              if (job.status === 'applied') {
                currentStep = 5;
                status = 'completed';
              }
            }
          }
        }
      }
      
      console.log(`🔍 Journeys API - Journey ${job._id} calculated:`, {
        currentStep,
        status,
        hasCV: !!linkedCV,
        hasATS: !!atsScore,
        hasCoverLetter: !!linkedCoverLetter,
        jobStatus: job.status
      });

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
        priority: job.priority,
        // Debug info
        _debug: {
          linkedCVId: linkedCV?._id,
          linkedCVMetadata: linkedCV?.metadata,
          linkedCoverLetterId: linkedCoverLetter?._id,
          jobStatus: job.status
        }
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
