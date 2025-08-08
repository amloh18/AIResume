import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get database status
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[dbStatus] || 'unknown';

    // Mock system health data (in production, you'd get this from actual system monitoring)
    const systemHealth = {
      database: {
        status: dbStatusText === 'connected' ? 'healthy' : 'error',
        responseTime: Math.floor(Math.random() * 100) + 20, // Mock response time
        connections: mongoose.connection.db?.admin() ? 12 : 0, // Mock connection count
        uptime: '15 days, 3 hours'
      },
      api: {
        status: 'healthy',
        responseTime: Math.floor(Math.random() * 200) + 50,
        requestsPerMinute: Math.floor(Math.random() * 100) + 20,
        errorRate: Math.random() * 2 // 0-2% error rate
      },
      storage: {
        status: 'healthy',
        used: 45.2,
        total: 100,
        percentage: 45.2
      },
      memory: {
        status: 'healthy',
        used: 2.1,
        total: 8,
        percentage: 26.25
      },
      uptime: '15 days, 3 hours, 27 minutes',
      lastCheck: new Date().toISOString()
    };

    return NextResponse.json(systemHealth);
  } catch (error) {
    console.error('Error fetching system health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system health' },
      { status: 500 }
    );
  }
} 