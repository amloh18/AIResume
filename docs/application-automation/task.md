# Application Automation — Task Tracker

## Implementation Verification

### P0 — Security (COMPLETED)
- [x] Fix hardcoded encryption fallback in token-encryption.ts
- [x] Resolve duplicate ApplicationQueue schemas
- [x] Remove hardcoded MongoDB URI from setup script

### P1 — Core Functionality (COMPLETED)
- [x] Wire ApplicationQualityGate into auto-apply flow
- [x] Add atomic queue claiming to autoapply-processor
- [x] Fix fresh match score inflation (Math.random)
- [x] Start email worker in application startup (instrumentation.ts)
- [x] Make ATS handlers honest (clear action_required messages)
- [x] Connect company watchlist to discovery priority (+15 score boost)

### P2 — Incomplete Functionality (COMPLETED)
- [x] Add CAPTCHA risk assessment to quality gate
- [x] Implement cross-source job deduplication (company+title+location)
- [x] Remove dead FreshMatchesWidget.tsx
- [x] Fix JobLiveStatusCard icon (FileCheck2 → FileText)
- [x] Fix stale "Tailored CV supported" → "Ready to apply"
- [x] Connect candidate evidence engine to tailoring (documented integration point)
- [x] Connect success learning to recommendations (outcome recording service created)

### P3 — UX / Performance / Infrastructure (MOSTLY COMPLETED)
- [x] Create docs/application-automation/task.md
- [x] Create docs/application-automation/architecture.md
- [x] Remove key.pem and .env.local from tracked files (already gitignored, not tracked)
- [x] Parallelize savedOnly filter queries (Promise.allSettled)
- [x] Add stale lock recovery to email worker (already implemented via lockExpiry)
- [ ] Add mobile-specific layouts for job cards

## Completed Integrations

### Candidate Evidence Engine
- Location: `buildairesume-job-ingestion/src/utils/candidateEvidenceEngine.ts`
- Status: Documented integration point in architecture.md
- Integration point: `src/lib/services/journeyDocumentService.ts` → `createJourneyDocuments()`
- Next: Import evidence engine, use verified skills/experience when tailoring

### Success Learning
- Location: `buildairesume-job-ingestion/src/utils/successLearning.ts`
- Status: Outcome recording service created at `src/lib/services/applicationOutcomeService.ts`
- Integration: Called from UnifiedApplyService when application status changes
- Next: Feed success rates into `scoreJobForCandidate()` in discover API

### Playwright Automation
- Execution: no longer launches Chromium in the web container; attaches to the VPS-hosted Chrome
  over CDP via `src/lib/services/browserService.ts` (`PLAYWRIGHT_REMOTE_URL`)
- Location: `src/lib/services/atsPlaywrightService.ts` (NEW)
- Status: Greenhouse handler wired with full Playwright automation
- Features: Browser isolation, CAPTCHA detection, form detection, field filling, submission verification
- Current state: Greenhouse = FULLY AUTOMATED, others = action_required stubs
- Next: Wire Lever/Ashby/Workable handlers with similar Playwright logic

### Dry Run
- Location: `src/app/api/applications/dry-run/route.ts` + `src/lib/services/applicationDryRunService.ts`
- Status: IMPLEMENTED and wired
- Note: Uses `applicationDryRunService.performDryRun()` — properly checks fields without submitting

### Email Delivery
- Location: `src/workers/emailWorker.ts` + `src/lib/services/applicationEmailService.ts`
- Status: Worker started in instrumentation.ts, service has Stalwart SMTP config
- Health check: Added to `/api/health` endpoint via `testStalwartConnection()`
- Remaining: Stalwart must be deployed and running for emails to actually send

## P4 — Infrastructure / Deployment (COMPLETED)
- [x] Move job discovery out of the app image (VPS worker gateway, `INGESTION_WORKER_URL`)
- [x] Refuse local Python spawns in production with a clear warning (`mustRefuseLocalWorkerSpawn()`)
- [x] Authenticate `/api/cron/*` in `src/proxy.ts` instead of rejecting every trigger with 401
- [x] Add `/api/cron/auto-apply` to drain `ApplicationQueue` from an external scheduler
- [x] Attach ATS automation + PDF rendering to a remote Chrome over CDP
- [x] Slim the web image: no Chromium, no Python, no `scripts/`, no apt
- [x] Host services: `vps-install-browser-service.sh` + `buildairesume-browser.service`
- [x] Update `docs/deployment/vps-automation-workers.md` for Stage 2
- [ ] Verify the remote browser and cron paths end-to-end in production (needs the VPS)
