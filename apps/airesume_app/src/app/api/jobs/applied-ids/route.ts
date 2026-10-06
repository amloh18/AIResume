import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    const jobsColl = db.collection('jobs');
    const applicationsColl = db.collection('applications');

    // Collect job IDs from two sources:
    // 1. Jobs collection — jobs with applied-like status
    const appliedStatuses = ['applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'];
    const appliedJobs = await jobsColl
      .find(
        { userId: auth.userId, status: { $in: appliedStatuses } },
        { projection: { _id: 1, jobId: 1, title: 1, company: 1 } }
      )
      .toArray();

    // 2. Applications collection — queued/processing jobs (auto-apply pipeline)
    const queuedStatuses = ['queued', 'processing'];
    const queuedApps = await applicationsColl
      .find(
        { userId: auth.userId, status: { $in: queuedStatuses } },
        { projection: { _id: 1, jobId: 1, title: 1, company: 1 } }
      )
      .toArray();

    const appliedIds = new Set<string>();
    const appliedMap: Record<string, { title: string; company: string; status: string }> = {};

    for (const job of appliedJobs) {
      const id = String(job._id);
      appliedIds.add(id);
      if (job.jobId) appliedIds.add(String(job.jobId));
      appliedMap[id] = { title: job.title || '', company: job.company || '', status: 'applied' };
    }

    for (const app of queuedApps) {
      const id = String(app._id);
      appliedIds.add(id);
      if (app.jobId) appliedIds.add(String(app.jobId));
      if (!appliedMap[id]) {
        appliedMap[id] = { title: app.title || '', company: app.company || '', status: 'queued' };
      }
    }

    return NextResponse.json({
      success: true,
      appliedIds: Array.from(appliedIds),
      appliedMap,
    });
  } catch (error: any) {
    console.error('❌ Applied IDs error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch applied IDs' },
      { status: 500 }
    );
  }
}
