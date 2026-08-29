/**
 * /api/admin/vps-setup — VPS Dependency Management API
 *
 * Provides admin endpoints for managing VPS dependencies and services:
 * - GET  ?action=status     — Check VPS installation status
 * - POST action=install     — Run VPS setup script
 * - POST action=service     — Start/stop/restart LinkedIn worker
 * - POST action=verify      — Verify all dependencies
 * - POST action=logs        — Get service logs
 *
 * Security: Admin-only endpoint.
 * The setup script must be pre-installed on the VPS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';
  if (!isAdmin) return null;
  return user;
}

function runScript(scriptPath: string, args: string[], timeoutMs = 120000): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn('bash', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeoutMs,
      env: { ...process.env, PATH: process.env.PATH },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ exitCode: -1, stdout, stderr: stderr + '\n' + err.message });
    });
  });
}

function checkVpsStatus() {
  const projectRoot = process.cwd();
  const setupScript = path.join(projectRoot, 'scripts', 'vps-setup.sh');
  const mainVenv = path.join(projectRoot, 'scripts', '.venv');
  const linkedinVenv = path.join(projectRoot, 'scripts', 'linkedin-worker', '.venv');
  const jobspyWorker = path.join(projectRoot, 'scripts', 'jobspy-worker.py');
  const linkedinWorker = path.join(projectRoot, 'scripts', 'linkedin-worker', 'worker.py');
  const linkedinLogin = path.join(projectRoot, 'scripts', 'linkedin-worker', 'login_linkedin.py');
  const profileDir = process.env.LINKEDIN_BROWSER_PROFILE_DIR || '/var/lib/buildairesume/browser-profiles/linkedin';

  return {
    setupScript: {
      exists: fs.existsSync(setupScript),
      path: setupScript,
    },
    mainVenv: {
      exists: fs.existsSync(mainVenv),
      python: fs.existsSync(path.join(mainVenv, 'bin', 'python3')),
      path: mainVenv,
    },
    linkedinVenv: {
      exists: fs.existsSync(linkedinVenv),
      python: fs.existsSync(path.join(linkedinVenv, 'bin', 'python3')),
      path: linkedinVenv,
    },
    workers: {
      jobspy: fs.existsSync(jobspyWorker),
      linkedin: fs.existsSync(linkedinWorker),
      linkedinLogin: fs.existsSync(linkedinLogin),
    },
    browserProfile: {
      exists: fs.existsSync(profileDir),
      path: profileDir,
    },
    environment: {
      linkedinEnabled: process.env.LINKEDIN_ENABLED === 'true',
      linkedinDebug: process.env.LINKEDIN_DEBUG === 'true',
      linkedinDryRun: process.env.LINKEDIN_DRY_RUN === 'true',
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      const status = checkVpsStatus();
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, options } = body;

    // ── Install dependencies ─────────────────────────────────────────────
    if (action === 'install') {
      const setupScript = path.join(process.cwd(), 'scripts', 'vps-setup.sh');
      if (!fs.existsSync(setupScript)) {
        return NextResponse.json({
          error: 'VPS setup script not found at scripts/vps-setup.sh',
        }, { status: 404 });
      }

      const installType = options?.type || 'all';
      const args: string[] = [];
      if (installType === 'linkedin') args.push('--linkedin-only');
      else if (installType === 'jobspy') args.push('--jobspy-only');

      // Run the setup script (non-interactive, with timeout)
      const result = await runScript(setupScript, args, 300_000); // 5 min timeout

      return NextResponse.json({
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        output: result.stdout,
        errors: result.stderr,
        message: result.exitCode === 0
          ? 'Dependencies installed successfully'
          : 'Installation encountered errors',
      });
    }

    // ── Verify dependencies ──────────────────────────────────────────────
    if (action === 'verify') {
      const setupScript = path.join(process.cwd(), 'scripts', 'vps-setup.sh');
      if (!fs.existsSync(setupScript)) {
        return NextResponse.json({ error: 'VPS setup script not found' }, { status: 404 });
      }

      const result = await runScript(setupScript, ['--verify'], 60_000);

      return NextResponse.json({
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        output: result.stdout,
        errors: result.stderr,
      });
    }

    // ── Service management ───────────────────────────────────────────────
    if (action === 'service') {
      const serviceName = options?.service || 'buildairesume-linkedin-worker';
      const command = options?.command || 'status'; // start, stop, restart, status

      if (!['start', 'stop', 'restart', 'status', 'enable', 'disable'].includes(command)) {
        return NextResponse.json({ error: 'Invalid service command' }, { status: 400 });
      }

      // Only allow if systemd is available
      try {
        const result = await runScript('/bin/bash', [
          '-c',
          `systemctl ${command} ${serviceName} 2>&1`,
        ], 30_000);

        return NextResponse.json({
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          output: result.stdout,
          errors: result.stderr,
        });
      } catch {
        return NextResponse.json({
          error: 'systemd not available on this system',
        }, { status: 501 });
      }
    }

    // ── Get service logs ─────────────────────────────────────────────────
    if (action === 'logs') {
      const serviceName = options?.service || 'buildairesume-linkedin-worker';
      const lines = options?.lines || 50;

      try {
        const result = await runScript('/bin/bash', [
          '-c',
          `journalctl -u ${serviceName} --no-pager -n ${lines} 2>&1`,
        ], 10_000);

        return NextResponse.json({
          success: true,
          output: result.stdout,
          errors: result.stderr,
        });
      } catch {
        return NextResponse.json({
          error: 'Could not retrieve logs (systemd not available?)',
        }, { status: 501 });
      }
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
