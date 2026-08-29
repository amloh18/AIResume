import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { validateEnvironment } from '@/lib/env-validation';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    environment: {
      status: 'healthy' | 'unhealthy';
      missingVars: string[];
      errors: string[];
    };
    memory: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      used: number;
      total: number;
      percentage: number;
    };
    externalServices: {
      gemini: 'healthy' | 'unhealthy' | 'unknown';
      email: 'healthy' | 'unhealthy' | 'unknown';
      polar: 'healthy' | 'unhealthy' | 'unknown';
    };
  };
}

async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> {
  const startTime = Date.now();
  try {
    const mongoose = await getConnection();
    const responseTime = Date.now() - startTime;
    
    if (mongoose.connection.readyState === 1) {
      return { status: 'healthy', responseTime };
    } else {
      return { status: 'unhealthy', responseTime, error: 'Database not connected' };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { 
      status: 'unhealthy', 
      responseTime, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
}

function checkEnvironment(): { status: 'healthy' | 'unhealthy'; missingVars: string[]; errors: string[] } {
  const validation = validateEnvironment();
  return {
    status: validation.isValid ? 'healthy' : 'unhealthy',
    missingVars: validation.missing,
    errors: validation.errors
  };
}

function checkMemory(): { status: 'healthy' | 'degraded' | 'unhealthy'; used: number; total: number; percentage: number } {
  const memUsage = process.memoryUsage();
  const used = memUsage.heapUsed;
  const total = memUsage.heapTotal;
  const percentage = (used / total) * 100;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (percentage < 70) {
    status = 'healthy';
  } else if (percentage < 90) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }
  
  return {
    status,
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round(percentage * 100) / 100
  };
}

async function checkExternalServices(): Promise<{
   gemini: 'healthy' | 'unhealthy' | 'unknown';
   email: 'healthy' | 'unhealthy' | 'unknown';
   polar: 'healthy' | 'unhealthy' | 'unknown';
 }> {
   const services: {
     gemini: 'healthy' | 'unhealthy' | 'unknown';
     email: 'healthy' | 'unhealthy' | 'unknown';
     polar: 'healthy' | 'unhealthy' | 'unknown';
   } = {
     gemini: 'unknown',
     email: 'unknown',
     polar: 'unknown'
   };

   // Check Gemini API
   if (process.env.GEMINI_API_KEY) {
     try {
       const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
         headers: {
           'X-Goog-Api-Key': process.env.GEMINI_API_KEY
         }
       });
       services.gemini = response.ok ? 'healthy' : 'unhealthy';
     } catch {
       services.gemini = 'unhealthy';
     }
   }

   // Check Email Service (Stalwart SMTP connection test)
   if (process.env.STALWART_SMTP_HOST) {
     try {
       const { testStalwartConnection } = await import('@/lib/services/applicationEmailService');
       const emailCheck = await testStalwartConnection();
       services.email = emailCheck.success ? 'healthy' : 'unhealthy';
     } catch {
       services.email = 'unhealthy';
     }
   } else if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
     services.email = 'healthy';
   } else {
     services.email = 'unhealthy';
   }

    // Check Polar
    if (process.env.POLAR_ACCESS_TOKEN) {
      services.polar = 'healthy';
    } else {
      services.polar = 'unhealthy';
    }

   return services;
 }

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [databaseCheck, environmentCheck, memoryCheck, externalServicesCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkEnvironment()),
      Promise.resolve(checkMemory()),
      checkExternalServices()
    ]);

    // Determine overall status
    const criticalChecks = [databaseCheck, environmentCheck];
    const hasUnhealthyCritical = criticalChecks.some(check => check.status === 'unhealthy');
    const hasDegraded = memoryCheck.status === 'degraded';
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasUnhealthyCritical) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: {
        database: databaseCheck,
        environment: environmentCheck,
        memory: memoryCheck,
        externalServices: externalServicesCheck
      }
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(result, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: {
        database: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
        environment: { status: 'unhealthy', missingVars: [], errors: ['Health check failed'] },
        memory: { status: 'unhealthy', used: 0, total: 0, percentage: 0 },
         externalServices: {
            gemini: 'unhealthy',
            email: 'unhealthy',
            polar: 'unhealthy'
         }
      }
    };

    return NextResponse.json(errorResult, { status: 503 });
  }
}

// Simple health check for load balancers
export async function HEAD(request: NextRequest) {
  try {
    const mongoose = await getConnection();
    if (mongoose.connection.readyState === 1) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}