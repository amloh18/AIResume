/**
 * @deprecated This endpoint is deprecated. Use /api/admin/country-pricing instead.
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { errorResponse } from '@/lib/validation/api-validator';

export const GET = withAdminAuth(async (request: NextRequest) => {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/admin/country-pricing instead.',
      deprecated: true,
      newEndpoint: '/api/admin/country-pricing'
    },
    { status: 410 } // 410 Gone
  );
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/admin/country-pricing instead.',
      deprecated: true,
      newEndpoint: '/api/admin/country-pricing'
    },
    { status: 410 } // 410 Gone
  );
});

export const PUT = withAdminAuth(async (request: NextRequest) => {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/admin/country-pricing instead.',
      deprecated: true,
      newEndpoint: '/api/admin/country-pricing'
    },
    { status: 410 } // 410 Gone
  );
});

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/admin/country-pricing instead.',
      deprecated: true,
      newEndpoint: '/api/admin/country-pricing'
    },
    { status: 410 } // 410 Gone
  );
});
