import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import AdminAuditLog from '@/models/AdminAuditLog';
import {
  VALID_SOURCES,
  SOURCE_REGISTRY,
  checkSourceConfig,
  createRun,
  executeSourceRun,
  completeRun,
} from '@/lib/ingestion/engine';

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

    const jobsColl = db.collection('jobs');
    const sourcesColl = db.collection('jobSources');
    const runsColl = db.collection('ingestionRuns');
    const eventsColl = db.collection('jobEvents');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Overview KPIs
    if (view === 'overview') {
      const [
        totalActive,
        totalStale,
        totalExpired,
        newToday,
        updatedToday,
        recentRuns,
        sourcesList,
        totalJobs,
        duplicateEvents,
      ] = await Promise.all([
        jobsColl.countDocuments({ status: 'active' }),
        jobsColl.countDocuments({ status: 'stale' }),
        jobsColl.countDocuments({ status: 'expired' }),
        jobsColl.countDocuments({ status: 'active', createdAt: { $gte: startOfToday } }),
        jobsColl.countDocuments({ updatedAt: { $gte: startOfToday } }),
        runsColl.find().sort({ startedAt: -1 }).limit(10).toArray(),
        sourcesColl.find().toArray(),
        jobsColl.countDocuments(),
        eventsColl.countDocuments({ type: 'duplicate', createdAt: { $gte: last7d } }),
      ]);

      const successfulRuns = recentRuns.filter((r) => r.status === 'completed').length;
      const successRate = recentRuns.length > 0 ? Math.round((successfulRuns / recentRuns.length) * 100) : 100;
      const avgDurationMs =
        recentRuns.length > 0
          ? Math.round(recentRuns.reduce((acc, r) => acc + (r.durationMs || 0), 0) / recentRuns.length)
          : 0;
      const duplicateRate = totalJobs > 0 ? Math.round((duplicateEvents / totalJobs) * 1000) / 10 : 0;

      return NextResponse.json({
        kpis: {
          totalActiveJobs: totalActive,
          totalStaleJobs: totalStale,
          totalExpiredJobs: totalExpired,
          newToday,
          updatedToday,
          activeSources: sourcesList.filter((s) => s.enabled !== false).length,
          totalSources: Math.max(sourcesList.length, Object.keys(SOURCE_REGISTRY).length),
          ingestionSuccessRate: successRate,
          avgIngestionLatencyMs: avgDurationMs,
          duplicateRate,
          failedRunsCount: recentRuns.filter((r) => r.status === 'failed').length,
        },
        recentRuns,
        sources: sourcesList,
      });
    }

    // 2. Sources Management View
    if (view === 'sources') {
      const sources = await sourcesColl.find().sort({ priority: -1 }).toArray();
      return NextResponse.json({ sources });
    }

    // 3. Ingestion Runs History View
    if (view === 'runs') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const skip = (page - 1) * limit;

      const [runs, total] = await Promise.all([
        runsColl.find().sort({ startedAt: -1 }).skip(skip).limit(limit).toArray(),
        runsColl.countDocuments(),
      ]);

      return NextResponse.json({
        runs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // 4. Live Jobs Browser
    if (view === 'jobs') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '25', 10);
      const query = searchParams.get('q') || '';
      const statusFilter = searchParams.get('status') || 'active';
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (statusFilter && statusFilter !== 'all') {
        filter.$or = [
          { status: statusFilter },
          { status: { $exists: false } },
        ];
      }
      if (query) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { 'company.name': { $regex: query, $options: 'i' } },
            { company: { $regex: query, $options: 'i' } },
            { 'location.city': { $regex: query, $options: 'i' } },
            { location: { $regex: query, $options: 'i' } },
            { skills: { $regex: query, $options: 'i' } },
            { keywords: { $regex: query, $options: 'i' } },
          ],
        });
      }

      const [jobs, total] = await Promise.all([
        jobsColl.find(filter).sort({ postedAt: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
        jobsColl.countDocuments(filter),
      ]);

      const normalizedJobs = jobs.map((job: any) => ({
        ...job,
        source: typeof job.source === 'string'
          ? { primary: job.source, sourceUrl: job.applyUrl || '' }
          : job.source,
        company: typeof job.company === 'string'
          ? { name: job.company }
          : job.company,
        location: typeof job.location === 'string'
          ? { city: job.location, country: job.country || '' }
          : job.location,
      }));

      return NextResponse.json({
        jobs: normalizedJobs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // 5. Supply Analytics Aggregations
    if (view === 'analytics') {
      const [byCountry, bySeniority, byRemote, topSkills] = await Promise.all([
        jobsColl
          .aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$location.country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
          ])
          .toArray(),
        jobsColl
          .aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$experience.level', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray(),
        jobsColl
          .aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$location.remoteType', count: { $sum: 1 } } },
          ])
          .toArray(),
        jobsColl
          .aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$skills' },
            { $group: { _id: '$skills', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 12 },
          ])
          .toArray(),
      ]);

      return NextResponse.json({
        byCountry,
        bySeniority,
        byRemote,
        topSkills,
      });
    }

    return NextResponse.json({ error: 'Invalid view requested' }, { status: 400 });
  } catch (err: any) {
    console.error('Job Intelligence Admin API Error:', err);
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
    const { action, sourceName, sourceConfig } = body;

    const sourcesColl = db.collection('jobSources');

    // 1. Trigger manual run — job-intelligence OWNS run creation
    if (action === 'trigger_run') {
      if (!VALID_SOURCES.includes(sourceName)) {
        return NextResponse.json({
          success: false,
          error: `Source "${sourceName}" is not implemented. Available sources: ${VALID_SOURCES.join(', ')}`,
        }, { status: 400 });
      }

      // Prevent duplicate runs for the same source
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

      // Create the run record — this is the ONE place runs are created for UI triggers
      const { runId } = await createRun(db, sourceName);

      // Execute ingestion in background (fire and forget)
      const controller = new AbortController();
      executeSourceRun(db, sourceName, runId, controller.signal)
        .then(async (result) => {
          const status = result.status === 'completed' ? 'completed' : 'failed';
          await completeRun(db, runId, status, result, { [sourceName]: result });
        })
        .catch(async (err) => {
          console.error(`[INGEST:ERROR] ${sourceName} failed:`, err);
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
        action: 'TRIGGER_INGESTION_RUN',
        category: 'job_intelligence',
        targetResource: 'jobSource',
        resourceId: sourceName,
        metadata: { runId, triggeredInProcess: true },
      });

      return NextResponse.json({
        success: true,
        message: `Ingestion run triggered for ${sourceName}`,
        runId,
      });
    }

    // 2. Update Source Configuration
    if (action === 'update_source') {
      if (!sourceName) {
        return NextResponse.json({ success: false, error: 'sourceName is required' }, { status: 400 });
      }

      const previous = await sourcesColl.findOne({ name: sourceName });

      await sourcesColl.updateOne(
        { name: sourceName },
        {
          $set: {
            name: sourceName,
            displayName: SOURCE_REGISTRY[sourceName]?.name || sourceName,
            type: SOURCE_REGISTRY[sourceName]?.type || 'api',
            ...sourceConfig,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      await AdminAuditLog.create({
        adminEmail: user.email || 'admin@buildairesume.com',
        adminId: user.id,
        action: 'UPDATE_JOB_SOURCE_CONFIG',
        category: 'job_intelligence',
        targetResource: 'jobSource',
        resourceId: sourceName,
        previousState: previous || {},
        newState: sourceConfig,
      });

      return NextResponse.json({ success: true, message: `Source [${sourceName}] updated successfully` });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Job Intelligence Admin POST Action Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
