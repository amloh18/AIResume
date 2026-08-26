/**
 * /api/admin/ingest — Direct ingestion API
 *
 * Used for:
 * - Manual/direct ingestion via API call
 * - Multi-source batch runs
 *
 * For UI-triggered single-source runs, job-intelligence/route.ts creates
 * the run and calls executeSourceRun directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import {
  VALID_SOURCES,
  checkSourceConfig,
  createRun,
  executeSourceRun,
  completeRun,
  killJobSpyProcesses,
} from '@/lib/ingestion/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const sourceName = body.source as string | undefined;
    const providedRunId = body.runId as string | undefined;
    const sourcesToRun = sourceName ? [sourceName] : VALID_SOURCES;

    // Validate all requested sources upfront
    for (const src of sourcesToRun) {
      if (!VALID_SOURCES.includes(src)) {
        return NextResponse.json({
          error: `Unknown source: ${src}`,
          availableSources: VALID_SOURCES,
        }, { status: 400 });
      }
    }

    // If a runId is provided, NEVER create another run — use the existing one.
    // If absent, create a new run for this ingestion.
    const { runId, created } = await createRun(db, sourceName || 'all', providedRunId);

    // Execute sources sequentially (each source is isolated)
    const controller = new AbortController();
    const sourceResults: Record<string, any> = {};
    const overallMetrics = {
      status: 'running' as const,
      fetched: 0,
      normalized: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
    };

    // Check for cancellation every 5 seconds
    const runsColl = db.collection('ingestionRuns');
    const cancelCheck = setInterval(async () => {
      const run = await runsColl.findOne({ runId });
      if (run?.status === 'cancelled' || run?.status === 'cancelling') {
        controller.abort();
        clearInterval(cancelCheck);
      }
    }, 5000);

    for (const src of sourcesToRun) {
      if (controller.signal.aborted) {
        sourceResults[src] = { status: 'cancelled' };
        continue;
      }

      const result = await executeSourceRun(db, src, runId, controller.signal);
      sourceResults[src] = result;

      // Accumulate metrics
      overallMetrics.fetched += result.fetched;
      overallMetrics.normalized += result.normalized;
      overallMetrics.inserted += result.inserted;
      overallMetrics.updated += result.updated;
      overallMetrics.duplicates += result.duplicates;
      if (result.status === 'failed') overallMetrics.errors++;
    }

    clearInterval(cancelCheck);

    // Determine final status
    const hasErrors = Object.values(sourceResults).some((r: any) => r.status === 'failed');
    const allCancelled = Object.values(sourceResults).every((r: any) => r.status === 'cancelled');
    let finalStatus: string;
    if (allCancelled) finalStatus = 'cancelled';
    else if (hasErrors) finalStatus = 'completed_with_errors';
    else finalStatus = 'completed';

    overallMetrics.status = finalStatus as any;

    await completeRun(db, runId, finalStatus as any, overallMetrics as any, sourceResults);

    return NextResponse.json({
      success: true,
      runId,
      status: finalStatus,
      results: Object.fromEntries(
        Object.entries(sourceResults).map(([src, r]: [string, any]) => [
          src,
          r.status === 'completed'
            ? { fetched: r.fetched, inserted: r.inserted, updated: r.updated, durationMs: r.durationMs }
            : { status: r.status, error: r.error },
        ])
      ),
    });
  } catch (err: any) {
    console.error('[INGEST:ERROR] Ingestion error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });

    const sourcesColl = db.collection('jobSources');
    const sources = await sourcesColl.find({}).sort({ name: 1 }).toArray();

    // Check config status for each source
    const configStatus: Record<string, any> = {};
    for (const src of VALID_SOURCES) {
      configStatus[src] = checkSourceConfig(src);
    }

    return NextResponse.json({
      availableSources: VALID_SOURCES,
      configuredSources: sources,
      configStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const { action, runId, source } = body;

    const runsColl = db.collection('ingestionRuns');

    if (action === 'cancel') {
      const filter: any = { status: 'running' };
      if (runId) filter.runId = runId;
      else if (source) filter.source = source;
      else return NextResponse.json({ error: 'runId or source required' }, { status: 400 });

      const result = await runsColl.updateMany(
        filter,
        { $set: { status: 'cancelled', finishedAt: new Date(), cancelledBy: 'admin' } }
      );

      // Kill active JobSpy processes
      if (source === 'jobspy' || !source) {
        killJobSpyProcesses();
      }

      return NextResponse.json({
        success: true,
        cancelled: result.modifiedCount,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
