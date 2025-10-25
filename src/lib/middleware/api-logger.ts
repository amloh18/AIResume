import { NextRequest, NextResponse } from 'next/server';
import { getAPILogModel } from '@/models/APILog';

/**
 * API Logging Middleware
 * 
 * Logs all API requests to the cvcircle_logs database for monitoring,
 * performance analysis, and debugging purposes.
 */

interface APILogData {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}

export class APILogger {
  private static logQueue: APILogData[] = [];
  private static isProcessing = false;

  /**
   * Log API request (non-blocking)
   */
  static async logRequest(logData: APILogData): Promise<void> {
    // Add to queue for batch processing
    this.logQueue.push(logData);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the log queue in batches
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const APILog = await getAPILogModel();
      const batch = this.logQueue.splice(0, 100); // Process up to 100 logs at a time
      
      if (batch.length > 0) {
        await APILog.insertMany(batch.map(log => ({
          ...log,
          timestamp: new Date()
        })));
      }
    } catch (error) {
      console.error('Error logging API requests:', error);
      // Don't re-queue failed logs to prevent infinite loops
    } finally {
      this.isProcessing = false;
      
      // Process remaining logs if any
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Get client IP address from request
   */
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('x-remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (remoteAddr) {
      return remoteAddr;
    }
    
    return 'unknown';
  }

  /**
   * Get request size from request
   */
  static getRequestSize(request: NextRequest): number {
    const contentLength = request.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Get response size from response
   */
  static getResponseSize(response: NextResponse): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Extract user ID from request (if available)
   */
  static getUserId(request: NextRequest): string | undefined {
    // Try to get user ID from various sources
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Could decode JWT token here if needed
      return undefined;
    }
    
    // Check for user ID in headers
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      return userIdHeader;
    }
    
    return undefined;
  }
}

/**
 * Middleware wrapper for API logging
 */
export function withAPILogging(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = request.method;
    const endpoint = request.nextUrl.pathname;
    const ip = APILogger.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const requestSize = APILogger.getRequestSize(request);
    const userId = APILogger.getUserId(request);
    
    let response: NextResponse;
    let errorMessage: string | undefined;
    
    try {
      response = await handler(request);
    } catch (error: any) {
      errorMessage = error.message || 'Unknown error';
      response = NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const statusCode = response.status;
    const responseSize = APILogger.getResponseSize(response);
    
    // Log the request (non-blocking)
    APILogger.logRequest({
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
      ip,
      userAgent,
      requestSize,
      responseSize,
      errorMessage
    });
    
    return response;
  };
}

/**
 * Utility function to log API requests manually
 */
export async function logAPIRequest(logData: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}): Promise<void> {
  await APILogger.logRequest(logData);
}

/**
 * Get API statistics
 */
export async function getAPIStats(options: {
  startDate?: Date;
  endDate?: Date;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
}) {
  try {
    const APILog = await getAPILogModel();
    return await APILog.getStats(options);
  } catch (error) {
    console.error('Error getting API stats:', error);
    return null;
  }
}

/**
 * Get top endpoints by usage
 */
export async function getTopEndpoints(options: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    const APILog = await getAPILogModel();
    return await APILog.getTopEndpoints(options);
  } catch (error) {
    console.error('Error getting top endpoints:', error);
    return [];
  }
}
