/**
 * /api/admin/worker-settings — Ingestion Worker Configuration API
 *
 * GET  — Read current settings (with defaults)
 * PUT  — Update settings (full replace with deep merge)
 * POST — Reset to defaults
 *
 * Security: Admin-only endpoint via withAdminAuth.
 * Settings are stored in MongoDB and take effect immediately.
 * No redeployment required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import {
  WorkerSettings,
  DEFAULT_INGESTION_SETTINGS,
  invalidateSettingsCache,
} from '@/models/WorkerSettings';

export const dynamic = 'force-dynamic';

/**
 * GET — Fetch current ingestion settings
 */
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const doc = await WorkerSettings.findOne({ namespace: 'ingestion' }).lean();
    const settings = doc?.settings || DEFAULT_INGESTION_SETTINGS;
    const updatedAt = doc?.updatedAt || null;
    const updatedBy = doc?.updatedBy || null;

    console.log('[WorkerSettings:GET]', { found: !!doc, hasSettings: !!doc?.settings });

    return NextResponse.json({
      success: true,
      settings,
      meta: {
        updatedAt,
        updatedBy,
        isCustom: !!doc,
      },
    });
  } catch (err: any) {
    console.error('[WorkerSettings:GET] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

/**
 * PUT — Update ingestion settings (full replace — frontend sends complete settings)
 */
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { settings: newSettings } = body;

    if (!newSettings || typeof newSettings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }

    // Merge with defaults to ensure all fields exist
    const merged = deepMerge(DEFAULT_INGESTION_SETTINGS, newSettings);

    // Validate critical ranges
    if (merged.linkedin.maxSearchesPerRun < 1 || merged.linkedin.maxSearchesPerRun > 50) {
      return NextResponse.json({ error: 'LinkedIn maxSearchesPerRun must be 1-50' }, { status: 400 });
    }
    if (merged.linkedin.maxRuntimeSeconds < 60 || merged.linkedin.maxRuntimeSeconds > 3600) {
      return NextResponse.json({ error: 'LinkedIn maxRuntimeSeconds must be 60-3600' }, { status: 400 });
    }
    if (merged.jobspy.resultsWanted < 1 || merged.jobspy.resultsWanted > 500) {
      return NextResponse.json({ error: 'JobSpy resultsWanted must be 1-500' }, { status: 400 });
    }
    if (merged.concurrency < 1 || merged.concurrency > 10) {
      return NextResponse.json({ error: 'Concurrency must be 1-10' }, { status: 400 });
    }

    // Save to DB using replaceOne for Mixed schema reliability
    const now = new Date();
    const result = await WorkerSettings.findOneAndUpdate(
      { namespace: 'ingestion' },
      {
        $set: {
          settings: merged,
          updatedAt: now,
        },
        $setOnInsert: {
          namespace: 'ingestion',
          createdAt: now,
        },
      },
      { upsert: true, new: true },
    ).lean();

    console.log('[WorkerSettings:PUT] Saved:', {
      found: !!result,
      settingsKeys: result?.settings ? Object.keys(result.settings) : [],
    });

    // Invalidate in-memory cache
    invalidateSettingsCache();

    return NextResponse.json({
      success: true,
      settings: result?.settings || merged,
      meta: {
        updatedAt: now,
        isCustom: true,
      },
      message: 'Settings updated. Changes take effect immediately for new ingestion runs.',
    });
  } catch (err: any) {
    console.error('[WorkerSettings:PUT] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

/**
 * POST — Reset to defaults
 */
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    await WorkerSettings.findOneAndDelete({ namespace: 'ingestion' });
    invalidateSettingsCache();

    return NextResponse.json({
      success: true,
      settings: DEFAULT_INGESTION_SETTINGS,
      message: 'Settings reset to defaults.',
    });
  } catch (err: any) {
    console.error('[WorkerSettings:POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
      targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)
    ) {
      (result as any)[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      (result as any)[key] = sourceVal;
    }
  }
  return result;
}
