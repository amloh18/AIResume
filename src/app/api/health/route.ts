import { NextRequest, NextResponse } from 'next/server';
import connectDB, { healthCheck, isConnected, getConnectionStatus } from '../../../lib/database';
import { userService, cvService, jobApplicationService } from '../../../lib/services';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Get basic health status
    const healthStatus = await healthCheck();
    
    // Get connection status
    const connectionStatus = getConnectionStatus();
    const connected = isConnected();

    // Get collection counts
    const counts = {
      users: await userService.count(),
      cvs: await cvService.count(),
      jobApplications: await jobApplicationService.count()
    };

    // Get system info
    const systemInfo = {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      platform: process.platform
    };

    // Check if we're on Vercel
    const isVercel = process.env.VERCEL === '1';
    const vercelInfo = isVercel ? {
      region: process.env.VERCEL_REGION,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      environment: process.env.VERCEL_ENV
    } : null;

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        ...healthStatus,
        connectionStatus,
        connected,
        collections: counts
      },
      system: systemInfo,
      vercel: vercelInfo
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        status: 'error',
        connectionStatus: getConnectionStatus(),
        connected: isConnected()
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
} 