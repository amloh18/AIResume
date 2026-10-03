# VPS Job Ingestion Audit

**Date**: 2026-09-03
**VPS**: 192.168.1.8 (Ubuntu 26.04, Intel i5-5250U, 7.2GB RAM, 108GB disk)

## 1. VPS Environment

| Component | Version | Notes |
|-----------|---------|-------|
| OS | Ubuntu 26.04.1 LTS | x86_64 |
| CPU | Intel i5-5250U (4 cores) | 1.60GHz |
| RAM | 7.2 GB | 2.7 GB used, 4.5 GB available |
| Disk | 108 GB | 35 GB used (34%) |
| Docker | 29.7.2 | Swarm mode |
| Docker Compose | v5.5.0 | |
| Node.js | Not in PATH | Only inside containers |
| Python | 3.14.4 | System-wide, pip 25.1.1 |
| Chromium | NOT INSTALLED | No browser on host |
| Playwright | NOT INSTALLED | pip package missing |
| jobspy | NOT INSTALLED | pip package missing |

## 2. Running Services

| Service | Status | Port | Notes |
|---------|--------|------|-------|
| buildairesume-app | Running (Docker Swarm) | 3001→3000 | Next.js app |
| dokploy | Running (healthy) | 3000 | Deployment manager |
| dokploy-postgres | Running | 5432 | Dokploy DB |
| dokploy-traefik | Running | 80,443 | Reverse proxy |
| vps-telegram-bot | Running | - | VPS management bot |
| kommutor-api | Running | - | Kommutor API |
| kommutor-adminpanel | Running | - | Kommutor Admin |
| mgmt-* | Running | Various | Management stack |

## 3. Critical Finding: Workers Cannot Execute

### Root Cause

The `buildairesume-app` Docker container:

1. **Does NOT contain Python** — Dockerfile uses `node:22-bookworm-slim` with no Python installation
2. **Does NOT contain the scripts directory** — Dockerfile only copies `public`, `.next`, `node_modules`, `package.json`
3. **Has NO volume mounts** — Scripts on the VPS host are not accessible from inside the container
4. **Has NO Chromium/Playwright** — LinkedIn browser worker cannot function

### Execution Chain (BROKEN)

```
Admin Panel / Cron Trigger
    ↓
Next.js API Route (/api/admin/ingest or /api/cron/ingestion)
    ↓
engine.ts → fetchJobSpy() / fetchLinkedIn()
    ↓
child_process.spawn('python3', ['scripts/jobspy-worker.py'])
    ↓
❌ FAILS: No python3 in container
❌ FAILS: No scripts/jobspy-worker.py in container
❌ FAILS: No jobspy pip package
❌ FAILS: No Playwright/Chromium for LinkedIn
```

### Evidence

```
Container: buildairesume-app-vmvp35.1.awgtocqzpzh5tylt42d4j0w6v

$ docker exec <container> which python3
# No python3 in container

$ docker exec <container> ls /app/scripts/
# No /app/scripts/ directory

$ docker exec <container> pip3 list | grep jobspy
# No jobspy package

$ docker exec <container> find /app -name 'jobspy-worker.py'
# No results

$ docker exec <container> find /app -name 'linkedin-worker' -type d
# No results
```

### Scripts Exist on VPS Host (NOT in container)

```
/etc/dokploy/applications/buildairesume-app-vmvp35/code/scripts/jobspy-worker.py
/etc/dokploy/applications/buildairesume-app-vmvp35/code/scripts/linkedin-worker/worker.py
/etc/dokploy/applications/buildairesume-app-vmvp35/code/scripts/linkedin-worker/scraper.py
/etc/dokploy/applications/buildairesume-app-vmvp35/code/scripts/linkedin-worker/config.py
/etc/dokploy/applications/buildairesume-app-vmvp35/code/scripts/linkedin-worker/normalizer.py
```

### Environment Variables Set (but non-functional)

```
JOBSPY_ENABLED=true
JOBSPY_PYTHON_PATH=python3
JOBSPY_WORKER_PATH=./scripts/jobspy-worker.py
LINKEDIN_ENABLED=true
LINKEDIN_BROWSER_PROFILE_DIR=/var/lib/buildairesume/browser-profiles/linkedin
```

## 4. What Works

| Source | Status | Notes |
|--------|--------|-------|
| Greenhouse | ✅ WORKS | Direct API, no subprocess needed |
| Lever | ✅ WORKS | Direct API, no subprocess needed |
| Ashby | ✅ WORKS | Direct API, no subprocess needed |
| Workday | ✅ WORKS | Direct API, no subprocess needed |
| Adzuna | ✅ WORKS | API key-based, no subprocess needed |
| Remotive | ✅ WORKS | Public API, no subprocess needed |
| RemoteOK | ✅ WORKS | Public API, no subprocess needed |
| JobSpy | ❌ BROKEN | Requires Python subprocess |
| LinkedIn | ❌ BROKEN | Requires Python + Playwright + Chromium |

## 5. What Needs to Happen

### Option A: Add Python to Docker Container (Recommended)

1. Add Python 3 to the Dockerfile
2. Copy scripts directory into the container
3. Install `jobspy` pip package in Dockerfile
4. Install Playwright + Chromium in Dockerfile
5. Update Dockerfile to run as root (for Playwright sandbox) or configure sandbox
6. Rebuild and redeploy via Dokploy

### Option B: Run Workers as Separate Services

1. Install Python + jobspy + playwright on VPS host
2. Create systemd services for JobSpy and LinkedIn workers
3. Modify engine.ts to call HTTP endpoints instead of spawning subprocesses
4. More complex but cleaner separation

### Recommendation

**Option A** is simpler and preserves the existing architecture. The Dockerfile needs:
- Python 3 runtime
- pip install jobspy
- Playwright install chromium
- Copy scripts/ directory
- Potentially run as root or configure Playwright sandbox

## 6. Admin Panel

The admin panel at `/admin/dashboard/job-intelligence` has full UI for:
- Source health monitoring
- Ingestion run history
- Worker settings (runtime-configurable via MongoDB)
- Job browser
- Demand queue monitor
- Error tracking

The admin panel is functional but cannot display worker status correctly because the workers never execute.

## 7. Database

- MongoDB Atlas: `mongodb+srv://<REDACTED>@<cluster>.mongodb.net`
- Collections: jobs, jobSources, ingestionRuns, jobEvents, jobMatches, job_ingestion_locks
- Indexes: Properly defined for dedup, search, and scheduling
- No issues with database connectivity

## 8. Security Concerns

- LinkedIn OAuth credentials are in container environment variables (visible via `docker inspect`)
- MongoDB connection string with password is in environment variables
- No volume mounts for sensitive data (good)
- Workers run as `nextjs` user (UID 1001) — may need root for Playwright sandbox
