/**
 * Admin Authentication Middleware
 * Ensures only admin users can access protected admin API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { errorResponse } from '@/lib/validation/api-validator';

/**
 * Require admin authentication for API routes
 * Throws an error if user is not authenticated or not an admin
 * 
 * @param request - NextRequest object
 * @returns Session object with admin user
 * @throws Error if not admin
 */
export async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authConfig);
  
  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }

  const user = session.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAdmin) {
    throw new Error('FORBIDDEN');
  }

  return session;
}

/**
 * Wrapper for admin API routes that automatically checks admin access
 * Returns 401 if not authenticated, 403 if not admin
 * Can be used with or without validation
 */
export function withAdminAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      await requireAdmin(request);
      return await handler(request);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'UNAUTHORIZED') {
          return errorResponse('UNAUTHORIZED', 'Authentication required', undefined, 401);
        }
        if (error.message === 'FORBIDDEN') {
          return errorResponse('FORBIDDEN', 'Admin access required', undefined, 403);
        }
      }
      console.error('Admin auth error:', error);
      return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', undefined, 500);
    }
  };
}

