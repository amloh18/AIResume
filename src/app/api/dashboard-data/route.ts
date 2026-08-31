// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { CV, JobApplication, ApplicationJourney } from '@/models';
import UserModel from '@/models/User';
import mongoose from 'mongoose';
import subscriptionService from '@/lib/services/subscriptionService';

/**
 * Backend-for-Frontend (BFF) Endpoint for Dashboard
 * 
 * Consolidates multiple API calls into a single request to reduce network overhead
 * and leverage shared database connection for faster response times.
 * 
 * This endpoint replaces:
 * - GET /api/user
 * - GET /api/cvs
 * - GET /api/cover-letters
 * - GET /api/application-journey
 * - GET /api/jobs
 * - GET /api/user/settings
 * - GET /api/user/usage-limits
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Establish single database connection (reused across all queries)
    await getConnection();
    
    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, userEmail } = authResult;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeCVs = searchParams.get('includeCVs') !== 'false';
    const includeJobs = searchParams.get('includeJobs') !== 'false';
    const includeJourneys = searchParams.get('includeJourneys') !== 'false';
    const cvProjection = searchParams.get('cvProjection') || 'summary'; // list, summary, or full

    // Parallel data fetching using shared connection
    const [
      user,
      cvs,
      jobs,
      journeys,
      cvCount,
      jobCount
    ] = await Promise.all([
      // Fetch user data with settings and usage limits
      UserModel.findById(userObjectId)
        .select('name email subscription usageLimits credits settings preferences')
        .lean(),
      
      // Fetch CVs (conditional)
      includeCVs 
        ? CV.find({ userId: userObjectId })
            .select(
              cvProjection === 'list' 
                ? 'title status metadata.starred metadata.lastModified createdAt updatedAt'
                : cvProjection === 'summary'
                ? 'title status metadata templateId templateName createdAt updatedAt'
                : undefined // full projection
            )
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean()
        : Promise.resolve([]),
      
      // Fetch jobs (conditional)
      includeJobs
        ? JobApplication.find({ userId: userObjectId })
            .select('jobTitle company status location salary deadline createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean()
        : Promise.resolve([]),
      
      // Fetch application journeys (conditional)
      includeJourneys
        ? ApplicationJourney.find({ userId: userObjectId })
            .select('jobId cvId coverLetterId status currentStep totalSteps atsScore jobTitle company createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean()
        : Promise.resolve([]),

      // Count queries (parallelized with the above)
      includeCVs ? CV.countDocuments({ userId: userObjectId }) : Promise.resolve(0),
      includeJobs ? JobApplication.countDocuments({ userId: userObjectId }) : Promise.resolve(0),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { currentPlanKey, subscription, isExpired } = subscriptionService.getEffectivePlan(user);

    // Construct response
    const responseData = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        currentPlanKey,
        subscription: subscription || {
          status: 'free',
          planKey: 'free'
        },
        credits: user.credits || 0,
        settings: user.settings || {},
        preferences: user.preferences || {}
      },
      usageLimits: {
        cvs: {
          used: cvCount,
          limit: currentPlanKey === 'free' ? 1 : -1
        },
        jobs: {
          used: jobCount,
          limit: currentPlanKey === 'free' ? 1 : -1
        }
      },
      cvs: includeCVs ? cvs.map(cv => ({
        id: cv._id.toString(),
        title: cv.title,
        status: cv.status,
        metadata: cv.metadata,
        createdAt: cv.createdAt,
        updatedAt: cv.updatedAt,
        ...(cvProjection !== 'list' && {
          templateId: cv.templateId,
          templateName: cv.templateName,
          cvData: cvProjection === 'full' ? cv.cvData : undefined
        })
      })) : [],
      jobs: includeJobs ? jobs.map(job => ({
        id: job._id.toString(),
        jobTitle: job.jobTitle,
        company: job.company,
        status: job.status,
        location: job.location,
        salary: job.salary,
        deadline: job.deadline,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      })) : [],
      journeys: includeJourneys ? journeys.map(journey => ({
        id: journey._id.toString(),
        jobId: journey.jobId?.toString(),
        cvId: journey.cvId?.toString(),
        coverLetterId: journey.coverLetterId?.toString(),
        status: journey.status,
        currentStep: journey.currentStep,
        totalSteps: journey.totalSteps,
        atsScore: journey.atsScore,
        jobTitle: journey.jobTitle,
        company: journey.company,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt
      })) : [],
      counts: {
        cvs: cvCount,
        jobs: jobCount,
        journeys: includeJourneys ? journeys.length : 0
      }
    };

    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      data: responseData,
      _meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
      }
    });

  } catch (error: any) {
    console.error('❌ Dashboard data fetch error:', error);
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch dashboard data',
        _meta: {
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

