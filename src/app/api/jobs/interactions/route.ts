/**
 * POST /api/jobs/interactions
 *
 * Record a user interaction with an ingested job (save, apply, dismiss, view).
 *
 * Body: { jobId: string, action: 'save' | 'unsave' | 'apply' | 'dismiss' | 'undismiss' | 'view' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

const VALID_ACTIONS = ['save', 'unsave', 'apply', 'dismiss', 'undismiss', 'view'] as const;
type Action = typeof VALID_ACTIONS[number];

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, action } = body as { jobId: string; action: Action };

    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = new ObjectId(auth.userId);
    const jobObjectId = new ObjectId(jobId);
    const now = new Date();

    switch (action) {
      case 'save': {
        // Update job status to 'saved' and record interaction
        await db.collection('jobs').updateOne(
          { _id: jobObjectId },
          { $set: { status: 'saved', updatedAt: now } }
        );
        await db.collection('jobInteractions').updateOne(
          { userId, jobId: jobObjectId },
          { $set: { userId, jobId: jobObjectId, action: 'saved', updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
        break;
      }

      case 'unsave': {
        await db.collection('jobs').updateOne(
          { _id: jobObjectId, status: 'saved' },
          { $set: { status: 'active', updatedAt: now } }
        );
        await db.collection('jobInteractions').updateOne(
          { userId, jobId: jobObjectId },
          { $set: { action: 'active', updatedAt: now } }
        );
        break;
      }

      case 'apply': {
        // Check if already applied
        const existingApp = await db.collection('applications').findOne({
          userId,
          jobId: jobObjectId,
        });
        if (existingApp) {
          return NextResponse.json({ error: 'Already applied', applicationId: existingApp._id }, { status: 409 });
        }

        // Create application record
        const appResult = await db.collection('applications').insertOne({
          userId,
          jobId: jobObjectId,
          currentStage: 'staging',
          applicationMethod: 'manual',
          matchScore: null,
          tags: [],
          createdAt: now,
          updatedAt: now,
        });

        await db.collection('jobInteractions').updateOne(
          { userId, jobId: jobObjectId },
          { $set: { action: 'applied', applicationId: appResult.insertedId, updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
        break;
      }

      case 'dismiss': {
        await db.collection('passed_jobs').updateOne(
          { userId, jobId: jobObjectId },
          { $set: { userId, jobId: jobObjectId, externalId: jobId, passedAt: now } },
          { upsert: true }
        );
        await db.collection('jobInteractions').updateOne(
          { userId, jobId: jobObjectId },
          { $set: { action: 'dismissed', updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
        break;
      }

      case 'undismiss': {
        await db.collection('passed_jobs').deleteOne({ userId, jobId: jobObjectId });
        await db.collection('jobInteractions').updateOne(
          { userId, jobId: jobObjectId },
          { $set: { action: 'active', updatedAt: now } }
        );
        break;
      }

      case 'view': {
        await db.collection('jobInteractions').updateOne(
          { userId, jobId: jobObjectId },
          {
            $set: { lastViewedAt: now, updatedAt: now },
            $inc: { viewCount: 1 },
            $setOnInsert: { userId, jobId: jobObjectId, action: 'viewed', createdAt: now },
          },
          { upsert: true }
        );
        break;
      }
    }

    return NextResponse.json({ success: true, action, jobId });
  } catch (err: any) {
    console.error('[API] /api/jobs/interactions error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/interactions?jobId=xxx
 * GET /api/jobs/interactions?jobIds=id1,id2,id3
 *
 * Return interaction status for one or more jobs.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ interactions: {} });
    }

    const sp = request.nextUrl.searchParams;
    const jobId = sp.get('jobId');
    const jobIdsParam = sp.get('jobIds');

    const db = await getDb();
    const userId = new ObjectId(auth.userId);

    let query: any = { userId };
    if (jobId && ObjectId.isValid(jobId)) {
      query.jobId = new ObjectId(jobId);
    } else if (jobIdsParam) {
      const ids = jobIdsParam.split(',').filter(ObjectId.isValid).map((id) => new ObjectId(id));
      query.jobId = { $in: ids };
    } else {
      return NextResponse.json({ error: 'Provide jobId or jobIds' }, { status: 400 });
    }

    const docs = await db.collection('jobInteractions').find(query).toArray();

    const interactions: Record<string, any> = {};
    for (const doc of docs) {
      const jid = doc.jobId?.toString();
      if (jid) {
        interactions[jid] = {
          action: doc.action,
          viewCount: doc.viewCount || 0,
          lastViewedAt: doc.lastViewedAt,
          updatedAt: doc.updatedAt,
        };
      }
    }

    return NextResponse.json({ interactions });
  } catch (err: any) {
    console.error('[API] GET /api/jobs/interactions error:', err);
    return NextResponse.json({ interactions: {} });
  }
}
