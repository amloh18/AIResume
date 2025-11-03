import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    // Test database connection
    const dbStatus = await testDatabaseConnection();
    
    // Mock system health data
    const systemStatus = {
      database: {
        status: dbStatus.healthy ? 'healthy' : 'error',
        responseTime: dbStatus.responseTime,
        connections: 15,
        uptime: '99.9%'
      },
      api: {
        status: 'healthy',
        responseTime: Math.floor(Math.random() * 50) + 100,
        requestsPerMinute: Math.floor(Math.random() * 100) + 50,
        errorRate: 0.1
      },
      storage: {
        status: 'healthy',
        used: 2.5,
        total: 10,
        percentage: 25
      },
      memory: {
        status: 'healthy',
        used: 4.2,
        total: 8,
        percentage: 52.5
      },
      uptime: '99.9%',
      lastCheck: new Date().toISOString()
    };

    // Generate performance data for charts
    const performanceData = [];
    for (let i = 0; i < 24; i++) {
      const time = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
      performanceData.push({
        time: time.toISOString().split('T')[1].substring(0, 5),
        apiResponse: Math.floor(Math.random() * 100) + 50,
        memoryUsage: Math.floor(Math.random() * 20) + 40,
        cpuUsage: Math.floor(Math.random() * 30) + 20,
        requests: Math.floor(Math.random() * 200) + 100
      });
    }

    return NextResponse.json({
      success: true,
      systemStatus,
      performanceData
    });

  } catch (error: any) {
    console.error('Error fetching system health data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system health data', details: error.message },
      { status: 500 }
    );
  }
}

async function testDatabaseConnection() {
  try {
    const startTime = Date.now();
    // Simple database ping
    await getConnection();
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: 0
    };
  }
}
