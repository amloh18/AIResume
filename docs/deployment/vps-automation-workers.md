# VPS automation workers

How job discovery and browser automation run **outside** the application image, so deploys stop
re-downloading Playwright, Chromium and the JobSpy dependency tree.

Status: **Stage 2 complete.** The web image is a web server: no Chromium, no Python, no `scripts/`, no apt.
The in-process background loops (email, email ingestion, application queue, reconciliation) have since
moved to a separate container built from the same image — see `docs/deployment/worker-service.md`.
Everything that needs a browser or an interpreter runs on the host.

| Capability | Where it runs now | How the app reaches it |
|------------|-------------------|------------------------|
| JobSpy + LinkedIn discovery | `buildairesume-worker-gateway` (Python) | `INGESTION_WORKER_URL` over HTTP |
| Greenhouse/Lever/Ashby/Workable submission | `buildairesume-browser` (headless Chrome) | `PLAYWRIGHT_REMOTE_URL` over CDP |
| Resume → PDF rendering | `buildairesume-browser` (headless Chrome) | `PUPPETEER_BROWSER_WS_ENDPOINT` over CDP |
| Application queue draining | `/api/cron/auto-apply` in the app | cron / scheduler with `CRON_SECRET` |

---

## Why this exists

`scripts/jobspy-worker.py` and `scripts/linkedin-worker/worker.py` are one-shot processes: JSON on
stdin, JSON on stdout, logs on stderr, then exit. The Next.js app spawned them directly
(`src/lib/ingestion/engine.ts`), which forced Python, Playwright, JobSpy and Chromium into the
application Docker image.

Two consequences:

1. **Every deploy that missed a layer cache re-downloaded ~170 MB of Chromium plus 155 apt packages.**
   The root cause was `FROM node:22-bookworm-slim` — a *mutable* tag. When Docker Hub republished it, the
   digest changed and every layer after `FROM base` was invalidated. The base is now pinned by digest.
2. **Workers died on every redeploy**, killing in-flight scrapes, and the container had no persistent
   browser profile.

## Architecture

```
┌─────────────────────────── VPS host ────────────────────────────┐
│                                                                 │
│  ┌────────────────────┐        ┌──────────────────────────────┐ │
│  │ Docker             │        │ systemd                      │ │
│  │  buildairesume-app │        │  buildairesume-worker-gateway│ │
│  │                    │        │   :8790  (worker-gateway.py) │ │
│  │  Next.js           │───────▶│        │                     │ │
│  │  engine.ts         │  HTTP  │        │ spawns              │ │
│  │  (no Python)       │        │        ▼                     │ │
│  └────────────────────┘        │  scripts/.venv  (JobSpy)     │ │
│         ▲                      │  linkedin-worker/.venv       │ │
│         │ INGESTION_WORKER_URL │  Chromium                    │ │
│         └──────────────────────│  /var/lib/buildairesume/...  │ │
│                                └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

The gateway does **not** modify either worker. It accepts the same JSON the app used to write to stdin,
runs the same script the same way, and returns the same JSON the app used to read from stdout. That
fidelity is what makes the migration reversible.

The browser service is the same idea for the two subsystems that need a real page. Instead of each
launching its own Chromium inside the web container, both attach to one Chrome over the DevTools
protocol. `src/lib/services/browserService.ts` is the single place that decides where a browser comes
from, so Playwright and Puppeteer cannot drift apart on endpoint handling.

---

## Prerequisites

- Root (or sudo) access to the VPS host. **The gateway cannot be installed from inside the container** —
  there is no systemd there.
- A checkout of this repository on the host, e.g. `/opt/buildairesume`.
- The base tooling, installed once: `sudo bash scripts/vps-setup.sh`

`vps-setup.sh` creates the `buildairesume` user, both virtualenvs and Chromium. The gateway installer
does not duplicate any of that.

---

## Install

```bash
cd /opt/buildairesume
git pull

# One-time: user, virtualenvs, Chromium
sudo bash scripts/vps-setup.sh

# The HTTP front end
sudo bash scripts/vps-install-worker-gateway.sh
```

The installer prints the two values the application needs. Add them to the app's environment
(Dokploy → application → Environment):

```
INGESTION_WORKER_URL=http://172.17.0.1:8790
INGESTION_WORKER_TOKEN=<generated>
```

`172.17.0.1` is the Docker bridge gateway. If Dokploy uses a custom network, use that network's gateway
address instead — the installer detects and prints the value it found.

Redeploy the app. With the variable unset, development keeps using the in-process spawn path. In
production the app deliberately refuses to spawn (`mustRefuseLocalWorkerSpawn()` in
`src/lib/ingestion/engine.ts`) and logs one warning per run, because the slim image has no Python to
spawn: an ENOENT per ingestion run is a silent empty result, not an error anyone can act on.
`ALLOW_LOCAL_INGESTION_WORKERS=true` restores the old path for a host that runs the app beside the
virtualenvs.

---

## Browser service (ATS automation + PDF rendering)

The web image has no Chromium, so anything that needs to render a page attaches to a Chrome on the host.

```bash
cd /opt/buildairesume
git pull

# Detect Chromium, install the unit, verify the CDP endpoint
sudo bash scripts/vps-install-browser-service.sh

# Inspect later
sudo bash scripts/vps-install-browser-service.sh --status
sudo bash scripts/vps-install-browser-service.sh --uninstall
```

The installer finds a Chromium (Playwright's cached build from `vps-setup.sh` first, then a system
package), writes the unit with that binary and the detected Docker bridge address, warns if the system
has no usable fonts, and prints the two environment variables the app needs:

```
PLAYWRIGHT_REMOTE_URL=http://172.17.0.1:9222
PUPPETEER_BROWSER_WS_ENDPOINT=http://172.17.0.1:9222
```

`browserService.ts` accepts an `http://` CDP base URL or a browser-level `ws://…/devtools/browser/<id>`
URL for either variable, so pointing both at one Chrome is fine until load justifies splitting them.
`PUPPETEER_BROWSER_WS_ENDPOINT` falls back to `PLAYWRIGHT_REMOTE_URL` when unset.

### Compatibility note: Chrome flags are not free tuning knobs

Playwright documents that connecting over CDP to a browser it did not launch can break parts of its API
if the launch arguments differ from the curated set it uses itself. `scripts/buildairesume-browser.service`
therefore mirrors those arguments deliberately. Treat a change to the flag list as a compatibility change
and re-run an auto-apply against a real Greenhouse or Lever form afterwards, rather than as performance
tuning.

Two related behaviours worth knowing:

- `chromium.connect` (Playwright's own protocol) is *not* used. A Chrome started with
  `--remote-debugging-port` speaks CDP, and only `chromium.connectOverCDP` understands it.
- Contexts are still isolated per application: `browser.newContext()` works over CDP, so each submission
  gets its own context and closing the browser handle only detaches this process from the shared Chrome.

### Risk: CDP has no authentication

Whoever can reach `:9222` can drive the browser. The unit therefore binds to the **Docker bridge address
only** — never a public interface — and the installer reports a permissive `ufw` rule if it finds one.
Do not publish this port through Cloudflare, do not put it behind a reverse proxy, and do not change
`--remote-debugging-address` to `0.0.0.0`.

### What the app does without a browser

In production with no remote endpoint configured, `browserService` reports `unavailable` and nothing is
launched. A container has no browser to find, and a failed `launch()` would cost a ~30s timeout on every
application before producing the same fallback. The behaviour is a safe halt, not a crash:

- **auto-apply** → the submission is staged as `action_required` with the reason attached, and the job
  appears in the user's staging queue for manual submission.
- **PDF export** → `rendererHealthService` reports unhealthy and `pdfService` uses its jsPDF fallback,
  which produces a plain, unstyled document.

Both are visible in the logs:

```
[Browser] … No remote browser is configured (set PLAYWRIGHT_REMOTE_URL) …
[greenhouse] Playwright automation unavailable: …
```

---

## Endpoint auth surface

| Endpoint | Auth | Exposes |
|----------|------|---------|
| `GET /live` | none | `{status, version}` only |
| `GET /health` | Bearer token | project path, interpreter paths, worker state |
| `POST /scrape` | Bearer token | runs a worker |
| `GET /json/version` (browser) | none | Chrome version + DevTools URL — bridge-bound only |

`/health` is token-gated deliberately. The gateway binds to the Docker bridge address, so anything on
that network can reach it — and the detailed view enumerates the host's filesystem layout and worker
state. `/live` exists so a connectivity check can ask "is something listening?" without a secret and
without being handed that detail.

## Verify

```bash
# On the host — liveness, no token needed
curl -s http://127.0.0.1:8790/live

# Detail, token-authenticated
TOKEN="$(grep -E '^WORKER_GATEWAY_TOKEN=' /opt/buildairesume/.env | tail -1 | cut -d= -f2-)"
curl -s -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:8790/health | python3 -m json.tool

# From inside the app container — proves the network path works
docker exec -it <app-container> curl -s --max-time 5 http://172.17.0.1:8790/live
```

`/health` reports, per worker: `scriptPresent`, `python`, `venvPresent`, `busy`. `venvPresent: false`
means `vps-setup.sh` did not complete and the worker will fall back to system python.

Then confirm ingestion itself:

```bash
sudo journalctl -u buildairesume-worker-gateway -f
```

Trigger a discovery run from Admin → Job Intelligence and confirm the app log shows
`JobSpy: delegating to the VPS worker gateway` followed by a job count, and that the gateway journal
shows the worker's own `[JobSpy Worker]` lines.

---

## Rollback

Reversible at any point, in either direction.

```bash
# Back to in-process, no redeploy of code needed
#   Remove INGESTION_WORKER_URL from the app environment, redeploy.

# Or take the service down entirely
sudo bash scripts/vps-install-worker-gateway.sh --uninstall
```

`--uninstall` removes only the unit. Virtualenvs, browser profiles and `.env` are left untouched.

---

## Stage 2 — what changed

| Step | Change | Status |
|------|--------|--------|
| 2a | Removed the `pip3 install playwright` / `git+JobSpy` layer | done |
| 2b | Removed `COPY scripts/` — requires `INGESTION_WORKER_URL` in production | done |
| 2c | ATS auto-apply attaches to the remote browser instead of launching its own | done |
| 2d | Removed the `browsers` stage, the X/GTK apt layer and Python | done |
| 2e | PDF rendering (`puppeteerPoolService`) also attaches to the remote browser | done |

2e was not in the original plan, and it turned out to be the step that made 2d safe. The server-side PDF
export path (`/api/cv/export`, `/api/cvs/[id]/download`, used from the resume editor and the job document
sidebars) renders through Puppeteer, so removing Chromium without giving Puppeteer a remote browser would
have silently downgraded every downloaded resume to the jsPDF fallback.

### Behaviour changes worth knowing

- **`AutoApplyQueue` is not what the cron drains.** That legacy collection had exactly one writer,
  the demo route `/api/applications/process`, which fabricated a `demo-user-<timestamp>` id and had no
  submission-evidence gate. The route had no callers and has been removed. The live queue is
  `ApplicationQueue`, fed by `/api/jobs/auto-apply`. `/api/cron/auto-apply` drives the real queue
  through the same `claimNextApplication()` / `processApplication()` primitives as the in-process
  worker.
- **The in-process queue worker still exists.** `src/workers/applicationWorker.ts` polls the same
  collection from inside the web container. Running both is safe — claiming is an atomic
  `findOneAndUpdate` — and the cron endpoint is what lets an external scheduler keep the queue moving
  across redeploys.
- **`unifiedApplyService` no longer reports `failed` for a missing browser.** Lever/Ashby/Workable returned
  `status: 'failed'` when automation could not run, while the caller already routed that outcome into
  staging. It is now `action_required` with the reason attached, which is what actually happens.
- **`/api/cron/*` is authenticatable.** `src/proxy.ts` used to reject every one of these routes with 401
  before the handler's own `CRON_SECRET` check could run, so no external scheduler could trigger them. The
  proxy now verifies the bearer token itself (constant-time, `CRON_SECRET` or `CRON_API_KEY`) and still
  returns 401 when no secret is configured — which is exactly the previous behaviour.
- **The DevTools port is unauthenticated.** It is bound to the Docker bridge and nothing else; treat any
  change to that binding as a security change, not a networking one.

### Rolling back

`git revert` restores the old Dockerfile. Reverting only *part* of this is the dangerous option: an image
with Chromium removed but no `PLAYWRIGHT_REMOTE_URL` degrades auto-apply and PDF rendering to their manual
fallbacks. Roll back the image and the browser wiring together, or keep the slim image and configure the
remote endpoints.

---

## Troubleshooting

### `Ingestion poll failed: TypeError: fetch failed` / `UND_ERR_CONNECT_TIMEOUT`

Seen with `mail.morigrid.com:443`. **This is not a code defect** — `UND_ERR_CONNECT_TIMEOUT` means the
TCP connect never completed. It is not DNS (`ENOTFOUND`), not TLS (`CERT_*`) and not HTTP (4xx/5xx).

Cause is almost always that `STALWART_JMAP_URL` points at the *public* hostname from inside the
container. Common reasons: Stalwart is not listening on 443; the hostname is Cloudflare-proxied and the
container cannot hairpin to the VPS's own public IP; or a firewall rule blocks container egress.

Diagnose:

```bash
docker exec -it <app-container> sh -c \
  'curl -sv --max-time 5 https://mail.morigrid.com/jmap/session 2>&1 | head -20'
```

Fix by pointing it at an internal address instead of the public hostname — the Stalwart container name
on the shared Docker network, or the host gateway:

```
STALWART_JMAP_URL=http://stalwart:8080/jmap
```

The ingestion loop now backs off exponentially (30s → 60s → 120s → 240s, capped at 5 min) and logs the
failure once per streak rather than on every tick, so a persistent outage no longer floods the log.

### 401 from `POST /scrape` or `GET /health`

`INGESTION_WORKER_TOKEN` in the app does not match `WORKER_GATEWAY_TOKEN` in `/opt/buildairesume/.env`.

A 401 from `/health` on the *host* usually means the token was added to `.env` after the service started
— the unit reads `EnvironmentFile` once at boot:

```bash
sudo systemctl restart buildairesume-worker-gateway
```

### `GET /live` works but `/health` returns 401

Expected when no token is supplied. `/live` is intentionally unauthenticated; `/health` is not. See
[Endpoint auth surface](#endpoint-auth-surface).

### `POST /scrape` returns 500 `worker script not found`

The gateway cannot see the script. Check `WORKER_PROJECT_DIR` in the unit matches the checkout path, and
that `/health` reports `scriptPresent: true`.

### `POST /scrape` returns 502 with `AUTH_REQUIRED`

The LinkedIn browser profile has no session. Re-authenticate on the VPS:

```bash
sudo -u buildairesume /opt/buildairesume/scripts/linkedin-worker/.venv/bin/python3 \
  /opt/buildairesume/scripts/linkedin-worker/login_linkedin.py --xvfb
```

### `POST /scrape` returns 504

The worker exceeded `WORKER_GATEWAY_TIMEOUT_SECONDS` (default 900s) and was killed. Check the
`logs` field in the response — it carries the worker's stderr.

### Auto-apply reports `Automated submission unavailable (No remote browser is configured …)`

`PLAYWRIGHT_REMOTE_URL` is not set on the app, or the browser service is down:

```bash
curl -s --max-time 5 http://127.0.0.1:9222/json/version | python3 -m json.tool
journalctl -u buildairesume-browser -n 50 --no-pager   # with root or journal access
```

### `/json/version` answers on the host but the container times out

The unit is bound to the wrong address. Confirm the bridge address matches what the app was given:

```bash
ip -4 addr show docker0 | awk '/inet /{print $2}'
systemctl cat buildairesume-browser | grep remote-debugging-address
```

The installer rewrites the unit with the address it detects; a Dokploy instance on a custom Docker network
needs that network's gateway instead.

### PDFs come back with the wrong layout or missing glyphs

The browser cannot see fonts. `scripts/vps-install-browser-service.sh` prints the font count it found;
install them with `apt-get install -y fontconfig fonts-liberation fonts-noto-color-emoji` and restart the
service.

### `/api/cron/auto-apply` returns 401

Two gates, same secret: the proxy rejects an `Authorization` header that is not `Bearer <CRON_SECRET>`, and
the route handler checks it again. A 401 means the secret is missing from the request or from the app
environment.

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://buildairesume.com/api/cron/auto-apply
```

---

## Related

- `scripts/worker-gateway.py` — the discovery gateway
- `scripts/buildairesume-worker-gateway.service` — its systemd unit
- `scripts/vps-install-worker-gateway.sh` — its installer
- `scripts/vps-install-browser-service.sh` — browser service installer
- `scripts/buildairesume-browser.service` — headless Chrome + CDP unit
- `scripts/tests/test_worker_gateway.py` — gateway transport tests (`python3 scripts/tests/test_worker_gateway.py`)
- `scripts/tests/engine-gateway.e2e.mjs` — real `engine.ts` against the real gateway (`node scripts/tests/engine-gateway.e2e.mjs`)
- `scripts/vps-setup.sh` — host tooling (user, virtualenvs, Chromium, fonts)
- `src/lib/ingestion/engine.ts` — `callWorkerGateway()` and the local-spawn fallback
- `src/lib/services/browserService.ts` — endpoint resolution for Playwright and Puppeteer
- `src/lib/services/unifiedApplyService.ts` — ATS submission handlers
- `src/lib/services/puppeteerPoolService.ts` — PDF browser pool
- `src/app/api/cron/auto-apply/route.ts` — queue drain endpoint
- `Dockerfile` — the slim web image (targets `runner` and `worker`)
- `src/workers/entry.ts` — the background worker process (`--target worker`)
- `src/workers/roles.ts` — `WORKER_ROLE` → which loops run in which container
- `scripts/build-worker.mjs` — worker bundle + external-resolution check
- `docs/deployment/worker-service.md` — the web/worker split, env contract and cutover
