/**
 * Worker health.
 *
 * Once the loops live in their own container, the web process can no longer answer "is email
 * ingestion running?" from local state — it has to ask. This module builds the payload the worker
 * service serves on its health port and probes it from the web side.
 *
 * Deliberately tiny and dependency-free: it is imported by the standalone worker bundle *and* by a
 * Next.js route handler, so it must not pull in mongoose or the Next runtime.
 */

import { readFileSync } from 'fs';
import type { WorkerEnv, WorkerPlan, WorkerRole } from './roles';

export interface WorkerHealthPayload {
  ok: boolean;
  role: WorkerRole;
  pid: number;
  /**
   * The commit the image was built from, or `'unknown'`.
   *
   * ⚠️ In practice this is **always `'unknown'`** in this deployment: it only reports a value if
   * something *supplies* `GIT_COMMIT` at build time, and nothing does — Dokploy exposes no build arg
   * for it, and `.dockerignore` excludes `.git`, so it cannot be derived either. It is kept as
   * plumbing for the day a CI supplies one. Use {@link WorkerHealthPayload.buildTime} for the
   * staleness question.
   */
  commit: string;
  /**
   * UTC timestamp of when this image was built, or `'unknown'`.
   *
   * This is the field that answers "is this container older than that one?". It is stamped by the
   * Dockerfile at build time, so it needs nothing passed in and is never empty.
   */
  buildTime: string;
  startedAt: string;
  uptimeSeconds: number;
  memoryRssMb: number;
  /** Per-loop state, whatever the loop exposes. */
  loops: Record<string, unknown>;
}

export interface BuildHealthPayloadInput {
  role: WorkerRole;
  plan: WorkerPlan;
  startedAt: Date;
  loops: Record<string, unknown>;
  now?: Date;
  runtime?: { pid: number; memoryUsage: () => { rss: number } };
  /** Defaults to {@link resolveBuildCommit}. Pass explicitly to make a test independent of the env. */
  commit?: string;
  /** Defaults to {@link resolveBuildTime}. */
  buildTime?: string;
}

/**
 * The commit baked into this image at build time, if anything supplied one.
 *
 * Mirrors `/api/health`, which reads the same two variables. Expect `'unknown'` here — see the note on
 * {@link WorkerHealthPayload.commit}.
 */
export function resolveBuildCommit(env: Record<string, string | undefined> = process.env): string {
  return env.GIT_COMMIT || env.SOURCE_COMMIT || 'unknown';
}

/**
 * Read the build stamp the Dockerfile wrote at build time.
 *
 * A file rather than an env var on purpose: `ENV` cannot run `date`, and an `ARG` would have to be
 * supplied by the build platform — which is exactly what makes `commit` useless here.
 */
export function resolveBuildTime(filePath = '/app/.build-time'): string {
  try {
    return readFileSync(filePath, 'utf8').trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function buildWorkerHealthPayload({
  role,
  plan,
  startedAt,
  loops,
  now = new Date(),
  runtime = process,
  commit = resolveBuildCommit(),
  buildTime = resolveBuildTime(),
}: BuildHealthPayloadInput): WorkerHealthPayload {
  return {
    ok: true,
    role,
    pid: runtime.pid,
    commit,
    buildTime,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000)),
    memoryRssMb: Math.round(runtime.memoryUsage().rss / (1024 * 1024)),
    loops: { ...loops, enabled: Object.entries(plan).filter(([, on]) => on).map(([key]) => key) },
  };
}

/** Health endpoint of the worker service, when one is configured. */
export function getWorkerHealthUrl(env: WorkerEnv = process.env): string | null {
  const raw = (env.WORKER_HEALTH_URL || '').trim();
  return raw === '' ? null : raw.replace(/\/+$/, '');
}

/**
 * Ask the worker service for its health. Returns `null` when unconfigured, unreachable or malformed
 * — monitoring must never turn a status page into a 500, and an absent worker must be visible as
 * "unknown", not as "healthy".
 */
export async function probeWorkerHealth(
  url: string | null,
  { timeoutMs = 2000, fetchImpl = fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<WorkerHealthPayload | null> {
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(`${url}/health`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as WorkerHealthPayload;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
