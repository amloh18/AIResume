/**
 * /api/admin/linkedin-session — LinkedIn Session Status
 *
 * GET — Lightweight check of LinkedIn browser session state.
 *       Does NOT launch a browser. Checks profile directory and last run status.
 *
 * Returns:
 *   status: 'NOT_CONFIGURED' | 'PROFILE_MISSING' | 'PROFILE_EMPTY' | 'PROFILE_EXISTS' | 'SESSION_UNKNOWN'
 *   enabled: boolean
 *   profileDir: string
 *   profileExists: boolean
 *   profileHasData: boolean
 *   lastRunStatus: string | null
 *   lastError: string | null
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { getSourceEnabled } from '@/lib/ingestion/engine';
import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_req: NextRequest) => {
  try {
    const enabled = getSourceEnabled('linkedin');
    const profileDir = process.env.LINKEDIN_BROWSER_PROFILE_DIR ||
      '/var/lib/buildairesume/browser-profiles/linkedin';

    let profileExists = false;
    let profileHasData = false;

    try {
      const stat = fs.statSync(profileDir);
      profileExists = stat.isDirectory();

      if (profileExists) {
        // Check for Chromium profile indicators
        const indicators = ['Cookies', 'Cookies-journal', 'Local State', 'Default'];
        profileHasData = indicators.some((f) => {
          try {
            fs.accessSync(path.join(profileDir, f));
            return true;
          } catch {
            return false;
          }
        });
      }
    } catch {
      // Directory doesn't exist
    }

    // Determine session status
    let status: string;
    if (!enabled) {
      status = 'NOT_CONFIGURED';
    } else if (!profileExists) {
      status = 'PROFILE_MISSING';
    } else if (!profileHasData) {
      status = 'PROFILE_EMPTY';
    } else {
      status = 'PROFILE_EXISTS';
    }

    // Check last run status from MongoDB
    let lastRunStatus: string | null = null;
    let lastError: string | null = null;

    try {
      await getConnection();
      const db = mongoose.connection.db!;
      const sourcesColl = db.collection('jobSources');
      const linkedinSource = await sourcesColl.findOne({ name: 'linkedin' });

      if (linkedinSource?.status) {
        lastRunStatus = linkedinSource.status.health || null;
        lastError = linkedinSource.status.lastErrorMessage || null;

        // If last run succeeded, upgrade status
        if (linkedinSource.status.lastSuccessAt && status === 'PROFILE_EXISTS') {
          status = 'SESSION_OK';
        }
        // If last run had auth error, downgrade status
        if (lastError?.includes('AUTH_REQUIRED') || lastError?.includes('login')) {
          status = 'NEEDS_REAUTH';
        }
        if (lastError?.includes('BLOCKED')) {
          status = 'BLOCKED';
        }
        if (lastError?.includes('CHALLENGE') || lastError?.includes('CAPTCHA')) {
          status = 'CHALLENGE';
        }
      }
    } catch {
      // DB not available — ignore
    }

    return NextResponse.json({
      status,
      enabled,
      profileDir,
      profileExists,
      profileHasData,
      lastRunStatus,
      lastError,
      instructions: getInstructions(status),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

function getInstructions(status: string): string | null {
  switch (status) {
    case 'NOT_CONFIGURED':
      return 'Set LINKEDIN_ENABLED=true in environment variables, then enable LinkedIn in Worker Settings.';
    case 'PROFILE_MISSING':
      return 'Run: ssh into VPS, then: mkdir -p /var/lib/buildairesume/browser-profiles/linkedin && chmod 700 /var/lib/buildairesume/browser-profiles/linkedin';
    case 'PROFILE_EMPTY':
      return 'Run login_linkedin.py on the VPS to create an authenticated session. See scripts/linkedin-worker/README.md';
    case 'NEEDS_REAUTH':
      return 'LinkedIn session expired. Run login_linkedin.py again to re-authenticate.';
    case 'BLOCKED':
      return 'LinkedIn has restricted access. Check the browser profile on the VPS.';
    case 'CHALLENGE':
      return 'LinkedIn is presenting a CAPTCHA/challenge. Manually resolve it via the VPS browser profile.';
    default:
      return null;
  }
}
