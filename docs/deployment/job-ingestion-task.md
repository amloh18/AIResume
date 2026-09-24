# Job Ingestion VPS Implementation Task

## Phase 1: Repository Architecture Verified
- [x] Read AGENTS.md
- [x] Identified all source files
- [x] Understood ingestion engine architecture
- [x] Found JobSpy and LinkedIn worker scripts

## Phase 2: VPS Environment Verified
- [x] SSH access confirmed
- [x] OS: Ubuntu 26.04, x86_64, Intel i5-5250U, 7.2GB RAM
- [x] Docker 29.7.2, Docker Compose v5.5.0
- [x] Python 3.14.4 (system-wide)
- [x] No Node.js in PATH (only in containers)
- [x] No Chromium/Chrome installed
- [x] No jobspy pip package
- [x] No playwright pip package

## Phase 3: Current Worker Architecture Verified
- [x] Identified execution chain: Admin/Cron → engine.ts → spawn python
- [x] Confirmed ROOT CAUSE: Container lacks Python, scripts, Playwright
- [x] Scripts exist on VPS host at /etc/dokploy/applications/
- [x] Container has NO volume mounts for scripts
- [x] Container has NO Python runtime
- [x] Container has NO Chromium/Playwright

## Phase 4: JobSpy Implementation Verified
- [x] scripts/jobspy-worker.py exists in repo
- [x] Reads JSON from stdin, writes JSON to stdout
- [x] Uses `from jobspy import scrape_jobs`
- [x] BROKEN: jobspy pip package not installed in container
- [ ] JobSpy dependencies isolated

## Phase 5: LinkedIn Worker Verified
- [x] scripts/linkedin-worker/worker.py exists in repo
- [x] Uses Playwright for browser automation
- [x] BROKEN: Playwright not installed in container
- [x] BROKEN: No Chromium in container
- [x] BROKEN: No scripts directory in container
- [ ] LinkedIn browser automation functional

## Phase 6: Puppeteer/Playwright Environment Verified
- [x] No Puppeteer used (Playwright is the browser automation tool)
- [x] Playwright referenced in Dockerfile with PUPPETEER_SKIP_DOWNLOAD=true
- [x] Playwright not in package.json dependencies
- [ ] Playwright installed in container
- [ ] Chromium compatible with container

## Phase 7: Puppeteer VPS Compatibility
- [x] Container runs as nextjs user (UID 1001)
- [x] Playwright needs Chromium sandbox configuration
- [ ] Playwright browser launch tested in container

## Phase 8: Worker Architecture
- [x] setInterval-based scheduler (not cron)
- [x] Per-source circuit breaker
- [x] MongoDB-based distributed locking
- [x] Batch upsert with provenance merging
- [ ] RetryManager exists but is unused

## Phase 9: Source Adapters
- [x] JobSource interface defined
- [x] 8 sources implemented (Greenhouse, Lever, Ashby, Workday, Adzuna, Remotive, RemoteOK, JobSpy)
- [x] LinkedIn via browser worker
- [ ] Source isolation verified

## Phase 10: Normalization
- [x] Master normalizer with SHA-256 canonicalId
- [x] Company, location, salary, skills, title normalization
- [ ] Normalization tested with real data

## Phase 11: Deduplication
- [x] 3-tier detection (L1 source ID, L2 fingerprint, L3 similarity)
- [x] Cross-source dedup via deduplicationService
- [ ] BUG: DeduplicationService queries 'discoveredjobs' instead of 'jobs'
- [ ] Deduplication verified

## Phase 12: Idempotency
- [x] BulkWrite upsert with canonicalId
- [x] Content hash comparison for updates
- [ ] Idempotency verified

## Phase 13: Failure Handling
- [x] Circuit breaker per source
- [x] RetryManager exists (unused)
- [ ] RetryManager integrated into SourceRunner
- [ ] Failure handling tested

## Phase 14: Job Quality
- [x] 3-axis scoring (candidate fit, opportunity quality, application readiness)
- [x] Hard filters (work auth, location, salary, employment type)
- [ ] Job quality scoring tested

## Phase 15: Worker Health
- [x] HTTP health endpoint (/health)
- [x] Metrics endpoint (/metrics)
- [x] Circuit breaker state tracking
- [ ] Worker health status displayed correctly in admin

## Phase 16: Admin Panel
- [x] JobIntelligenceDashboard with 13 components
- [x] Source health panel
- [x] Runs explorer
- [x] Worker settings panel
- [ ] Worker status reflects actual execution

## Phase 17-23: Docker/Dokploy, Process Lifecycle, DB, Security
- [x] Dockerfile uses node:22-bookworm-slim
- [x] No Python in Dockerfile
- [x] No scripts copied in Dockerfile
- [x] No volume mounts
- [x] MongoDB Atlas connectivity verified
- [ ] Dockerfile updated with Python + Playwright
- [ ] Scripts directory copied into container
- [ ] Container rebuilds successfully

## Phase 24-25: End-to-End Tests
- [ ] JobSpy end-to-end test passed
- [ ] LinkedIn end-to-end test passed
- [ ] Playwright worker test passed
- [ ] Restart test passed
- [ ] Failure recovery test passed

## Phase 27-30: Task File, Deployment, Verification
- [x] VPS audit document created
- [x] Task file created
- [ ] Dockerfile modified
- [ ] Container rebuilt and redeployed
- [ ] All sources verified working
- [ ] Admin panel verified
- [ ] Final report created
