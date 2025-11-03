import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { JobApplication, CV, CoverLetter, ApplicationJourney } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';

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
  let dbConnection = null;

  console.log(`🚀 [${requestId}] Journeys API - Request started`);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'in-progress' | 'completed' | 'all'
    const jobId = searchParams.get('jobId'); // Filter by specific job ID
    const includeUserProfile = searchParams.get('includeUserProfile') === 'true';

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
    dbConnection = await getConnection();

    // Build optimized query for CV Journeys
    let journeyQuery: any = { userId };

    // Add jobId filter if provided
    if (jobId) {
      journeyQuery.jobId = jobId;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      journeyQuery.status = status;
    }

    // Optimized query with projection and sorting
    const cvJourneys = await ApplicationJourney.find(journeyQuery)
      .select('_id jobId jobTitle company status currentStep totalSteps createdAt updatedAt atsScore cvId coverLetterId')
      .sort({ updatedAt: -1 })
      .limit(50) // Limit results to prevent large data sets
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

    let userProfile = null;

    // Fetch user profile data in parallel if requested
    if (includeUserProfile) {
      try {
        const userResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/user`, {
          headers: {
            'x-firebase-user-id': userId,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success) {
            userProfile = userData.user;
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Continue without user profile data
      }
    }

    const responseData = {
      success: true,
      data: {
        journeys,
        ...(userProfile && { userProfile })
      },
      _performance: {
        queryTime: Date.now() - startTime,
        journeysCount: journeys.length,
        totalTime: 0,
        requestId: requestId,
        cacheUsed: !!cachedData,
        dbConnectionTime: 0
      } as any
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

    // Add performance metrics to response
    responseData._performance.totalTime = totalTime;
    responseData._performance.requestId = requestId;
    responseData._performance.cacheUsed = !!cachedData;
    responseData._performance.dbConnectionTime = dbConnection ? Date.now() - startTime - 50 : 0; // Approximate

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
    let journey = await ApplicationJourney.findOne({ userId, jobId });

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
    const { journeyId, userId } = body;

    if (!journeyId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Journey ID and User ID are required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: 'Journey deleted successfully'
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