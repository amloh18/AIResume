/**
 * Global API Route Wrapper
 * Ensures all API routes return JSON, even on unhandled errors
 * This prevents Next.js from returning HTML error pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from './error-handler';

/**
 * Wraps an API route handler to ensure it always returns JSON
 * Even if an unhandled error occurs, it will return JSON instead of HTML
 */
export function withAPIErrorHandling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Call the original handler
      const response = await handler(request, ...args);
      
      // Ensure response is JSON
      if (response && response instanceof NextResponse) {
        // Check if it's already JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // If not JSON, wrap it
          const text = await response.text();
          try {
            // Try to parse as JSON first
            const json = JSON.parse(text);
            return NextResponse.json(json, { status: response.status });
          } catch {
            // If not JSON, return as error
            return NextResponse.json(
              { error: text || 'Invalid response format' },
              { status: response.status || 500 }
            );
          }
        }
      }
      
      return response;
    } catch (error: any) {
      // Log the error
      console.error('Unhandled API error:', error);
      
      // Always return JSON, never HTML
      return createErrorResponse(error);
    }
  };
}

/**
 * Helper to ensure a response is JSON
 */
export function ensureJSONResponse(response: NextResponse): NextResponse {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response;
  }
  
  // If not JSON, we need to handle it
  // This shouldn't happen if all routes use NextResponse.json()
  return NextResponse.json(
    { error: 'Invalid response format' },
    { status: 500 }
  );
}

