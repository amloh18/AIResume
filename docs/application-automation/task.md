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

## P5 — User Control & Approval Flow (IN PROGRESS)

Goal: the user can always see WHY an application is waiting/failing, WHAT action
is required, and has a working control to act — across list, kanban, journey
sidebar, and notifications. Queued work shows an estimated completion time.

- [x] 5.1 Backend: `POST /api/applications/[id]/automation` — actions `approve` (requeue existing ApplicationQueue item with `mode:'auto'`, or create one when orphaned), `dismiss` (user applies manually; clears `review_required`), `retry` (requeue failed/dead-lettered item); ownership checks; response carries queue ETA. Implemented as `applicationAutomationActionService` (15 unit tests) + thin route; quota consumed only on the orphan-create path; refuses to re-submit an unverified submission (double-apply hazard).
- [x] 5.2 Notification: new types `application_approval_required`, `application_action_required` (manual/CAPTCHA/watchdog parks) + `application_automation_failed` (model union + schema enum + default prefs); `applicationActionNotifier` called by the application worker on park/failure with working deep link `/dashboard/jobs?tab=applications&jobId=<id>`; 24h per-type+application dedupe; never breaks the pipeline (8 unit tests); approve/dismiss marks matching unread notifications read.
- [x] 5.3 Queue ETA: `src/lib/utils/queue-eta.ts` (position + etaSeconds from sorted active queue items; 75s/application, clamped 30s–30min; claims in worker order `priority desc, scheduledAt asc`); `/api/jobs` attaches `queuePosition`/`queueEtaSeconds` for rows with an active queue item (8 unit tests).
- [x] 5.4 Status badge carries required action: `deriveApplicationStatusBadge` returns `action {id,label}` (Approve & submit / Apply manually / Retry / Take over) + `eta` for queued/submitting rows; `automation_dismissed` + `automation_unknown` states mapped; unverified-submission parks get NO one-click submit (13 tests).
- [x] 5.5 List + kanban: shared `JobStatusActionChip` (single derivation renderer) with action button beside the status chip in JobsListView and on kanban cards (JobsKanbanView/JobKanbanCard, incl. expired section), wired through ApplicationsPanel `handleAutomationAction` to 5.1 with toast + `jobUpdated` refresh + `loadData()` re-sync; dismiss opens the posting in a new tab.
- [x] 5.6 Journey sidebar analytics: guidanceHub overrides for every pipeline state (review_required → Approve & Submit primary with loadingLabel; unverified → verify-only, no re-submit; manual/CAPTCHA → Apply Manually; queued → ETA + Refresh; failed → Retry; unknown → verify; dismissed → open posting + mark applied); stage timeline now produces the previously-dead `blocked`/`failed` states with real labels ("Awaiting your approval", "~X min left") and reason copy.
- [x] 5.7 Flow explainer: "Application Flow" stepper (BUILD → MATCH → TAILOR → SUBMIT → TRACK) above Next Action in the analytics tab; per-state position note (parked/running/failed/manual/ready) derived from the same pipeline fields; honesty rules documented in `applicationFlow` memo.
- [x] 5.8 Fix broken attention surfaces: `NeedsAttentionWidget` + `RedesignedDashboardView` no longer read non-existent `job.automationStatus`; they query real pipeline fields (`internalStatus`/`reviewReason`/`deadLetter`/`skipReason`/`emailStatus`) and keep the working `jobId` deep link; widget's impossible `status=needs_input,failed` query (always empty) replaced with a real filter.
- [ ] 5.9 Verify: unit tests green (662 passed / 0 failed), `tsc --noEmit` clean, `npm run lint` 0 errors — DONE; **browser check of approve/dismiss/retry on local dev still pending (VPS/Mongo tunnel unreachable at time of verification — 100% packet loss to 192.168.1.8)**; update this checklist + `docs/application-automation/application-flow.md` (created).
