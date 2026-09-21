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

function runScript(scriptPath: string, args: string[], timeoutMs = 120000, extraEnv?: Record<string, string>): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn('bash', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeoutMs,
      env: { ...process.env, PATH: process.env.PATH, ...extraEnv },
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

/**
 * Resolve the actual project root on the deployed VPS.
 * Handles Docker containers (Dokploy), direct VPS, and local dev.
 * Tries multiple strategies:
 *   1. PROJECT_DIR env var
 *   2. process.cwd() if it contains the setup script
 *   3. /app (common Docker WORKDIR)
 *   4. /etc/dokploy/applications/<app>/code (host-level Dokploy)
 *   5. Scanning common mount points
 *   6. Fallback to process.cwd()
 */
function resolveProjectRoot(): string {
  const SCRIPT_REL = path.join('scripts', 'vps-setup.sh');

  // 1. Explicit env var
  if (process.env.PROJECT_DIR && fs.existsSync(path.join(process.env.PROJECT_DIR, SCRIPT_REL))) {
    return process.env.PROJECT_DIR;
  }

  // 2. process.cwd() — most common in Docker containers and local dev
  if (fs.existsSync(path.join(process.cwd(), SCRIPT_REL))) {
    return process.cwd();
  }

  // 3. Common Docker WORKDIR paths
  const dockerPaths = ['/app', '/home/node/app', '/srv/app', '/opt/app'];
  for (const p of dockerPaths) {
    if (fs.existsSync(path.join(p, SCRIPT_REL))) {
      return p;
    }
  }

  // 4. Dokploy deployment path (host-level, pattern: /etc/dokploy/applications/<app>/code)
  //    This may not be accessible from inside a container, but worth trying.
  const dokployBase = '/etc/dokploy/applications';
  try {
    const { execSync } = require('child_process');
    const apps = execSync(`ls "${dokployBase}" 2>/dev/null`, { encoding: 'utf8', timeout: 5000 }).trim().split('\n').filter(Boolean);
    for (const app of apps) {
      const codeDir = path.join(dokployBase, app, 'code');
      if (fs.existsSync(path.join(codeDir, SCRIPT_REL))) {
        return codeDir;
      }
    }
  } catch {
    // Not on Dokploy or ls failed
  }

  // 5. Scan for .vps-status.json in common locations (written by the setup script)
  //    This helps detect the project root even when the script path isn't directly accessible.
  const scanPaths = ['/app', '/srv', '/opt', '/home', process.cwd()];
  for (const base of scanPaths) {
    try {
      const markerPath = path.join(base, 'scripts', '.vps-status.json');
      if (fs.existsSync(markerPath)) {
        return base;
      }
    } catch {
      // skip
    }
  }

  // 6. Final fallback
  return process.cwd();
}

/**
 * Try to read the .vps-status.json marker file written by vps-setup.sh.
 * This is the primary detection method — works even when the API runs inside
 * a Docker container and can't directly see host-level installations.
 */
function readStatusMarker(): Record<string, boolean> | null {
  const projectRoot = resolveProjectRoot();
  const markerPath = path.join(projectRoot, 'scripts', '.vps-status.json');
  try {
    if (fs.existsSync(markerPath)) {
      const raw = fs.readFileSync(markerPath, 'utf8');
      const data = JSON.parse(raw);
      return data.checks || null;
    }
  } catch {
    // Marker file missing or invalid
  }
  return null;
}

/**
 * Check if a file exists using shell test command.
 * More reliable than fs.existsSync when paths cross Docker mount boundaries.
 */
function shellFileExists(filePath: string): boolean {
  try {
    const { execSync } = require('child_process');
    execSync(`test -f "${filePath}"`, { timeout: 3000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkVpsStatus() {
  const projectRoot = resolveProjectRoot();
  const marker = readStatusMarker();

  // Paths to check (container perspective)
  const setupScript = path.join(projectRoot, 'scripts', 'vps-setup.sh');
  const mainVenv = path.join(projectRoot, 'scripts', '.venv');
  const linkedinVenv = path.join(projectRoot, 'scripts', 'linkedin-worker', '.venv');
  const jobspyWorker = path.join(projectRoot, 'scripts', 'jobspy-worker.py');
  const linkedinWorker = path.join(projectRoot, 'scripts', 'linkedin-worker', 'worker.py');
  const linkedinLogin = path.join(projectRoot, 'scripts', 'linkedin-worker', 'login_linkedin.py');
  const profileDir = process.env.LINKEDIN_BROWSER_PROFILE_DIR || '/var/lib/buildairesume/browser-profiles/linkedin';

  // Detection: marker file → fs.existsSync → shell test fallback
  const detect = (filePath: string, markerKey?: string): boolean => {
    if (markerKey && marker?.[markerKey] === true) return true;
    if (fs.existsSync(filePath)) return true;
    return shellFileExists(filePath);
  };

  // Check Docker
  let docker = { installed: false, version: undefined as string | undefined, running: false };
  if (marker?.docker === true) {
    docker.installed = true;
  }
  try {
    const { execSync } = require('child_process');
    const dockerVersion = execSync('docker --version 2>/dev/null', { encoding: 'utf8', timeout: 5000 }).trim();
    docker.installed = true;
    docker.version = dockerVersion;
    try {
      execSync('docker info 2>/dev/null', { timeout: 5000 });
      docker.running = true;
    } catch {
      docker.running = false;
    }
  } catch {
    // Docker not installed
  }

  // Check Stalwart
  let stalwart = { running: false, status: undefined as string | undefined, containerName: 'buildairesume-stalwart' };
  if (marker?.stalwart === true) {
    stalwart.running = true;
  }
  try {
    const { execSync } = require('child_process');
    const psOutput = execSync('docker ps --filter name=buildairesume-stalwart --format "{{.Status}}" 2>/dev/null', { encoding: 'utf8', timeout: 5000 }).trim();
    if (psOutput) {
      stalwart.running = true;
      stalwart.status = psOutput;
    }
  } catch {
    // Stalwart not running
  }

  return {
    setupScript: {
      exists: detect(setupScript),
      path: setupScript,
    },
    mainVenv: {
      exists: detect(mainVenv, 'mainVenv'),
      python: detect(path.join(mainVenv, 'bin', 'python3'), 'mainVenv'),
      path: mainVenv,
    },
    linkedinVenv: {
      exists: detect(linkedinVenv, 'linkedinVenv'),
      python: detect(path.join(linkedinVenv, 'bin', 'python3'), 'linkedinVenv'),
      path: linkedinVenv,
    },
    workers: {
      jobspy: detect(jobspyWorker, 'jobspyWorker'),
      linkedin: detect(linkedinWorker, 'linkedinWorker'),
      linkedinLogin: detect(linkedinLogin, 'linkedinLogin'),
    },
    browserProfile: {
      exists: detect(profileDir),
      path: profileDir,
    },
    environment: {
      linkedinEnabled: process.env.LINKEDIN_ENABLED === 'true',
      linkedinDebug: process.env.LINKEDIN_DEBUG === 'true',
      linkedinDryRun: process.env.LINKEDIN_DRY_RUN === 'true',
    },
    docker,
    stalwart,
    _diagnostics: {
      projectRoot,
      markerFound: !!marker,
      markerPath: path.join(projectRoot, 'scripts', '.vps-status.json'),
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
      const projectRoot = resolveProjectRoot();
      const setupScript = path.join(projectRoot, 'scripts', 'vps-setup.sh');
      if (!fs.existsSync(setupScript)) {
        return NextResponse.json({
          error: `VPS setup script not found at ${setupScript}`,
          // The web image is intentionally slim: it no longer ships `scripts/`, Python or a browser.
          // Host tooling is now installed from a checkout on the VPS itself.
          hint: 'The application image no longer contains scripts/. Run this on the VPS host: cd /opt/buildairesume && sudo bash scripts/vps-setup.sh',
        }, { status: 404 });
      }

      const installType = options?.type || 'all';
      const args: string[] = [];
      if (installType === 'linkedin') args.push('--linkedin-only');
      else if (installType === 'jobspy') args.push('--jobspy-only');
      else if (installType === 'stalwart') args.push('--stalwart-only');

      // Run the setup script (non-interactive, with timeout)
      const result = await runScript(setupScript, args, 300_000, { PROJECT_DIR: projectRoot });

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
      const projectRoot = resolveProjectRoot();
      const setupScript = path.join(projectRoot, 'scripts', 'vps-setup.sh');
      if (!fs.existsSync(setupScript)) {
        return NextResponse.json({ error: `VPS setup script not found at ${setupScript}` }, { status: 404 });
      }

      const result = await runScript(setupScript, ['--verify'], 60_000, { PROJECT_DIR: projectRoot });

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
