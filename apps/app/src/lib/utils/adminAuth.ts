/**
 * Admin Authentication Utilities
 * Helper functions for extracting admin context from requests
 */

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';

export interface AdminContext {
  adminUserId?: string;
  adminEmail?: string;
  adminRole?: string;
}

/**
 * Get admin context from request (JWT token)
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return null;
    }

    try {
      const decoded = jwt.verify(
        adminToken.value,
        process.env.NEXTAUTH_SECRET || 'fallback-secret'
      ) as MyJwtPayload;

      return {
        adminUserId: decoded.id,
        adminEmail: decoded.email,
        adminRole: decoded.role
      };
    } catch (jwtError) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Verify admin authentication and return context
 */
export async function verifyAdminAuth(): Promise<{ 
  success: boolean; 
  context?: AdminContext;
  error?: string;
}> {
  const context = await getAdminContext();
  
  if (!context) {
    return {
      success: false,
      error: 'Unauthorized. Admin access required.'
    };
  }

  return {
    success: true,
    context
  };
}

