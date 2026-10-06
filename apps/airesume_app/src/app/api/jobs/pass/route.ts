import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

/**
 * POST /api/jobs/pass
 * Save a job as "passed" for the current user so it never reappears in discovery.
 * Body: { jobId: string } — the job's _id from the jobs collection.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body as { jobId?: string };

    if (!jobId) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'jobId required' } }, { status: 400 });
    }

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    let jobObjectId: ObjectId;
    try {
      jobObjectId = new ObjectId(jobId);
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid jobId format' } }, { status: 400 });
    }

    // Look up the job to get its externalId for dedup across discovery refreshes
    const job = await db.collection('jobs').findOne({ _id: jobObjectId });
    const externalId = (job as any)?.externalId || jobId;

    const collection = db.collection('passed_jobs');
    await collection.updateOne(
      { userId: new ObjectId(auth.userId), externalId },
      {
        $setOnInsert: {
          userId: new ObjectId(auth.userId),
          externalId,
          jobId: jobObjectId,
          passedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] POST /api/jobs/pass error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to pass job' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/pass
 * Un-pass a job (undo pass).
 * Body: { jobId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body as { jobId?: string };

    if (!jobId) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'jobId required' } }, { status: 400 });
    }

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const collection = db.collection('passed_jobs');
    await collection.deleteOne({ userId: new ObjectId(auth.userId), externalId: jobId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/jobs/pass error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to unpass job' } },
      { status: 500 }
    );
  }
}
