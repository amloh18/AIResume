import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { verifySponsorship } from '@/lib/services/sponsorshipVerificationService';
import { formatExtensionError, formatExtensionSuccess, ExtensionErrorCode } from '@/lib/utils/extension-errors';
import { setCorsHeaders, handleCorsPreflight } from '@/lib/utils/cors-helpers';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

/**
 * POST /api/jobs/verify-sponsorship
 * 
 * Verifies if a company is a registered sponsor in various countries.
 * Supports both web (NextAuth session) and extension (JWT Bearer token) authentication.
 * 
 * Request Body:
 * {
 *   "company": "Google LLC",
 *   "location": "London, UK" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "results": [
 *       {
 *         "country": "UK",
 *         "isVerified": true,
 *         "verifiedDate": "2025-01-15T10:30:00Z",
 *         "source": "uk-gov-register",
 *         "companyName": "Google UK Limited",
 *         "licenceNumber": "ABC123456"
 *       }
 *     ]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request (supports both session and JWT token)
    const auth = await authenticateRequest(request);
    if (!auth) {
      // Check if this was an extension request to return proper error format
      const authHeader = request.headers.get('authorization');
      const isExtension = authHeader && authHeader.startsWith('Bearer ');
      
      if (isExtension) {
        return setCorsHeaders(
          NextResponse.json(
            formatExtensionError(
              ExtensionErrorCode.AUTH_INVALID,
              'Authentication required. Please sign in again.'
            ),
            { status: 401 }
          ),
          request
        );
      }
      
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        ),
        request
      );
    }

    const userId = auth.userId;
    const source = auth.source;

    // Ensure database connection
    await getConnection();

    // Parse request body
    const body = await request.json();
    const { company, location } = body;

    // Validate required fields
    if (!company || typeof company !== 'string' || company.trim().length === 0) {
      const errorMessage = 'Company name is required';
      
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

    // Perform verification
    const verificationResult = await verifySponsorship(company.trim(), location);

    // Format response based on source
    if (source === 'extension') {
      return setCorsHeaders(
        NextResponse.json(
          formatExtensionSuccess(
            { results: verificationResult.results },
            'Sponsorship verification completed'
          )
        ),
        request
      );
    }

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        data: {
          results: verificationResult.results
        }
      }),
      request
    );

  } catch (error: any) {
    console.error('❌ Sponsorship verification error:', error);

    // Check if this was an extension request
    const authHeader = request.headers.get('authorization');
    const isExtension = authHeader && authHeader.startsWith('Bearer ');

    if (isExtension) {
      return setCorsHeaders(
        NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.SERVER_ERROR,
            'Failed to verify sponsorship. Please try again.',
            { details: error.message },
            true // Retryable
          ),
          { status: 500 }
        ),
        request
      );
    }

    return setCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: 'Failed to verify sponsorship'
        },
        { status: 500 }
      ),
      request
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

