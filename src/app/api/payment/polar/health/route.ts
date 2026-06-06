// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getPolar } from '@/lib/payment/polar';

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (!accessToken) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          configured: false,
          healthy: true,
          mock: true,
          message: 'Polar is not configured, running in development fallback mode'
        });
      }
      return NextResponse.json({
        configured: false,
        error: 'POLAR_ACCESS_TOKEN is not configured',
        message: 'Please add POLAR_ACCESS_TOKEN to your environment variables'
      }, { status: 503 });
    }

    if (!webhookSecret) {
      return NextResponse.json({
        configured: true,
        warning: 'POLAR_WEBHOOK_SECRET is not configured',
        message: 'Webhook signature verification will not work without POLAR_WEBHOOK_SECRET'
      }, { status: 200 });
    }

    const polar = getPolar();
    if (!polar) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          configured: false,
          healthy: true,
          mock: true,
          message: 'Failed to initialize Polar instance, running in development fallback mode'
        });
      }
      return NextResponse.json({
        configured: false,
        error: 'Failed to initialize Polar instance',
        message: 'Please check your POLAR_ACCESS_TOKEN'
      }, { status: 503 });
    }

    try {
      const products = await polar.products.list({});
      
      return NextResponse.json({
        configured: true,
        healthy: true,
        message: 'Polar is configured and operational',
        webhookConfigured: !!webhookSecret,
        productsCount: products.items?.length || 0
      });
    } catch (error: any) {
      console.error('Polar health check API test failed:', error);
      
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          configured: true,
          healthy: true,
          mock: true,
          message: 'Polar API failed, but running in development fallback mode',
          error: error?.message || 'Unknown error'
        });
      }
      
      return NextResponse.json({
        configured: true,
        healthy: false,
        error: 'Failed to connect to Polar API',
        message: error?.message || 'Unknown error',
        suggestion: 'Please verify your POLAR_ACCESS_TOKEN is valid'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Polar health check error:', error);
    return NextResponse.json({
      configured: false,
      healthy: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
