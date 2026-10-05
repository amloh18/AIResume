/**
 * CORS Helper Functions
 * Following BACKEND_INTEGRATION_GUIDE.md for Chrome Extension support
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Sets CORS headers for Chrome extension requests
 * Following the guide pattern: checks for chrome-extension:// origin
 */
export function setCorsHeaders(response: NextResponse | Response, request: NextRequest): NextResponse | Response {
  const origin = request.headers.get('origin');
  
  if (origin && origin.startsWith('chrome-extension://')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  return response;
}

/**
 * Handles CORS preflight (OPTIONS) requests
 * Following the guide pattern
 */
export async function handleCorsPreflight(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  
  const response = new NextResponse(null, { status: 200 });
  
  if (origin && origin.startsWith('chrome-extension://')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  return response;
}

