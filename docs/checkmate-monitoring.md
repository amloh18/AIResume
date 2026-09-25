# Checkmate VPS Monitoring — Operations Guide

Last verified: 2026-09-25 (all checks performed live against the VPS).

Checkmate is the single monitoring dashboard for the VPS: host metrics, container
states, service uptime, ports, PageSpeed, SSL/domain expiry, Telegram alerts, and
a public status page.

## 1. Where it runs

- Stack: `/opt/checkmate/docker-compose.yml` (containers `checkmate`, `checkmate-capture`, `checkmate-mongo`)
- App port: `52345` (LAN: `http://192.168.1.8:52345`)
- Public dashboard: **`https://dash.morigrid.com`** (dokploy traefik → `172.19.0.1:52345`)
- Public status page: **`https://dash.morigrid.com/status/public/morigrid`**
- Checkmate's own DB: `checkmate-mongo` (`uptime_db`) — *not* the application MongoDB
- Capture agent: `checkmate-capture` (host metrics, `pid: host`, port `59232`,
  auth `Authorization: Bearer <CAPTURE_API_SECRET>`)

## 2. Changes applied on 2026-09-25

### 2.1 Infrastructure gauges showed wrong disk usage — FIXED

- **Symptom**: Infrastructure list showed disk ≈ 31 % while the real root disk was ≈ 81 %.
- **Root cause**: the UI averages *all* disks in the latest check. Capture runs with
  `pid: host`, so gopsutil read `/proc/1/mountinfo` (host mount table) and reported
  `/`, `/boot`, `/boot/efi` → (81 + 10 + 0.6) / 3 ≈ 31 %.
- **Fix**: `HOST_PROC_MOUNTINFO=/proc/self/mountinfo` on `checkmate-capture` (capture
  now enumerates its own mount namespace → exactly one entry: the real root LVM
  device), plus removed the redundant `/boot`, `/boot/efi` bind mounts.
- **Verified**: latest hardware check has `disk` length = 1, device
  `/dev/mapper/ubuntu--vg-ubuntu--lv`, usage 80.7 % — gauge now matches `df -h /`.
- Hardware monitor also set to `selectedDisks: ["/"]`, memory alert threshold 90 %,
  CPU 90 %, disk 90 % (5 consecutive checks).

### 2.2 Compose changes (`/opt/checkmate/docker-compose.yml`)

- `checkmate` joined **`dokploy-network`** (external) so it can reach the application
  MongoDB and other dokploy services by container name for TCP checks.
- Checkmate's DB service renamed `mongodb` → **`checkmate-mongodb`** and the
  connection string now uses the container name `checkmate-mongo`:
  **why**: the service alias `mongodb` collided with the *production* `mongodb`
  container once checkmate joined `dokploy-network`; mongoose resolved the
  auth-enabled production DB and crashed with
  `Command findAndModify requires authentication`. This caused a ~7 min crash loop
  (12:19–12:26 UTC) that resolved cleanly; `uptime_db` data was never at risk
  (data lives in the `./mongo-data` bind mount).
- Backup: `docker-compose.yml.bak2` (pre-change), `.bak` (original).

### 2.3 Traefik routing (`/etc/dokploy/traefik/dynamic/management-stack.yml`)

- `dash.morigrid.com` / `glance.morigrid.com` now route to Checkmate
  (merged into the existing `checkmate-router`, no basic-auth — Checkmate has its
  own login).
- Removed dead routers/services: glance, dashdot, portainer, filebrowser.
- `status.morigrid.com`, `checkmate.morigrid.com`, `kuma.morigrid.com`,
  `grafana.morigrid.com` were already routed to Checkmate (see §4 for DNS).
- Backup: `management-stack.yml.bak-checkmate`.

### 2.4 Monitor inventory (22 total — 15 active, 7 paused)

Active groups:

| Group | Monitors |
|---|---|
| Infrastructure | VPS Hardware & System Metrics, Docker Host Containers, MongoDB Database *(new, TCP 27017)*, Checkmate API Self-Check *(new, :52346/livez)* |
| Applications | BuildAiResume Web App *(now https://)*, BuildAIResume Job Ingestion *(new, :4001)* |
| Control Plane | Dokploy Control Plane |
| AI Services | Hermes AI Gateway Dashboard, Hermes Telegram Webhook, Ollama Local AI Engine |
| Mail | Stalwart Mail Server, Stalwart SMTP Submission *(new, TCP 587)* |
| Networking | Traefik Ingress Proxy, Internet Connectivity *(new, ping 1.1.1.1)* |
| Performance | Resume PageSpeed (Desktop) *(new — see §4)* |

Paused (targets deleted or apps intentionally stopped): Achare Landing Page,
Achare Server API, Kommutor Transit API, Kommutor Admin Panel, Glance Dashboard,
Portainer Docker UI, FileBrowser. Re-enable with `POST /api/v1/monitors/pause/:id`
if the service comes back.

- **Container/process monitoring**: `Docker Host Containers` watches container
  states + health + collects logs (`dockerLogsEnabled`) — covers the BuildAIResume
  worker daemon (it exposes no port) and MongoDB container health.
- BuildAIResume worker daemon: no HTTP port exists; it is covered by the Docker
  monitor only.

### 2.5 Telegram alerts

- Channel: **Checkmate Telegram Alerts** (`type: telegram`), reuses the
  `vps-telegram-bot` bot token and chat; test messages delivered successfully.
- Attached to **all monitors** (`modifiedCount: 22`); down/recovery/threshold
  alerts fire on status transitions.

### 2.6 Status page

- Slug: `morigrid`, published, uptime + infrastructure sections, 15 active monitors.
- Public API: `GET /api/v1/status-page/morigrid?type=uptime&type=infrastructure`
  (`type` is a required query parameter — omitting it returns a 500 ZodError).
- Public UI: `https://dash.morigrid.com/status/public/morigrid`.

### 2.7 SSL / domain expiry

- `GET /api/v1/monitors/certificate/:id` → verified: cert expires **2026-12-16**.
- `GET /api/v1/monitors/domain/:id` → verified: `morigrid.com` expires **2027-01-28**.
- BuildAiResume monitor now uses `https://resume.morigrid.com` so these endpoints
  and the check cover the real user path.

## 3. Re-running configuration

`/opt/checkmate/checkmate-setup.js` (idempotent: pauses dead monitors, patches the
hardware/https monitors, creates missing monitors, tests + attaches Telegram,
creates the status page):

```sh
E=$(grep -oE 'email: "[^"]+"' /opt/checkmate/sync-monitors.js | head -1 | cut -d'"' -f2)
P=$(grep -oE 'password: "[^"]+"' /opt/checkmate/sync-monitors.js | head -1 | cut -d'"' -f2)
T=$(docker inspect vps-telegram-bot --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^TELEGRAM_BOT_TOKEN=' | cut -d= -f2-)
C=$(docker inspect vps-telegram-bot --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^TELEGRAM_ALLOWED_USER_ID=' | cut -d= -f2-)
docker exec -e CM_EMAIL="$E" -e CM_PASS="$P" -e TG_TOKEN="$T" -e TG_CHAT="$C" \
  checkmate node /tmp/checkmate-setup.js
```

(First copy the script into the container: `docker cp /opt/checkmate/checkmate-setup.js checkmate:/tmp/`.)

API notes: login `POST /api/v1/auth/login`; monitors `GET /monitors/team`
(ids are `id`, not `_id`); bulk pause `POST /monitors/bulk/pause`
`{monitorIds, pause}`; attach alerts `PATCH /monitors/notifications`
`{monitorIds, notificationIds, action: add|remove|set}`.

## 4. Pending / optional

- [ ] **status.morigrid.com DNS**: the traefik router already points it at
  Checkmate — add a Cloudflare A record `status` → `106.215.156.188` (proxied)
  and the pretty status-page URL works immediately.
- [ ] **PageSpeed API key**: the monitor was created but Google's *anonymous*
  PSI quota is exhausted (HTTP 429 `Queries per day`), so it shows
  `initializing`. Interval is 6 h; it will succeed after the quota resets
  (~07:00–08:00 UTC daily). For reliable runs, create a free Google API key
  with the PageSpeed API enabled and set it in Checkmate → Settings
  (`pagespeedApiKey`; stored as `pagespeedKeySet: true`, never returned by the API).

## 5. Safety notes

- Never print `CAPTURE_API_SECRET`, `sync-monitors.js` credentials, bot token, or
  full container env (`docker inspect ... Env`) into logs — extract to shell
  variables only.
- `docker compose -f /opt/checkmate/docker-compose.yml config --quiet` validates
  the stack after any edit.
- Capture must keep `pid: host` (host CPU/mem/disk come from the host namespace)
  and `HOST_PROC_MOUNTINFO=/proc/self/mountinfo` (so disk = one real root entry).
- If Checkmate ever crash-loops after a compose network change, suspect
  **DNS alias collisions** first (`mongodb` = both the app DB and checkmate's DB
  before the rename in §2.2).
