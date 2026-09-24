# Background worker service

Status: **implemented, pending production cutover.** The web container starts no background loops; they
run in a second container built from the same image (`docker build --target worker`).

## Why this exists

Four loops used to start from `src/instrumentation.ts`, i.e. inside the Next.js web container:

| Loop | What it does | Where it now runs |
|------|--------------|-------------------|
| `email` | drains `ApplicationEmailQueue` → Nodemailer → Stalwart | worker service |
| `emailIngestion` | polls Stalwart JMAP for replies, classifies them, updates applications | worker service |
| `applicationQueue` | claims `ApplicationQueue` items → Playwright ATS submission | worker service |
| `reconciliation` | watchdog that recovers stuck applications and promotes confirmed receipts | worker service |

Every redeploy of the site restarted that container, which meant:

- an application submission could be cut off mid-form (the queue releases it after 30 minutes, so the
  user saw a stuck application instead of a result);
- outbound application email and inbound reply ingestion paused for the length of the deploy, and for
  as long as a bad deploy took to notice;
- a deploy that only touched UI code still restarted the loops.

The loops now live in their own process, so deploying the site cannot interrupt them. The web tier
keeps its two *request-driven* paths: `/api/cron/ingestion` (job discovery, driven by an external
scheduler) and `/api/cron/auto-apply` (queue drain, which claims work atomically and is therefore safe
to run alongside the worker).

## Architecture

```
┌──────────────────────── VPS host (Dokploy) ────────────────────────┐
│                                                                    │
│  ┌──────────────────────────┐      ┌────────────────────────────┐  │
│  │ container: web           │      │ container: worker          │  │
│  │  image target: runner    │      │  image target: worker      │  │
│  │                          │      │                            │  │
│  │  Next.js HTTP            │      │  node dist/worker.mjs      │  │
│  │  WORKER_ROLE=web         │      │  email · emailIngestion     │  │
│  │  (no loops)              │      │  applicationQueue · recon  │  │
│  │                          │      │  :8791 /health (internal)  │  │
│  └──────────────────────────┘      └────────────────────────────┘  │
│              │                                  │                  │
│              └──────────── MongoDB ─────────────┘                  │
│                               │                                    │
│                    systemd: worker-gateway :8790                   │
│                    systemd: browser (CDP)  :9222                   │
└────────────────────────────────────────────────────────────────────┘
```

Both containers come from one Dockerfile. The `worker` target is built from the same `deps` and
`builder` stages, so the expensive part is built once per deploy.

## How the split is decided

`WORKER_ROLE` (`src/workers/roles.ts`):

| Value | Loops in this process | Use |
|-------|----------------------|-----|
| unset / `all` | all four | default — a single-container deployment keeps working exactly as before |
| `web` | none | the web service in production |
| `worker` | all four | the worker service (also set as `WORKER_ROLE` in the worker image) |

An unrecognised value fails **open** to `all` and logs a warning. A typo must not silently stop queue
processing: without a worker, applications sit in `queued` until someone looks. Duplicate processing is
tolerable by design — `claimNextApplication` claims atomically and application emails are keyed by an
idempotency key — which is what makes both the cron endpoint and fail-open safe.

## Deploy

### 1. Web service (existing)

Add one variable:

```
WORKER_ROLE=web
```

Everything else stays. On the next deploy the startup log should read:

```
[Startup] Background loops disabled in this process (WORKER_ROLE=web); they run in the worker service.
```

If you skip this, the app keeps working — the loops just stay in the web container and remain
interruptible, and the log says so on every boot.

### 2. Worker service (new)

Create a second service in Dokploy from the same repository:

- **Build**: Dockerfile, **target** `worker`
- **Ports**: none published. `8791` is internal; if you expose a health check, keep it on the Docker
  network only.
- **Environment**: the same `MONGODB_URI`, `MONGODB_DB`, Stalwart/JMAP, Nodemailer, Gemini and ATS
  variables the web service has. The worker does **not** read `.env` files: it uses the process
  environment as-is, so a stray dotfile can never point it at another database.
- **Stop grace period** (Dokploy stop timeout): larger than `WORKER_SHUTDOWN_GRACE_MS` (default 5000 ms).
  Otherwise Docker SIGKILLs the container while an application submission is finishing. `30` is a safe
  value.
- **Restart policy**: always. The process exits non-zero when it cannot start any loop, and that is the
  intended signal to restart it.

Optional, for ops visibility on the web side:

```
WORKER_HEALTH_URL=http://<worker-service>:8791
```

`GET /api/communications/sync` then reports the worker's live loop status instead of only local state.

### 3. Verify

```bash
# Worker container logs, at boot
[Worker] starting pid=1 role=worker node=v22.x loops=[email, emailIngestion, applicationQueue, reconciliation]
[Worker] MongoDB connected
[Worker] started loop: email
[Worker] started loop: emailIngestion
[Worker] started loop: applicationQueue
[Worker] started loop: reconciliation
[Worker] health server listening on http://0.0.0.0:8791/health

# Health, from inside the Docker network
curl -s http://<worker-service>:8791/health

# Deployment survives a web redeploy — the critical check:
docker restart <web-container>
# then: worker logs must show NO stop/start lines, and uptimeSeconds in /health must keep rising.
```

The image ships a `HEALTHCHECK` (30s interval, 5s timeout, 30s start period, 3 retries) that GETs the
health port; Docker marks the container unhealthy and restarts it per the service's restart policy if
the loops stop answering. The admin dashboard (`/admin/dashboard/job-intelligence-health` → VPS Deploy)
shows the worker's live uptime, memory and per-loop status when `WORKER_HEALTH_URL` is set on the web
service — if the web tier were still killing the loops on redeploy, that uptime would visibly reset.

Offline check of the whole remote-status surface (no VPS needed — stubs the gateway, the ingestion
service and the worker health endpoint, then runs the actual route logic):

```bash
REMOTE_STUBS=1 node scripts/tests/vps-status-probe.mjs
```

The health payload includes each loop's own status (`activeJobs` for email, `consecutiveFailures` for
ingestion) plus uptime and RSS, and a heartbeat line is logged every `WORKER_HEARTBEAT_MS` (5 min) so a
silent worker is visible in the logs.

## Build locally

```bash
npm run build:worker              # esbuild → dist/worker.mjs (verifies every external resolves)
node --env-file=.env.local dist/worker.mjs   # local run; needs a reachable MongoDB
```

`npm run worker` does both steps. The build **fails** if any external specifier in the bundle cannot be
resolved by plain Node. That check exists because of a real failure: `next/headers` — reached through a
*lazy* import inside `activityLogService` that esbuild inlines — resolved for the bundler and crashed
the worker at boot with `ERR_MODULE_NOT_FOUND`. It is now shimmed in `scripts/next-headers-shim.mjs`.

## Failure modes

| Symptom | Cause | Action |
|---------|-------|--------|
| Worker exits with `WORKER_ROLE=web enables no loops` | `WORKER_ROLE=web` reached the worker service (usually a shared env file) | Set `WORKER_ROLE=worker` (or unset) on the worker service only |
| Worker exits with `no loops started` | every loop module failed to start; the line above says why | Fix the reported cause; Mongo connectivity is the usual one |
| `fetch failed` / `ECONNREFUSED` in `emailIngestion` every 30 s | JMAP/Stalwart host unreachable from the worker container | Check the JMAP URL and that the worker can reach the mail host |
| Loops run twice (one in each container) | `WORKER_ROLE=web` not set on the web service | Set it; duplicate processing is safe but wasteful |
| Health port already in use | two workers on one host with the same port | Give each a distinct `WORKER_HEALTH_PORT`, or do not expose it |
| Applications stuck in `queued` | no worker running, or the ATS path needs `PLAYWRIGHT_REMOTE_URL` | Check `/health`; check the browser service (`vps-automation-workers.md`) |

## Rollback

Delete the `WORKER_ROLE=web` variable from the web service and remove the worker service. The loops
start in the web container again on the next deploy — that is the pre-split behaviour, unchanged. No
data migration is involved: both roles use the same collections and the same claim/lock mechanics.

## Related

- `src/workers/entry.ts` — the worker process: startup order, health server, signal handling
- `src/workers/roles.ts` — role → loop plan
- `src/workers/health.ts` — health payload and the web-side probe
- `src/instrumentation.ts` — web-side gating (the loops it may still start)
- `scripts/build-worker.mjs` — esbuild bundle + external-resolution check
- `scripts/tests/vps-status-probe.mjs` — end-to-end probe of the admin status route (`REMOTE_STUBS=1` for the full remote path)
- `scripts/next-headers-shim.mjs`, `scripts/server-only-shim.js` — build-time shims
- `Dockerfile` — `worker-bundle` and `worker` stages
- `docs/deployment/vps-automation-workers.md` — the host services (discovery gateway, browser, PDF)
