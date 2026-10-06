import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { ingestForUser } from '@/services/emailIngestionService';
import { getWorkerPlan, resolveWorkerRole } from '@/workers/roles';
import { getWorkerHealthUrl, probeWorkerHealth } from '@/workers/health';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ingestForUser(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Communications sync POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { getIngestionStatus } = await import('@/services/emailIngestionService');
    const status = getIngestionStatus();

    // The polling loop now lives in the worker service, so local state alone would always report
    // "not running" here. Report which process owns the loop, and ask the worker for its live status
    // when this one does not run it. `remote: null` means "unconfigured or unreachable", never "fine".
    const { role } = resolveWorkerRole();
    const runsInThisProcess = getWorkerPlan(role).emailIngestion;
    const remote = status.isRunning ? null : await probeWorkerHealth(getWorkerHealthUrl());

    return NextResponse.json({
      success: true,
      data: { ...status, workerRole: role, runsInThisProcess, remote },
    });
  } catch (error: any) {
    console.error('Communications sync GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
