import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { JobApplication, CV, CoverLetter, ApplicationJourney } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// Extend global type for cache
declare global {
  var userCache: Map<string, { data: any; timestamp: number }> | undefined;
  var journeysCache: Map<string, { data: any; timestamp: number }> | undefined;
}

// Cache cleanup utility
function cleanupExpiredCache(cache: Map<string, { data: any; timestamp: number }> | undefined, cacheName: string) {
  if (!cache) return;

  const now = Date.now();
  const CACHE_DURATION = cacheName === 'journeys' ? 30000 : 60000;
  const expiredKeys: string[] = [];

  Array.from(cache.entries()).forEach(([key, value]) => {
    if ((now - value.timestamp) > CACHE_DURATION) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => cache.delete(key));

  if (expiredKeys.length > 0) {
    console.log(`🧹 Cleaned up ${expiredKeys.length} expired entries from ${cacheName} cache`);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  console.log(`🚀 [${requestId}] Journeys API - Request started`);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'in-progress' | 'completed' | 'all'
    const jobId = searchParams.get('jobId'); // Filter by specific job ID
    const limitParam = searchParams.get('limit');

    /*
      Resolve the user from the session first, and fall back to `?userId=`.

      Every in-app caller (`ApplicationsPanel`, `DashboardDataContext`) calls
      `/api/journeys?limit=all` with NO userId — `authenticatedFetch` adds auth
      headers, not query params. This route used to reject that with a 400, so
      the journey list silently stayed empty and every consumer of
      `getJobJourneys()` rendered "no documents": the kanban card showed
      "Partially generated" beside two red icons for applications whose
      documents existed, while `JobSidebar` (which self-fetches
      `/api/application-journey?jobId=…`) showed them correctly.

      The query param is kept for the Chrome extension and any existing deep
      link; the session is the default because it cannot drift from the caller.
    */
    let userId = searchParams.get('userId');
    if (!userId) {
      const authResult = await getAuthenticatedUser();
      userId = authResult?.userId ?? null;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check cache first (in-memory cache for this request)
    const cacheKey = `journeys_${userId}_${status || 'all'}_${jobId || 'all'}`;
    const cachedData = global.journeysCache?.get(cacheKey);
    const CACHE_DURATION = 30000; // 30 seconds

    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log('🔍 Journeys API - Returning cached data');
      return NextResponse.json(cachedData.data);
    }

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupExpiredCache(global.journeysCache, 'journeys');
    }

    // Establish database connection once
    await getConnection();

    // Build optimized query for CV Journeys
    const journeyQuery: any = { userId };

    // Add jobId filter if provided
    if (jobId) {
      journeyQuery.jobId = jobId;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      journeyQuery.status = status;
    }

    // Optimized query with projection and sorting.
    //
    // `limit=all` is what every in-app caller sends, so it must not be silently
    // ignored: the old unconditional `.limit(50)` truncated the list for anyone
    // past 50 journeys, and a dropped journey is indistinguishable from a
    // journey that was never created (the card renders "no documents").
    const MAX_LIMIT = 500;
    let journeyQueryBuilder = ApplicationJourney.find(journeyQuery)
      .select('_id jobId jobTitle company status currentStep totalSteps createdAt updatedAt atsScore cvId coverLetterId')
      .sort({ updatedAt: -1 });

    if (limitParam && limitParam !== 'all') {
      const parsedLimit = parseInt(limitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        journeyQueryBuilder = journeyQueryBuilder.limit(Math.min(parsedLimit, MAX_LIMIT));
      }
    } else if (!limitParam) {
      // No explicit limit — keep the old default so this stays a bounded query.
      journeyQueryBuilder = journeyQueryBuilder.limit(50);
    }

    const cvJourneys = await journeyQueryBuilder
      .lean()
      .exec(); // Explicitly execute query for better performance monitoring

    // Transform CV Journeys into the expected format
    const journeys = cvJourneys.map(journey => ({
      id: (journey._id as any).toString(),
      jobId: journey.jobId,
      jobTitle: journey.jobTitle,
      company: journey.company,
      status: journey.status,
      currentStep: journey.currentStep,
      totalSteps: journey.totalSteps || 5,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
      atsScore: journey.atsScore,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId
    }));

    const responseData = {
      success: true,
      data: {
        journeys
      }
    };

    // Cache the response
    if (!global.journeysCache) {
      global.journeysCache = new Map();
    }
    global.journeysCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Journeys API - Completed in ${totalTime}ms, found ${journeys.length} journeys`);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Journeys API error:', error);
    const errorResponse = createErrorResponse(error);

    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Journeys API - POST request received');
    await getConnection();
    
    const body = await request.json();
    const { userId, jobId, cvId, coverLetterId, journeyName } = body;

    if (!userId || !jobId) {
      return NextResponse.json(
        { success: false, message: 'User ID and Job ID are required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    // `const`: the document is only ever mutated in place, never rebound.
    const journey = await ApplicationJourney.findOne({ userId, jobId });

    if (journey) {
      // Update existing journey
      if (cvId !== undefined) journey.cvId = cvId;
      if (coverLetterId !== undefined) journey.coverLetterId = coverLetterId;
      
      journey.metadata.updatedAt = new Date();
      journey.metadata.lastAccessedAt = new Date();
      
      await journey.save();
      
      return NextResponse.json({
        success: true,
        message: 'Journey updated successfully',
        data: {
          journey: {
            id: journey._id.toString(),
            jobId: journey.jobId,
            cvId: journey.cvId,
            coverLetterId: journey.coverLetterId,
            status: journey.status,
            currentStep: journey.currentStep,
            jobTitle: journey.jobTitle,
            company: journey.company
          }
        }
      });
    } else {
      // Create new journey
      const newJourney = new ApplicationJourney({
        userId,
        jobId,
        cvId: cvId || null,
        coverLetterId: coverLetterId || null,
        status: 'in-progress',
        currentStep: 1,
        totalSteps: 5,
        atsScore: null,
        jobTitle: '', // Will be populated from job data
        company: '', // Will be populated from job data
        steps: [
          { stepId: 1, name: 'Add Job', status: 'completed' },
          { stepId: 2, name: 'Create CV', status: cvId ? 'completed' : 'pending' },
          { stepId: 3, name: 'ATS Score', status: 'pending' },
          { stepId: 4, name: 'Cover Letter', status: 'pending' },
          { stepId: 5, name: 'Download', status: 'pending' }
        ],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date()
        }
      });

      // Fetch job data to populate job title and company
      const job = await JobApplication.findById(jobId);
      if (job) {
        newJourney.jobTitle = job.jobTitle;
        newJourney.company = job.company;
      }

      try {
        await newJourney.save();

        return NextResponse.json({
          success: true,
          message: 'Journey created successfully',
          data: {
            journey: {
              id: newJourney._id.toString(),
              jobId: newJourney.jobId,
              cvId: newJourney.cvId,
              coverLetterId: newJourney.coverLetterId,
              status: newJourney.status,
              currentStep: newJourney.currentStep,
              jobTitle: newJourney.jobTitle,
              company: newJourney.company
            }
          }
        });
      } catch (saveError: any) {
        // Handle unique constraint violation (duplicate journey)
        if (saveError.code === 11000 || saveError.message.includes('E11000')) {
          console.log('🔍 Duplicate journey detected, fetching existing journey...');
          
          // Fetch the existing journey
          const existingJourney = await ApplicationJourney.findOne({ userId, jobId });
          if (existingJourney) {
            return NextResponse.json({
              success: true,
              message: 'Journey already exists',
              data: {
                journey: {
                  id: existingJourney._id.toString(),
                  jobId: existingJourney.jobId,
                  cvId: existingJourney.cvId,
                  coverLetterId: existingJourney.coverLetterId,
                  status: existingJourney.status,
                  currentStep: existingJourney.currentStep,
                  jobTitle: existingJourney.jobTitle,
                  company: existingJourney.company
                }
              }
            });
          }
        }
        
        // Re-throw the error if it's not a duplicate
        throw saveError;
      }
    }

  } catch (error: any) {
    console.error('Create/Update journey error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 Journeys API - DELETE request received');
    await getConnection();
    
    const body = await request.json();
    const { journeyId, userId, deleteDocuments } = body;

    if (!journeyId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Journey ID and User ID are required' },
        { status: 400 }
      );
    }

    // Read the links BEFORE deleting so we can cascade. The journey is the only
    // place that records which CV / cover letter belong to it — dropping it
    // first would orphan both documents forever.
    const journey = await ApplicationJourney.findOne({ _id: journeyId, userId })
      .select('cvId coverLetterId')
      .lean();

    const result = await ApplicationJourney.findOneAndDelete({ 
      _id: journeyId, 
      userId 
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Journey not found' },
        { status: 404 }
      );
    }

    // Cascade-delete the generated documents. Opt-out via `deleteDocuments: false`
    // for callers that want to keep the documents (e.g. "archive" flows).
    const cascade = {
      attempted: deleteDocuments !== false,
      cvDeleted: false,
      coverLetterDeleted: false,
      cvRetained: false,
      coverLetterRetained: false,
    };

    if (cascade.attempted) {
      const linkedCvId = (journey as any)?.cvId;
      const linkedCoverLetterId = (journey as any)?.coverLetterId;

      if (linkedCvId) {
        // Guard: never delete a document another journey still points at.
        const otherCvRef = await ApplicationJourney.countDocuments({
          userId,
          cvId: linkedCvId,
        });
        if (otherCvRef === 0) {
          const cvDelete = await CV.deleteOne({ _id: linkedCvId, userId });
          cascade.cvDeleted = cvDelete.deletedCount > 0;
        } else {
          cascade.cvRetained = true;
        }
      }

      if (linkedCoverLetterId) {
        const otherClRef = await ApplicationJourney.countDocuments({
          userId,
          coverLetterId: linkedCoverLetterId,
        });
        if (otherClRef === 0) {
          const clDelete = await CoverLetter.deleteOne({ _id: linkedCoverLetterId, userId });
          cascade.coverLetterDeleted = clDelete.deletedCount > 0;
        } else {
          cascade.coverLetterRetained = true;
        }
      }
    }

    // Invalidate the journey list cache so the deleted row disappears immediately
    if (global.journeysCache) {
      Array.from(global.journeysCache.keys())
        .filter((key) => key.startsWith(`journeys_${userId}_`))
        .forEach((key) => global.journeysCache!.delete(key));
    }

    return NextResponse.json({
      success: true,
      message: 'Journey deleted successfully',
      documents: cascade,
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

export async function PATCH(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (action === 'fix-documents') {
      // Find journeys missing CV or cover letter
      const journeys = await ApplicationJourney.find({
        userId,
        status: { $in: ['processing_documents', 'in-progress'] },
        $or: [{ cvId: { $exists: false } }, { cvId: null }, { coverLetterId: { $exists: false } }, { coverLetterId: null }]
      }).lean();

      if (journeys.length === 0) {
        return NextResponse.json({ success: true, message: 'No journeys need fixing', count: 0 });
      }

      const { createJourneyDocuments } = await import('@/lib/services/journeyDocumentService');
      const results = await Promise.allSettled(
        journeys.map(async (j) => {
          const result = await createJourneyDocuments((j._id as any).toString(), userId);
          return { journeyId: j._id, ...result };
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - succeeded;

      return NextResponse.json({
        success: true,
        message: `Fixed ${succeeded} journeys, ${failed} failed`,
        count: succeeded,
        failed
      });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Journeys PATCH error:', error);
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
