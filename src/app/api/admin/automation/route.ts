import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'overview';

    const queueColl = db.collection('applicationqueues');
    const historyColl = db.collection('applicationhistories');
    const appColl = db.collection('applications');
    const userQuotasColl = db.collection('userquotas');
    const adminRulesColl = db.collection('admin_rules');
    const portalSyncColl = db.collection('portaljobsynctasks');

    if (view === 'overview') {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        queueByStatus,
        historyByStatus,
        recentAttempts,
        recentSuccesses,
        recentFailures,
        activeWorkers,
        enabledUsers,
        adminRules,
        stuckInQueue,
      ] = await Promise.all([
        // Queue depth by status
        queueColl.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]).toArray(),

        // Application history by status
        historyColl.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]).toArray(),

        // Attempts in last 24h
        historyColl.countDocuments({ appliedAt: { $gte: last24h } }),

        // Successes in last 24h (status = applied)
        historyColl.countDocuments({ appliedAt: { $gte: last24h }, status: 'applied' }),

        // Failures in last 24h
        historyColl.countDocuments({ appliedAt: { $gte: last24h }, status: 'failed' }),

        // Active workers (items currently processing/locked)
        queueColl.aggregate([
          { $match: { status: 'processing' } },
          { $group: { _id: '$lockedBy', count: { $sum: 1 }, oldest: { $min: '$lockedAt' } } },
        ]).toArray(),

        // Users with auto-apply enabled
        userQuotasColl.countDocuments({ autoApplyEnabled: true }),

        // Global admin rules (kill switch)
        adminRulesColl.findOne({}),

        // Items stuck in queue (processing for > 10 min)
        queueColl.countDocuments({
          status: 'processing',
          lockedAt: { $lt: new Date(now.getTime() - 10 * 60 * 1000) },
        }),
      ]);

      const queueMap = Object.fromEntries(queueByStatus.map((s: any) => [s._id, s.count]));
      const historyMap = Object.fromEntries(historyByStatus.map((s: any) => [s._id, s.count]));

      const totalHistory = Object.values(historyMap).reduce((a: number, b: any) => a + b, 0) as number;
      const successRate = totalHistory > 0
        ? Math.round(((historyMap['applied'] || 0) / totalHistory) * 100)
        : 0;

      return NextResponse.json({
        queue: {
          pending: queueMap['queued'] || 0,
          processing: queueMap['processing'] || 0,
          completed: queueMap['completed'] || 0,
          failed: queueMap['failed'] || 0,
          deadLetter: queueMap['dead_letter'] || 0,
          stuck: stuckInQueue,
        },
        history: {
          total: totalHistory,
          applied: historyMap['applied'] || 0,
          failed: historyMap['failed'] || 0,
          viewed: historyMap['viewed'] || 0,
          interview: historyMap['interview'] || 0,
          offer: historyMap['offer'] || 0,
          rejected: historyMap['rejected'] || 0,
          successRate,
        },
        last24h: {
          attempts: recentAttempts,
          successes: recentSuccesses,
          failures: recentFailures,
        },
        workers: activeWorkers.map((w: any) => ({
          id: w._id || 'unknown',
          activeItems: w.count,
          oldestTask: w.oldest,
        })),
        config: {
          globalEnabled: adminRules?.globalAutoApplyEnabled ?? true,
          maxPerUserPerDay: adminRules?.maxAppliesPerUserPerDay ?? 20,
          monthlyCostCap: adminRules?.monthlyCostCap ?? 5000,
          enabledUsers,
        },
      });
    }

    if (view === 'review') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const skip = (page - 1) * limit;

      // Failed applications that need review
      const [items, total] = await Promise.all([
        queueColl
          .find({ status: { $in: ['failed', 'dead_letter'] } })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        queueColl.countDocuments({ status: { $in: ['failed', 'dead_letter'] } }),
      ]);

      // Enrich with application history context
      const enriched = await Promise.all(
        items.map(async (item: any) => {
          const history = await historyColl.findOne({ jobId: item.jobId, userId: item.userId });
          return {
            ...item,
            applicationStatus: history?.status || 'unknown',
            matchScore: history?.matchScore,
          };
        })
      );

      return NextResponse.json({
        items: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    if (view === 'runs') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const skip = (page - 1) * limit;

      const [runs, total] = await Promise.all([
        portalSyncColl
          .find()
          .sort({ requestedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        portalSyncColl.countDocuments(),
      ]);

      return NextResponse.json({
        runs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    return NextResponse.json({ error: 'Invalid view requested' }, { status: 400 });
  } catch (err: any) {
    console.error('Automation Admin API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    const adminRulesColl = db.collection('admin_rules');

    if (action === 'toggle_global') {
      const { enabled } = body;
      const current = await adminRulesColl.findOne({});
      const previousEnabled = current?.globalAutoApplyEnabled ?? true;

      await adminRulesColl.updateOne(
        {},
        { $set: { globalAutoApplyEnabled: enabled, updatedAt: new Date() } },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        globalAutoApplyEnabled: enabled,
        message: `Auto-apply globally ${enabled ? 'enabled' : 'disabled'}`,
      });
    }

    if (action === 'dismiss_failed') {
      const { queueId } = body;
      const queueColl = db.collection('applicationqueues');

      await queueColl.updateOne(
        { _id: new mongoose.Types.ObjectId(queueId) },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: 'Failed application dismissed' });
    }

    if (action === 'retry_failed') {
      const { queueId } = body;
      const queueColl = db.collection('applicationqueues');

      await queueColl.updateOne(
        { _id: new mongoose.Types.ObjectId(queueId) },
        { $set: { status: 'queued', lockedAt: null, lockedBy: null, scheduledAt: new Date(), updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: 'Application requeued for retry' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Automation Admin POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
