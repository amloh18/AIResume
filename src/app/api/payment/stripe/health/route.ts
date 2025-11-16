import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payment/stripe';

/**
 * Stripe Health Check Endpoint
 * 
 * Checks if Stripe is available and responding.
 * Used by frontend to determine if Stripe can be used for payments.
 */
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'stripe',
          error: 'Stripe not configured' 
        },
        { status: 503 }
      );
    }

    // Perform a lightweight check - retrieve account info
    // This is a simple operation that verifies API connectivity
    try {
      await stripe.account.retrieve();
      
      return NextResponse.json({
        healthy: true,
        provider: 'stripe',
        timestamp: new Date().toISOString()
      });
    } catch (stripeError: any) {
      console.error('Stripe health check failed:', stripeError);
      
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'stripe',
          error: stripeError.message || 'Stripe API error',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('Stripe health check error:', error);
    return NextResponse.json(
      { 
        healthy: false, 
        provider: 'stripe',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

