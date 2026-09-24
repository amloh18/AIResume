# Application Pipeline Architecture — Implementation Plan

## Current State Summary

### What exists today

| Layer | Status | Models/Files |
|-------|--------|-------------|
| **Job Ingestion** | FULLY FUNCTIONAL | 9 source adapters in `engine.ts`, demand-driven scheduler, Docker service |
| **Job Storage** | FULLY FUNCTIONAL | `jobs` collection, freshness scoring, deduplication |
| **Candidate Profile** | FULLY FUNCTIONAL | `JobSearchProfile`, `candidateProfileExtractor` |
| **Matching** | FULLY FUNCTIONAL | `deterministicScoring` (7-dimension), `smartSkillMatcher` |
| **Application Journey** | FULLY FUNCTIONAL | `ApplicationJourney` (15 imports) — CV tailoring, cover letters, steps |
| **ATS Automation** | FULLY FUNCTIONAL | `unifiedApplyService`, `atsPlaywrightService` (Greenhouse, Lever, Ashby, Workable) |
| **Email (outbound)** | FULLY FUNCTIONAL | `ApplicationEmailQueue` + `emailWorker` (setInterval on boot) |
| **Email (inbound)** | FULLY FUNCTIONAL | `emailIngestionService` (Stalwart JMAP polling) |
| **Notifications** | FULLY FUNCTIONAL | 60+ types, `NotificationQueue`, SSE delivery |
| **Application Tracking** | FUNCTIONAL | `JobApplication` (27 imports), rich tracker with contacts/interviews/follow-ups |
| **Audit Logging** | FUNCTIONAL | `ApplicationEvent`, `ActivityLog`, `AdminAuditLog` |

### What's broken

| Gap | Problem | Impact |
|-----|---------|--------|
| **3 overlapping models** | `JobApplication` (27 imports), `Application` (2 imports), `ApplicationUnified` (0 imports) | Different parts of the system read/write different records, inconsistent state |
| **ApplicationQueue unused** | Model exists, `ApplicationRun` exists, but nothing polls them | Queue sits idle, no autonomous processing |
| **No decision pipeline** | `UnifiedApplyService.apply()` is called directly from API routes | No eligibility checks, no duplicate detection, no confidence gating |
| **Playwright runs inline** | API request → Playwright → wait → response | One slow application blocks HTTP, no concurrency |
| **No background processor** | `autoapply-processor.ts` has `startAutoApplyProcessor()` but nothing calls it | Auto-apply requires manual API trigger |
| **Reconciliation worker dead code** | `reconciliationWorker.ts` exists but nothing calls `.start()` | Stuck applications never recovered |
| **ApplicationEvent refs wrong model** | `applicationId` refs `'ApplicationUnified'` (unused model) | Audit trail points to nothing |

---

## Phase 1: Canonical Application Model (GAP 12)

**Goal:** Eliminate the three-model confusion. One canonical `Application` model.

### Decision: Which model wins?

**Keep `JobApplication`** as the canonical model. Reasons:
- Already has 27 imports across the codebase
- Has the richest schema (contacts, interviews, follow-ups, attachments, skill gaps, interview coach)
- Is the user-facing tracker — renaming it would break the dashboard
- Has production data

**Kill `ApplicationUnified`** — defined but never imported. It was a planned migration target that was never adopted.

**Convert `Application`** — its state machine concepts (`currentStage`, `internalStatus`, `stageHistory`, `evidence`) are valuable but its lean schema should be merged INTO `JobApplication`, not kept as a separate model.

### 1.1 Extend `JobApplication` schema

Add the state machine fields from `Application` into `JobApplication`:

```
JobApplication additions:
  - currentStage: String (enum: saved/staging/applied/interview/offer/rejected)
  - internalStatus: String (granular automation state)
  - stageHistory: Array of { from, to, timestamp, source, reason }
  - evidence: { confirmationId, confirmationUrl, confirmationText, emailMessageId, capturedAt, verificationConfidence }
  - applicationMethod: String (manual/auto)
  - automationEnabled: Boolean
  - automationRunId: String (ref to ApplicationRun)
  - attempts: Number
  - lastAttemptAt: Date
  - nextRetryAt: Date
  - failureCode: String
  - failureReason: String
  - lockedAt: Date
  - lockedBy: String
```

### 1.2 Migration strategy

1. Add new fields to `JobApplication` schema (backward-compatible — all optional)
2. Write a migration script that copies data from `Application` → `JobApplication` for any records that exist in both
3. Update `ApplicationStateMachine` to operate on `JobApplication` instead of `Application`
4. Update `ApplicationEvent.applicationId` ref from `'ApplicationUnified'` to `'JobApplication'`
5. Update `ApplicationRun.applicationId` to reference `JobApplication`
6. After verification, drop `Application` and `ApplicationUnified` collections

### 1.3 Files to modify

- `src/models/JobApplication.ts` — add state machine fields
- `src/models/Application.ts` — mark as deprecated
- `src/models/ApplicationUnified.ts` — delete
- `src/lib/application-state/stateMachine.ts` — use `JobApplication` instead of `Application`
- `src/lib/staging/stagingCoordinator.ts` — use `JobApplication`
- `src/models/ApplicationEvent.ts` — change ref to `'JobApplication'`
- `src/models/ApplicationRun.ts` — already references `applicationId` (update if needed)

### Verification criteria

- [ ] `JobApplication` schema has all fields from both old models
- [ ] `ApplicationStateMachine` creates/reads `JobApplication` records
- [ ] `ApplicationEvent` refs `JobApplication`
- [ ] No code imports `Application` or `ApplicationUnified`
- [ ] Migration script handles existing production data
- [ ] `npm run typecheck` passes

---

## Phase 2: Application State Machine (GAP 10 partial)

**Goal:** Define every valid state and transition. Enforce transitions in one service.

### 2.1 State definitions

**Canonical stages** (user-visible):
```
saved → staging → applied → interview → offer → rejected
```

**Internal statuses** (automation granularity):
```
saved
staging_cv_generating
staging_cover_letter_generating
staging_ready
queued
processing
form_detected
submitting
verification
applied
automation_failed
automation_unknown
review_required
interview
offer
rejected
```

**Queue statuses** (for ApplicationQueue):
```
queued → processing → completed / failed / dead_letter / cancelled
```

### 2.2 Transition rules

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  saved:               ['staging', 'applied', 'rejected'],
  staging:             ['saved', 'applied', 'rejected'],
  applied:             ['interview', 'offer', 'rejected', 'staging'],
  interview:           ['offer', 'rejected', 'applied'],
  offer:               ['rejected', 'applied'],
  rejected:            ['saved', 'staging', 'applied'],
};
```

### 2.3 Files to modify

- `src/lib/application-state/stateMachine.ts` — update to use `JobApplication`
- `src/models/JobApplication.ts` — add `stageHistory` array type

### Verification criteria

- [ ] State machine transitions are enforced
- [ ] Invalid transitions throw errors
- [ ] Every transition creates an `ApplicationEvent` record
- [ ] Stage history is maintained

---

## Phase 3: Decision Engine (GAP 10)

**Goal:** A controlled decision layer between matching and execution. "Good match" does NOT mean "auto-apply."

### 3.1 Decision pipeline

```
Job discovered + Match score
        ↓
┌───────────────────────────┐
│  DECISION ENGINE          │
│                           │
│  1. Hard requirements     │  ← Must-pass filters
│  2. Duplicate detection   │  ← Already applied?
│  3. Match confidence      │  ← Score threshold
│  4. ATS compatibility     │  ← Can we auto-apply?
│  5. CV availability       │  ← Can we tailor?
│  6. Disqualifying Qs      │  ← Any blockers?
│  7. Rate limits           │  ← User/system limits
│  8. Risk assessment       │  ← CAPTCHA, anti-bot
│                           │
│  Output: APPROVE / REJECT / REVIEW / SKIP
└───────────────────────────┘
        ↓
   Application Queue
```

### 3.2 Decision result types

```typescript
type DecisionResult = {
  decision: 'approved' | 'rejected' | 'needs_review' | 'skipped';
  reason: string;
  confidence: number;  // 0-1
  checks: DecisionCheck[];
  selectedCvId?: string;
  selectedCoverLetterId?: string;
};

type DecisionCheck = {
  name: string;
  passed: boolean;
  reason: string;
  required: boolean;  // hard requirement vs soft preference
};
```

### 3.3 Files to create

- `src/lib/decision/engine.ts` — main decision engine
- `src/lib/decision/hardFilters.ts` — hard requirement checks
- `src/lib/decision/duplicateCheck.ts` — already-applied detection
- `src/lib/decision/cvSelector.ts` — which CV to use
- `src/lib/decision/riskAssessment.ts` — CAPTCHA/anti-bot risk

### 3.4 Files to modify

- `src/lib/services/unifiedApplyService.ts` — call decision engine before applying
- `src/lib/services/autoapply-processor.ts` — integrate decision engine

### Verification criteria

- [ ] Decision engine evaluates all 7 checks
- [ ] Hard requirements can reject applications
- [ ] Decision results are logged as `ApplicationEvent`
- [ ] No application proceeds without passing decision engine
- [ ] Decision engine is testable in isolation

---

## Phase 4: Queue + Worker (GAP 8, GAP 30)

**Goal:** Applications sit in a queue. A background worker processes them continuously.

### 4.1 Use existing `ApplicationQueue` model

The model already exists at `src/models/ApplicationQueue.ts` with:
- `status: queued | processing | completed | failed | dead_letter | cancelled`
- `priority` (numeric, higher = more urgent)
- `lockedAt`, `lockedBy` (atomic claim)
- `attempts`, `maxAttempts` (retry control)
- `scheduledAt` (delayed processing)
- `idempotencyKey` (unique)

**DO NOT** use the `AutoApplyQueue` model from `autoapply-processor.ts` — it conflicts. Delete it.

### 4.2 Worker architecture

```
┌─────────────────────────────────────────────┐
│          APPLICATION WORKER                  │
│                                              │
│  while (running) {                           │
│    1. claimNextApplication()                 │
│       → findOneAndUpdate(status=queued,      │
│         set status=processing, lockedAt,     │
│         lockedBy=worker-{pid})               │
│                                              │
│    2. runDecisionEngine(application)         │
│       → if REJECTED: mark failed, continue   │
│                                              │
│    3. prepareDocuments(application)          │
│       → tailored CV + cover letter           │
│                                              │
│    4. executeApplication(application)        │
│       → Playwright automation                │
│                                              │
│    5. recordResult(application, result)      │
│       → update status, create events         │
│                                              │
│    6. releaseLock(application)               │
│                                              │
│    await sleep(POLL_INTERVAL);               │
│  }                                           │
└─────────────────────────────────────────────┘
```

### 4.3 Worker implementation

Create `src/workers/applicationWorker.ts`:

```typescript
// Pattern: same as emailWorker.ts
// - setInterval polling (5s)
// - Atomic MongoDB locking
// - Max concurrency: 2 (configurable)
// - Graceful shutdown on SIGTERM/SIGINT
// - Started via instrumentation.ts
```

### 4.4 Concurrency control

```
MAX_CONCURRENT_APPLICATIONS = 2  (default for VPS)
MAX_BROWSER_CONTEXTS = 2
LOCK_TIMEOUT_MS = 5 * 60 * 1000  (5 minutes)
POLL_INTERVAL_MS = 5000
```

### 4.5 Files to create

- `src/workers/applicationWorker.ts` — background queue processor
- `src/lib/worker/claimNext.ts` — atomic queue claim logic
- `src/lib/worker/processApplication.ts` — full processing pipeline

### 4.6 Files to modify

- `src/instrumentation.ts` — add `startApplicationWorker()` on boot
- `src/lib/services/autoapply-processor.ts` — remove inline processing, redirect to queue
- `src/app/api/applications/process/route.ts` — enqueue only, don't process inline

### 4.7 Wire up reconciliation

The existing `src/lib/reconciliation/reconciliationWorker.ts` is dead code. Wire it:

- `src/instrumentation.ts` — add `startReconciliationWorker()` on boot

### Verification criteria

- [ ] Worker starts on application boot
- [ ] Worker claims one application at a time
- [ ] Worker processes application through full pipeline
- [ ] Worker handles failures with retry
- [ ] Worker releases locks on crash (via timeout)
- [ ] Max concurrency is enforced
- [ ] Graceful shutdown works
- [ ] `npm run typecheck` passes

---

## Phase 5: Move Playwright Out of API (GAP 25)

**Goal:** API never runs Playwright. API only enqueues.

### 5.1 Current flow (broken)

```
HTTP POST /api/jobs/auto-apply
    ↓
UnifiedApplyService.apply()
    ↓
Playwright (blocks HTTP response)
    ↓
Return result
```

### 5.2 Target flow

```
HTTP POST /api/jobs/auto-apply
    ↓
Decision Engine → approve/reject
    ↓
Enqueue to ApplicationQueue
    ↓
Return { status: "queued", applicationId: "..." }
          │
          ▼
    Application Worker (background)
          │
          ├── claim
          ├── prepare CV/cover letter
          ├── launch Playwright
          ├── fill form
          ├── submit
          ├── capture evidence
          └── update application status
```

### 5.3 Files to modify

- `src/app/api/jobs/auto-apply/route.ts` — enqueue instead of inline process
- `src/lib/services/unifiedApplyService.ts` — extract `apply()` into worker-callable function
- `src/lib/services/autoapply-processor.ts` — remove inline Playwright, redirect to queue

### Verification criteria

- [ ] API returns immediately with "queued" status
- [ ] No Playwright code runs in API route handlers
- [ ] Application worker picks up queued applications
- [ ] Full automation happens in background

---

## Phase 6: Retry + Recovery (GAP 20)

**Goal:** Failed applications retry intelligently. Stuck applications are recovered.

### 6.1 Retry strategy

```
Failure Type                    → Action
─────────────────────────────────────────────
NETWORK_ERROR                   → retry (exponential backoff)
ATS_TEMPORARY_ERROR             → retry (1 hour delay)
CAPTCHA_DETECTED                → needs_human (no retry)
MISSING_REQUIRED_FIELD          → needs_human (no retry)
UNSUPPORTED_ATS                 → failed_permanent (no retry)
DUPLICATE_APPLICATION           → skip (no retry)
RATE_LIMITED                    → retry (scheduled delay)
SUBMISSION_UNCONFIRMED          → retry (1 attempt)
```

### 6.2 Exponential backoff

```
Attempt 1: immediate
Attempt 2: 5 minutes
Attempt 3: 30 minutes
Attempt 4: 2 hours
Attempt 5+: dead letter
```

### 6.3 Stuck application recovery

The existing `reconciliationWorker.ts` handles this:
- Scans for `processing` applications stuck > 10 minutes
- Resets to `queued` for retry
- Logs recovery event

### 6.4 Files to modify

- `src/workers/applicationWorker.ts` — implement retry logic
- `src/lib/reconciliation/reconciliationWorker.ts` — wire into boot
- `src/models/ApplicationQueue.ts` — ensure `nextRetryAt` is used for scheduling

### Verification criteria

- [ ] Retryable failures are retried with backoff
- [ ] Permanent failures go to dead letter
- [ ] CAPTCHA detection halts with needs_human
- [ ] Stuck applications are recovered by reconciliation worker
- [ ] Retry counts are tracked

---

## Phase 7: Connect Existing Systems

**Goal:** Wire all the strong subsystems together.

### 7.1 Connect email ingestion to application state

Current: `emailIngestionService.ts` creates `Communication` records but doesn't reliably update `JobApplication.status`.

Fix: When email classification is high-confidence, update `JobApplication.currentStage` and emit `ApplicationEvent`.

### 7.2 Connect ApplicationJourney to Application

Current: `ApplicationJourney` (15 imports) tracks the multi-step workflow but isn't linked to the canonical application state.

Fix: When `ApplicationJourney.status = 'completed'`, create or update `JobApplication` record.

### 7.3 Connect ApplicationOutcomeService

Current: `applicationOutcomeService.ts` records outcomes but is best-effort.

Fix: Make it a required step in the worker pipeline after every submission attempt.

### 7.4 Files to modify

- `src/services/emailIngestionService.ts` — update JobApplication on high-confidence classification
- `src/app/api/application-journey/[id]/complete/route.ts` — create/update JobApplication
- `src/lib/services/applicationOutcomeService.ts` — integrate into worker pipeline

### Verification criteria

- [ ] Email classification updates application status
- [ ] Journey completion creates application record
- [ ] Application outcomes are recorded for every attempt
- [ ] All events are audited

---

## Execution Order

```
Phase 1: Canonical Model           (data integrity first)
    ↓
Phase 2: State Machine             (define valid transitions)
    ↓
Phase 3: Decision Engine           (intelligence before action)
    ↓
Phase 4: Queue + Worker            (background processing)
    ↓
Phase 5: Move Playwright Out       (reliability)
    ↓
Phase 6: Retry + Recovery          (resilience)
    ↓
Phase 7: Connect Systems           (integration)
```

Each phase builds on the previous. No phase should be skipped.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Migration breaks production data | Run migration script with `--dry-run` first. Keep old collections for 30 days. |
| Worker consumes too many VPS resources | Start with `MAX_CONCURRENT_APPLICATIONS=2`. Monitor CPU/RAM. |
| State machine rejects valid transitions | Log rejected transitions. Add monitoring. Allow manual override via admin API. |
| Decision engine is too conservative | Start with generous thresholds. Tune based on outcome data. |
| Playwright timeouts in worker | Worker has its own timeout (5 min). Browser context is isolated. |
| Email ingestion misses classifications | Regex classifier is ~80% accurate. AI classifier can be added later. |

---

## Success Metrics

After full implementation:

| Metric | Current | Target |
|--------|---------|--------|
| Applications queued automatically | 0 | >0 |
| Applications processed without human | 0 | >0 |
| Time from match to submission | Manual (hours/days) | <5 minutes (auto) |
| Application success rate tracking | Stub | Per-source, per-ATS |
| Stuck application recovery | None | <10 minutes |
| API response time for /auto-apply | Blocked by Playwright (10-30s) | <500ms (enqueue only) |

---

## Non-Goals (Explicitly NOT doing)

- ❌ AI browser-clicking agent (AGENTS.md golden rule)
- ❌ Migrating MongoDB to PostgreSQL
- ❌ Replacing the CV editor
- ❌ Adding new job sources (existing 9 are sufficient)
- ❌ Replacing Stalwart email infrastructure
- ❌ CAPTCHA solving
- ❌ Anti-bot bypass

---

## File Inventory

### Files to create (7)
1. `src/workers/applicationWorker.ts`
2. `src/lib/worker/claimNext.ts`
3. `src/lib/worker/processApplication.ts`
4. `src/lib/decision/engine.ts`
5. `src/lib/decision/hardFilters.ts`
6. `src/lib/decision/duplicateCheck.ts`
7. `src/lib/decision/riskAssessment.ts`

### Files to modify (16)
1. `src/models/JobApplication.ts` — add state machine fields
2. `src/models/ApplicationEvent.ts` — change ref to JobApplication
3. `src/models/ApplicationQueue.ts` — no changes (already correct)
4. `src/lib/application-state/stateMachine.ts` — use JobApplication
5. `src/lib/staging/stagingCoordinator.ts` — use JobApplication
6. `src/instrumentation.ts` — add application worker + reconciliation worker
7. `src/app/api/jobs/auto-apply/route.ts` — enqueue only
8. `src/lib/services/unifiedApplyService.ts` — extract worker-callable functions
9. `src/lib/services/autoapply-processor.ts` — remove conflicting AutoApplyQueue, redirect to queue
10. `src/app/api/applications/process/route.ts` — enqueue only
11. `src/services/emailIngestionService.ts` — update JobApplication on classification
12. `src/app/api/application-journey/[id]/complete/route.ts` — create JobApplication
13. `src/lib/services/applicationOutcomeService.ts` — integrate into worker
14. `src/lib/reconciliation/reconciliationWorker.ts` — wire into instrumentation

### Files to delete (2)
1. `src/models/Application.ts` — merged into JobApplication
2. `src/models/ApplicationUnified.ts` — never used

### Files to deprecate (1)
1. `src/models/ApplicationRun.ts` — functionality absorbed into ApplicationQueue + ApplicationEvent
