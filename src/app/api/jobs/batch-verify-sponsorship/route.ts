import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { verifySponsorship } from '@/lib/services/sponsorshipVerificationService';
import { JobApplication } from '@/models';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import mongoose from 'mongoose';
import { formatExtensionError, formatExtensionSuccess, ExtensionErrorCode } from '@/lib/utils/extension-errors';

/**
 * POST /api/jobs/batch-verify-sponsorship
 * 
 * Batch verifies sponsorship for multiple jobs.
 * Supports both web (NextAuth session) and extension (JWT Bearer token) authentication.
 * 
 * Request Body:
 * {
 *   "jobIds": ["job1", "job2", "job3"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "job1": {
 *       "results": [
 *         {
 *           "country": "UK",
 *           "isVerified": true,
 *           "verifiedDate": "2025-01-15T10:30:00Z",
 *           "source": "uk-gov-register",
 *           "companyName": "Company Name",
 *           "licenceNumber": "ABC123"
 *         }
 *       ]
 *     },
 *     "job2": {
 *       "results": []
 *     }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    let source = 'web';

    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;

        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            formatExtensionError(
              ExtensionErrorCode.AUTH_INVALID,
              'Invalid token type. This endpoint requires an extension token.'
            ),
            { status: 401 }
          );
        }

        userId = decoded.userId || null;
        source = 'extension';
        console.log('✅ Extension token verified for user:', userId);
      } catch (error: any) {
        console.log('❌ Invalid extension token:', error);
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.AUTH_INVALID,
            error.name === 'TokenExpiredError'
              ? 'Token has expired. Please refresh your token.'
              : 'Invalid token. Please sign in again.'
          ),
          { status: 401 }
        );
      }
    } else {
      // Web interface request with session
      const authResult = await getAuthenticatedUser();

      if (!authResult) {
        console.log('❌ No valid authentication found for web request');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      userId = authResult.userId;
      console.log('✅ Web session verified for user:', userId);
    }

    // Ensure database connection
    await getConnection();

    // Parse request body
    const body = await request.json();
    const { jobIds } = body;

    // Validate required fields
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      const errorMessage = 'jobIds must be a non-empty array';

      if (source === 'extension') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.JOB_VALIDATION_FAILED,
            errorMessage
          ),
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const errorMessage = 'Invalid user ID';

      if (source === 'extension') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.AUTH_INVALID,
            errorMessage
          ),
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // Convert jobIds to ObjectIds and fetch jobs
    const objectIds = jobIds
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      const errorMessage = 'No valid job IDs provided';

      if (source === 'extension') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.VALIDATION_FAILED,
            errorMessage
          ),
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // Fetch jobs from database (only for the authenticated user)
    const jobs = await JobApplication.find({
      _id: { $in: objectIds },
      userId: new mongoose.Types.ObjectId(userId)
    }).lean();

    if (jobs.length === 0) {
      const errorMessage = 'No jobs found for the provided IDs';

      if (source === 'extension') {
        return NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.CV_NOT_FOUND, // Using CV_NOT_FOUND as closest match for "not found"
            errorMessage
          ),
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 404 }
      );
    }

    // Verify each job
    const results: Record<string, { results: any[] }> = {};

    // Process verifications in parallel for better performance
    const verificationPromises = jobs.map(async (job) => {
      const jobId = job._id.toString();
      
      if (job.company) {
        const verification = await verifySponsorship(job.company, job.location);
        results[jobId] = { results: verification.results };
      } else {
        results[jobId] = { results: [] };
      }
    });

    await Promise.all(verificationPromises);

    // Also include jobIds that were requested but not found (for completeness)
    jobIds.forEach((jobId: string) => {
      if (!results[jobId]) {
        results[jobId] = { results: [] };
      }
    });

    // Format response based on source
    if (source === 'extension') {
      return NextResponse.json(
        formatExtensionSuccess(
          results,
          'Batch sponsorship verification completed'
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error: any) {
    console.error('❌ Batch sponsorship verification error:', error);

    // Check if this was an extension request
    const authHeader = request.headers.get('authorization');
    const isExtension = authHeader && authHeader.startsWith('Bearer ');

    if (isExtension) {
      return NextResponse.json(
        formatExtensionError(
          ExtensionErrorCode.SERVER_ERROR,
          'Failed to batch verify sponsorship. Please try again.',
          { details: error.message },
          true // Retryable
        ),
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to batch verify sponsorship'
      },
      { status: 500 }
    );
  }
}

