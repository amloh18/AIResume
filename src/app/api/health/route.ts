import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV, Template, User } from '@/models';
import AdminTemplateService from '@/lib/services/adminTemplateService';

/**
 * Health check endpoint for debugging Master CV creation issues
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown', message: '' },
      templates: { status: 'unknown', message: '', count: 0 },
      users: { status: 'unknown', message: '', count: 0 },
      cvs: { status: 'unknown', message: '', count: 0 }
    }
  };

  try {
    // Test database connection
    try {
      await connectDB();
      healthCheck.checks.database = { 
        status: 'healthy', 
        message: 'Database connection successful' 
      };
    } catch (dbError) {
      healthCheck.checks.database = { 
        status: 'unhealthy', 
        message: `Database connection failed: ${dbError.message}` 
      };
      healthCheck.status = 'unhealthy';
    }

    // Test template service
    try {
      const templates = await AdminTemplateService.getAllTemplates();
      healthCheck.checks.templates = { 
        status: 'healthy', 
        message: 'Template service working', 
        count: templates.length 
      };
    } catch (templateError) {
      healthCheck.checks.templates = { 
        status: 'unhealthy', 
        message: `Template service failed: ${templateError.message}`,
        count: 0
      };
      healthCheck.status = 'unhealthy';
    }

    // Test user model
    try {
      const userCount = await User.countDocuments();
      healthCheck.checks.users = { 
        status: 'healthy', 
        message: 'User model accessible', 
        count: userCount 
      };
    } catch (userError) {
      healthCheck.checks.users = { 
        status: 'unhealthy', 
        message: `User model failed: ${userError.message}`,
        count: 0
      };
      healthCheck.status = 'unhealthy';
    }

    // Test CV model
    try {
      const cvCount = await CV.countDocuments();
      healthCheck.checks.cvs = { 
        status: 'healthy', 
        message: 'CV model accessible', 
        count: cvCount 
      };
    } catch (cvError) {
      healthCheck.checks.cvs = { 
        status: 'unhealthy', 
        message: `CV model failed: ${cvError.message}`,
        count: 0
      };
      healthCheck.status = 'unhealthy';
    }

    return NextResponse.json(healthCheck, { 
      status: healthCheck.status === 'healthy' ? 200 : 503 
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: healthCheck.checks
    }, { status: 503 });
  }
}