import { NextRequest, NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/payment/razorpay';

/**
 * Razorpay Health Check Endpoint
 * 
 * Checks if Razorpay is available and responding.
 * Used by frontend to determine if Razorpay can be used for payments.
 */
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables first
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    // Enhanced diagnostics for production debugging
    const envDebug = {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      keyIdLength: keyId?.length || 0,
      keySecretLength: keySecret?.length || 0,
      keyIdPrefix: keyId?.substring(0, 10) || 'missing',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('RAZORPAY')).join(', ')
    };
    
    console.log('🔍 Razorpay Health Check Diagnostics:', envDebug);
    
    if (!keySecret) {
      console.error('❌ Razorpay Health Check: RAZORPAY_KEY_SECRET is missing');
      console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('   → Ensure RAZORPAY_KEY_SECRET is set (without NEXT_PUBLIC_ prefix)');
      console.error('   → Ensure it is set for PRODUCTION environment (not just Preview/Development)');
      console.error('   → Redeploy after adding environment variables');
      console.error('   → Debug info:', JSON.stringify(envDebug, null, 2));
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: 'Razorpay secret key not configured. Check server environment variables.',
          timestamp: new Date().toISOString(),
          debug: envDebug // Always include debug info to help diagnose
        },
        { status: 503 }
      );
    }
    
    if (!keyId) {
      console.error('❌ Razorpay Health Check: RAZORPAY_KEY_ID is missing');
      console.error('   → Debug info:', JSON.stringify(envDebug, null, 2));
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: 'Razorpay key ID not configured. Check server environment variables.',
          timestamp: new Date().toISOString(),
          debug: envDebug // Always include debug info to help diagnose
        },
        { status: 503 }
      );
    }
    
    // Use runtime getter to ensure env vars are available
    const razorpay = getRazorpay();
    
    if (!razorpay) {
      console.error('❌ Razorpay Health Check: Failed to initialize Razorpay instance');
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: 'Razorpay instance initialization failed',
          timestamp: new Date().toISOString()
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
      console.error('❌ Razorpay health check failed:', razorpayError);
      
      // Extract detailed error information
      let errorMessage = 'Razorpay API error';
      const statusCode = razorpayError.statusCode;
      
      // Check if it's an authentication error (401/403) vs other errors
      const isAuthError = statusCode === 401 || statusCode === 403;
      
      if (isAuthError) {
        errorMessage = 'Razorpay API authentication failed - check your API keys';
        console.error('⚠️  Authentication error suggests RAZORPAY_KEY_SECRET may be incorrect');
        console.error('   → Verify the secret key in Vercel Environment Variables');
        console.error('   → Ensure it matches your Razorpay Dashboard (Test vs Live mode)');
      } else if (razorpayError.error) {
        const razorpayApiError = razorpayError.error;
        errorMessage = razorpayApiError.description || razorpayApiError.message || errorMessage;
        console.error('Razorpay API Error Details:', {
          code: razorpayApiError.code,
          description: razorpayApiError.description,
          field: razorpayApiError.field,
          source: razorpayApiError.source,
          step: razorpayApiError.step,
          reason: razorpayApiError.reason,
        });
      } else if (razorpayError.message) {
        errorMessage = razorpayError.message;
      }
      
      return NextResponse.json(
        { 
          healthy: false, 
          provider: 'razorpay',
          error: errorMessage,
          statusCode: statusCode,
          timestamp: new Date().toISOString(),
          details: process.env.NODE_ENV === 'development' ? {
            type: razorpayError.error?.code,
            description: razorpayError.error?.description
          } : undefined
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

