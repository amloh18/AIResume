import { NextRequest, NextResponse } from 'next/server';
import { razorpay } from '@/lib/payment/razorpay';

/**
 * Razorpay Health Check Endpoint
 * 
 * Checks if Razorpay is available and responding.
 * Used by frontend to determine if Razorpay can be used for payments.
 */
export async function GET(request: NextRequest) {
  try {
    if (!razorpay) {
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: 'Razorpay not configured' 
        },
        { status: 503 }
      );
    }

    // Perform a lightweight check - test API connectivity
    // We'll try to fetch payments list (with count: 1) which is a lightweight operation
    // This actually tests the API connection and authentication
    try {
      // Test API connection by fetching payments list (empty result is fine)
      // This verifies that the API keys are valid and the connection works
      const payments = await razorpay.payments.all({ count: 1 });
      
      // If we get here, the API is working
      return NextResponse.json({
        healthy: true,
        provider: 'razorpay',
        timestamp: new Date().toISOString(),
        message: 'Razorpay API is accessible'
      });
    } catch (razorpayError: any) {
      console.error('Razorpay health check failed:', razorpayError);
      
      // Check if it's an authentication error (401/403) vs other errors
      const isAuthError = razorpayError.statusCode === 401 || razorpayError.statusCode === 403;
      const errorMessage = isAuthError 
        ? 'Razorpay API authentication failed - check your API keys'
        : razorpayError.error?.description || razorpayError.message || 'Razorpay API error';
      
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: errorMessage,
          statusCode: razorpayError.statusCode,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('Razorpay health check error:', error);
    return NextResponse.json(
      { 
        healthy: false, 
        provider: 'razorpay',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

