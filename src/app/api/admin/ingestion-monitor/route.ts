/**
 * /api/admin/ingestion-monitor — Ingestion monitoring API
 *
 * Provides data for the admin dashboard's ingestion monitoring views:
 * - Demand queue (priority segments, their status, freshness)
 * - Source health (per-source metrics, last run, consecutive failures)
 * - Scheduler status (baseline schedule, next eligible runs, lock state)
 *
 * GET ?view=demand    — demand queue segments
 * GET ?view=health    — source health metrics
 * GET ?view=scheduler — scheduler/baseline status
 * GET ?view=overview  — combined overview for dashboard
 *
 * POST action=trigger_demand — manually trigger a demand segment refresh
 * POST action=refresh_health — force refresh source health data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import AdminAuditLog from '@/models/AdminAuditLog';
import { SOURCE_REGISTRY, checkSourceConfig, VALID_SOURCES } from '@/lib/ingestion/engine';
import { DemandTracker } from '@/lib/demand/demandTracker';
import { IngestionScheduler } from '@/lib/ingestion/scheduler';
import { BaselineScheduler } from '@/lib/ingestion/baselineSchedule';
import { IngestionLock } from '@/lib/ingestion/ingestionLock';
import { BackgroundScheduler } from '@/lib/ingestion/backgroundScheduler';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';
  if (!isAdmin) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await getConnection();
    const db = mongoose.connection.db!;
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'overview';

    // ── Demand Queue ──────────────────────────────────────────────────────
    if (view === 'demand') {
      const demandColl = db.collection('jobDemand');
      const segments = await demandColl
        .find()
        .sort({ priority: -1, lastRequestedAt: -1 })
        .limit(50)
        .toArray();

      const stats = await demandColl.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPriority: { $avg: '$priority' },
          },
        },
      ]).toArray();

      const staleCount = await demandColl.countDocuments({
        status: { $in: ['idle', 'stale'] },
        $or: [
          { lastFetchedAt: null },
          { lastFetchedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
        ],
      });

      return NextResponse.json({
        segments,
        stats: stats.reduce((acc: Record<string, any>, s: any) => {
          acc[s._id] = { count: s.count, avgPriority: Math.round(s.avgPriority) };
          return acc;
        }, {}),
        staleCount,
        totalSegments: segments.length,
      });
    }

    // ── Source Health ─────────────────────────────────────────────────────
    if (view === 'health') {
      const [healthStatuses, activeLocks, health] = await Promise.all([
        IngestionScheduler.getSourceHealth(),
        IngestionLock.getActiveCount().catch(() => 0),
        BackgroundScheduler.healthCheck().catch(() => null),
      ]);

      // Enrich with config status
      const enriched = healthStatuses.map((h) => ({
        ...h,
        configStatus: checkSourceConfig(h.source),
        registryDef: SOURCE_REGISTRY[h.source] || null,
        isDue: h.enabled && new Date(h.nextEligibleRun).getTime() <= Date.now(),
      }));

      const healthyCount = enriched.filter((h) => h.healthy).length;
      const configuredCount = enriched.filter((h) => h.configStatus.ready).length;
      const dueCount = enriched.filter((h) => h.isDue).length;

      // Count by health status for the summary
      const statusCounts = enriched.reduce((acc: Record<string, number>, h) => {
        const status = h.healthStatus || (h.healthy ? 'healthy' : 'failed');
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        sources: enriched,
        summary: {
          total: enriched.length,
          healthy: healthyCount,
          unhealthy: enriched.length - healthyCount,
          configured: configuredCount,
          unconfigured: enriched.length - configuredCount,
          due: dueCount,
          statusCounts,
        },
        locks: { active: activeLocks },
        health,
      });
    }

    // ── Scheduler Status ──────────────────────────────────────────────────
    if (view === 'scheduler') {
      const scheduleStatus = await BaselineScheduler.getScheduleStatus();
      const activeLocks = await IngestionLock.getActiveCount();
      const health = await BackgroundScheduler.healthCheck();

      return NextResponse.json({
        schedule: scheduleStatus,
        locks: { active: activeLocks },
        health,
      });
    }

    // ── Overview (combined) ───────────────────────────────────────────────
    if (view === 'overview') {
      const [demandData, healthData, schedulerData] = await Promise.all([
        // Demand summary
        (async () => {
          const demandColl = db.collection('jobDemand');
          const [total, stale, highPriority, fetching] = await Promise.all([
            demandColl.countDocuments(),
            demandColl.countDocuments({
              status: { $in: ['idle', 'stale'] },
              $or: [
                { lastFetchedAt: null },
                { lastFetchedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
              ],
            }),
            demandColl.countDocuments({ priority: { $gte: 70 } }),
            demandColl.countDocuments({ status: 'fetching' }),
          ]);
          return { total, stale, highPriority, fetching };
        })(),
        // Source health summary
        IngestionScheduler.getSourceHealth().then((statuses) => ({
          total: statuses.length,
          healthy: statuses.filter((s) => s.healthy).length,
          unhealthy: statuses.filter((s) => !s.healthy && s.enabled).length,
          configured: statuses.filter((s) => checkSourceConfig(s.source).ready).length,
        })),
        // Scheduler health
        BackgroundScheduler.healthCheck(),
      ]);

      return NextResponse.json({
        demand: demandData,
        sources: healthData,
        scheduler: schedulerData,
      });
    }

    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  } catch (err: any) {
    console.error('Ingestion Monitor Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await getConnection();
    const body = await req.json();
    const { action, segmentId, sourceName } = body;

    // Trigger a specific demand segment refresh
    if (action === 'trigger_demand') {
      if (!segmentId) {
        return NextResponse.json({ error: 'segmentId required' }, { status: 400 });
      }

      const demandColl = mongoose.connection.db!.collection('jobDemand');
      const segment = await demandColl.findOne({ _id: segmentId });
      if (!segment) {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
      }

      // Mark as queued and trigger
      await demandColl.updateOne(
        { _id: segmentId },
        { $set: { status: 'queued', priority: 100 } }
      );

      await AdminAuditLog.create({
        adminEmail: user.email || 'admin@buildairesume.com',
        adminId: user.id,
        action: 'TRIGGER_DEMAND_REFRESH',
        category: 'job_intelligence',
        targetResource: 'jobDemand',
        resourceId: segmentId,
        metadata: { roleFamily: segment.roleFamily, country: segment.country },
      });

      return NextResponse.json({ success: true, message: `Segment ${segmentId} queued for refresh` });
    }

    // Force a source health refresh
    if (action === 'refresh_health') {
      const health = await IngestionScheduler.getSourceHealth();
      return NextResponse.json({ success: true, health });
    }

    // Trigger a specific source run
    // Uses the same run creation pattern as job-intelligence to ensure
    // exactly one canonical runId per ingestion lifecycle.
    if (action === 'trigger_source') {
      if (!sourceName || !VALID_SOURCES.includes(sourceName)) {
        return NextResponse.json({ error: `Invalid source: ${sourceName}` }, { status: 400 });
      }

      const { createRun, executeSourceRun, completeRun } = await import('@/lib/ingestion/engine');
      const db = mongoose.connection.db!;

      // Check if this source already has a running run — prevent duplicate Run Now
      const runsColl = db.collection('ingestionRuns');
      const existingRunning = await runsColl.findOne({
        source: sourceName,
        status: { $in: ['running', 'queued'] },
      });

      if (existingRunning) {
        return NextResponse.json({
          success: false,
          error: `${sourceName} ingestion is already running (runId: ${existingRunning.runId}). Wait for it to finish or cancel it.`,
          runId: existingRunning.runId,
        }, { status: 409 });
      }

      const { runId } = await createRun(db, sourceName);

      // Execute ingestion in background (fire and forget)
      const controller = new AbortController();
      executeSourceRun(db, sourceName, runId, controller.signal)
        .then(async (result) => {
          const status = result.status === 'completed' ? 'completed' : 'failed';
          await completeRun(db, runId, status, result, { [sourceName]: result });
        })
        .catch(async (err) => {
          const failedResult = {
            status: 'failed' as const,
            fetched: 0, normalized: 0, inserted: 0, updated: 0, duplicates: 0, errors: 1,
            error: err.message,
          };
          await completeRun(db, runId, 'failed', failedResult, { [sourceName]: failedResult });
        });

      await AdminAuditLog.create({
        adminEmail: user.email || 'admin@buildairesume.com',
        adminId: user.id,
        action: 'TRIGGER_SOURCE_RUN',
        category: 'job_intelligence',
        targetResource: 'jobSource',
        resourceId: sourceName,
        metadata: { runId },
      });

      return NextResponse.json({ success: true, runId, message: `Run triggered for ${sourceName}` });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Ingestion Monitor POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
