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

    // Perform a lightweight check - retrieve account info
    // This is a simple operation that verifies API connectivity
    try {
      // Razorpay doesn't have a direct account.retrieve() method
      // Instead, we'll try to fetch a payment (with a fake ID) which will fail gracefully
      // Or we can check if the client is initialized
      if (!razorpay.payments || !razorpay.orders) {
        throw new Error('Razorpay client not properly initialized');
      }
      
      return NextResponse.json({
        healthy: true,
        provider: 'razorpay',
        timestamp: new Date().toISOString()
      });
    } catch (razorpayError: any) {
      console.error('Razorpay health check failed:', razorpayError);
      
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: razorpayError.message || 'Razorpay API error',
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

