# LinkedIn Worker — VPS Setup Guide

## Overview

The LinkedIn Worker is an isolated background process that discovers jobs on LinkedIn using Playwright browser automation. It runs independently from the Next.js application and communicates via stdin/stdout JSON protocol.

## Architecture

```
Next.js (engine.ts) → spawns worker.py → Playwright → LinkedIn → normalized jobs → stdout
```

The worker is **not** part of the Next.js request lifecycle. User searches never trigger LinkedIn scraping directly.

## VPS Setup

### 1. Install Python dependencies

```bash
cd /opt/buildairesume
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/linkedin-worker/requirements.txt
playwright install chromium
```

### 2. Create the browser profile directory

```bash
sudo mkdir -p /var/lib/buildairesume/browser-profiles/linkedin
sudo chmod 700 /var/lib/buildairesume/browser-profiles/linkedin
```

### 3. Authenticate LinkedIn (one-time)

```bash
# On the VPS with a display (or via SSH with X forwarding)
LINKEDIN_ENABLED=true python3 scripts/linkedin-worker/login_linkedin.py
```

This opens a browser window. Log in to LinkedIn manually, then press ENTER to save the session.

### 4. Configure environment variables

Add to your `.env` file:

```bash
LINKEDIN_ENABLED=true
LINKEDIN_BROWSER_PROFILE_DIR=/var/lib/buildairesume/browser-profiles/linkedin
LINKEDIN_MAX_SEARCHES_PER_RUN=5
LINKEDIN_MAX_PAGES_PER_SEARCH=2
LINKEDIN_MAX_JOBS_PER_SEARCH=100
LINKEDIN_MAX_RUNTIME_SECONDS=600
LINKEDIN_COOLDOWN_SECONDS=60
LINKEDIN_DRY_RUN=false
LINKEDIN_DEBUG=false
```

### 5. Test the worker manually

```bash
LINKEDIN_ENABLED=true python3 scripts/linkedin-worker/worker.py << 'EOF'
{"tasks": [{"keyword": "software engineer", "location": "United States", "remote": true, "postedWithinHours": 168}]}
EOF
```

### 6. Install as systemd service (optional)

```bash
sudo cp scripts/linkedin-worker/buildairesume-linkedin-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable buildairesume-linkedin-worker
sudo systemctl start buildairesume-linkedin-worker
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LINKEDIN_ENABLED` | `false` | Enable the LinkedIn worker |
| `LINKEDIN_BROWSER_PROFILE_DIR` | `/var/lib/buildairesume/browser-profiles/linkedin` | Persistent browser profile path |
| `LINKEDIN_MAX_SEARCHES_PER_RUN` | `5` | Maximum search queries per run |
| `LINKEDIN_MAX_PAGES_PER_SEARCH` | `2` | Maximum result pages per search |
| `LINKEDIN_MAX_JOBS_PER_SEARCH` | `100` | Maximum jobs to discover per search |
| `LINKEDIN_MAX_RUNTIME_SECONDS` | `600` | Maximum runtime before forced stop |
| `LINKEDIN_COOLDOWN_SECONDS` | `60` | Delay between searches |
| `LINKEDIN_WORKER_CONCURRENCY` | `1` | Max concurrent browser instances |
| `LINKEDIN_DRY_RUN` | `false` | Run without writing to database |
| `LINKEDIN_DEBUG` | `false` | Enable debug screenshots/logs |
| `LINKEDIN_DEBUG_DIR` | `/var/lib/buildairesume/debug/linkedin` | Debug output directory |

## Authentication States

The worker detects these states:

- **AUTHENTICATED** — Session is valid, proceed with scraping
- **AUTH_REQUIRED** — Manual login needed (run `login_linkedin.py`)
- **BLOCKED** — LinkedIn has restricted access
- **CHALLENGE** — CAPTCHA or verification challenge presented
- **UNKNOWN** — Cannot determine state

## Cancellation

The worker handles SIGTERM for graceful shutdown:
1. Stops new searches
2. Closes browser safely
3. Preserves metrics for completed work
4. Reports status as CANCELLED (not FAILED)

## Security

- No credentials stored in code
- No credentials in MongoDB
- Browser profile stored only on VPS with restrictive permissions (0700)
- Debug screenshots stored outside repository
- Never committed to Git
