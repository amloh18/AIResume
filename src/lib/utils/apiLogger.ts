/**
 * API Logging Utility
 * Middleware helper for logging API requests
 */

import { ActivityLogService } from '@/lib/services/activityLogService';
import { NextRequest } from 'next/server';

export interface LoggingContext {
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log API request
 */
export async function logAPIRequest(
  request: NextRequest,
  context: LoggingContext,
  response: {
    status: number;
    responseTime: number;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const url = new URL(request.url);
  
  await ActivityLogService.logAPI({
    endpoint: url.pathname,
    method: request.method,
    userId: context.userId,
    userEmail: context.userEmail,
    statusCode: response.status,
    responseTime: response.responseTime,
    ipAddress: context.ipAddress || getClientIP(request),
    userAgent: context.userAgent || request.headers.get('user-agent') || undefined,
    requestSize: response.requestSize,
    responseSize: response.responseSize,
    errorMessage: response.errorMessage
  });
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return undefined;
}

/**
 * Measure response time wrapper
 */
export async function measureResponseTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; responseTime: number }> {
  const start = Date.now();
  const result = await fn();
  const responseTime = Date.now() - start;
  return { result, responseTime };
}

