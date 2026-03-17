import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { processApplicationQueue, checkUserQuota, getApplicationStats, addToApplicationHistory, getApplicationHistory } from '@/lib/services/autoapply-processor';

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    let userId = headersList.get('x-user-id');
    
    // If no user ID, use a temp one for demo
    if (!userId || userId === 'temp-user-id') {
      userId = 'demo-user-' + Date.now();
    }

    const body = await request.json();
    const { action, applicationId, jobData } = body;

    switch (action) {
      case 'process':
        // Process one application from the queue
        const result = await processApplicationQueue(userId);
        return NextResponse.json(result);

      case 'add':
        // Add a new application to the queue
        if (!jobData) {
          return NextResponse.json(
            { error: 'Job data required' },
            { status: 400 }
          );
        }
        
        const { addToApplicationQueue } = await import('@/lib/services/autoapply-processor');
        const queued = await addToApplicationQueue({
          userId,
          ...jobData,
          status: 'queued',
          scheduledFor: new Date()
        });
        
        return NextResponse.json({ success: true, application: queued });

      case 'status':
        // Get current quota status
        let quotaStatus;
        try {
          quotaStatus = await checkUserQuota(userId);
        } catch {
          quotaStatus = {
            canApply: true,
            remaining: { hourly: 50, daily: 100 },
            nextAvailable: null
          };
        }
        
        let stats;
        try {
          stats = await getApplicationStats(userId);
        } catch {
          stats = {
            total: 0,
            applied: 0,
            pending: 0,
            interview: 0,
            rejected: 0,
            offer: 0,
            successRate: 0,
            applicationsToday: 0,
            applicationsThisWeek: 0,
            applicationsThisMonth: 0
          };
        }
        
        return NextResponse.json({
          quota: quotaStatus,
          stats
        });

      case 'history':
        // Get application history
        const { status, limit, skip } = body;
        let history;
        try {
          history = await getApplicationHistory(userId, { status, limit, skip });
        } catch {
          history = { applications: [], total: 0 };
        }
        
        return NextResponse.json(history);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    let userId = headersList.get('x-user-id');
    
    // If no user ID, use a temp one for demo
    if (!userId || userId === 'temp-user-id') {
      userId = 'demo-user-' + Date.now();
    }

    // Return current quota status and stats
    let quotaStatus;
    try {
      quotaStatus = await checkUserQuota(userId);
    } catch {
      quotaStatus = {
        canApply: true,
        remaining: { hourly: 50, daily: 100 },
        nextAvailable: null
      };
    }
    
    let stats;
    try {
      stats = await getApplicationStats(userId);
    } catch {
      stats = {
        total: 0,
        applied: 0,
        pending: 0,
        interview: 0,
        rejected: 0,
        offer: 0,
        successRate: 0,
        applicationsToday: 0,
        applicationsThisWeek: 0,
        applicationsThisMonth: 0
      };
    }
    
    return NextResponse.json({
      quota: quotaStatus,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching application status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
