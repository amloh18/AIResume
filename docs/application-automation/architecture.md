# Application Automation — Architecture

## Overview

BuildAIResume's application automation pipeline handles:

1. **Job Discovery** — Ingest jobs from multiple sources
2. **Job Matching** — Score jobs against candidate profile
3. **Application Preparation** — Generate tailored CV + cover letter
4. **Quality Gate** — Verify preconditions before submission
5. **Application Submission** — Submit via API or Playwright automation
6. **Email Delivery** — Send application emails via Stalwart
7. **Tracking** — Track application status through lifecycle
8. **Outcome Learning** — Record outcomes for success rate analysis

## Data Flow

```
User clicks "Apply"
    ↓
/api/jobs/auto-apply (POST)
    ↓
UnifiedApplyService.apply()
    ↓
┌─────────────────────────────────────┐
│ 1. Find/Create JobApplication        │
│ 2. Ensure Journey + Documents        │
│ 3. Generate Screening Answers        │
│ 4. Quality Gate Check                 │
│    - Candidate verification          │
│    - Job verification                 │
│    - URL verification                 │
│    - Duplicate check                  │
│    - Screening readiness              │
│    - CAPTCHA risk assessment          │
│ 5. Route to ATS Handler              │
│ 6. Record Outcome                    │
└─────────────────────────────────────┘
    ↓
ATS Handler
    ↓
┌─────────────────────────────────────┐
│ Naukri: API-based apply              │
│ Greenhouse: Playwright automation    │
│ Others: action_required (stubs)      │
└─────────────────────────────────────┘
    ↓
JobApplication status updated
    ↓
Email queued → Email Worker → Nodemailer → Stalwart → SMTP
    ↓
Outcome recorded → Success Learning
```

## Key Components

### UnifiedApplyService (`src/lib/services/unifiedApplyService.ts`)
- Central orchestrator for all application submissions
- Handles: findOrCreateJobApplication, ensureJourneyAndDocuments, screeningAnswers, qualityGate, ATS routing, outcome recording
- Each ATS type has a dedicated handler method

### ATS Playwright Service (`src/lib/services/atsPlaywrightService.ts`)
- Deterministic browser automation for ATS form filling
- Features:
  - Browser isolation (new context per application)
  - CAPTCHA detection (reCAPTCHA, hCaptcha, Turnstile)
  - Form field detection (standard + custom fields)
  - Deterministic field filling
  - File upload handling
  - Submission verification (success text, confirmation URL, confirmation ID)
  - Screenshot on failure
- Currently wired: Greenhouse
- Planned: Lever, Ashby, Workable

### ApplicationQueue (`src/models/ApplicationQueue.ts`)
- MongoDB-backed queue with priority, scheduling, locking
- Used by `autoapply-processor.ts` for batch processing

### AutoApplyQueue (in `src/lib/services/autoapply-processor.ts`)
- Separate queue model for auto-apply job processing
- Includes: quota management, rate limiting, retry with exponential backoff

### Quality Gate (in `src/lib/services/unifiedApplyService.ts`)
- Runs before ATS routing
- Checks: candidate, job, URL, duplicate, screening, CAPTCHA risk
- Fails → keeps in staging with clear reason

### Application Outcome Service (`src/lib/services/applicationOutcomeService.ts`)
- Records application outcomes for success learning
- Tracks: submitted, action_required, response_received, screening_passed, interview_scheduled, etc.
- Powers success rate calculations by dimension (source, atsType, matchScore)

### Email Worker (`src/workers/emailWorker.ts`)
- Polls ApplicationEmailQueue every 5 seconds
- Atomic claiming with lock mechanism
- Retry with exponential backoff (1s, 5s, 15s, 60s)
- Max 2 concurrent emails
- Stale lock recovery via lockExpiry (5-minute timeout)

### Dry Run (`src/app/api/applications/dry-run/route.ts`)
- Detects form fields, maps candidate data
- Does NOT submit
- Returns field detection results

## ATS Handlers

| ATS | Handler | Status | Method |
|-----|---------|--------|--------|
| Naukri | applyToNaukri | IMPLEMENTED | Session-based API |
| Greenhouse | applyToGreenhouse | IMPLEMENTED | Playwright automation |
| Indeed | applyToIndeed | STUB | Returns action_required |
| Lever | applyToLever | IMPLEMENTED | Playwright automation |
| Ashby | applyToAshby | IMPLEMENTED | Playwright automation |
| Workable | applyToWorkable | IMPLEMENTED | Playwright automation |
| Adzuna | applyToAdzuna | STUB | Returns action_required |
| Generic | applyGeneric | STUB | Returns action_required |

### Greenhouse Playwright Flow
1. Acquire a browser — remote Chrome over CDP in production, local launch in development
   (`src/lib/services/browserService.ts`)
2. Create isolated browser context (per application)
3. Navigate to application URL
4. CAPTCHA check → STOP if detected
5. Detect form fields (standard + custom)
6. Fill fields deterministically
7. Upload resume/cover letter
8. CAPTCHA re-check before submission
9. Click submit button
10. Wait for navigation/response
11. Verify submission (success text, confirmation URL)
12. Return result with evidence
13. Clean up browser context (always in finally block)

## Queue Architecture

### ApplicationQueue (canonical)
- Schema: applicationId, userId, jobId, status, priority, attempts, maxAttempts, scheduledAt, lockedAt, lockedBy, idempotencyKey
- Indexes: status+priority+scheduledAt, idempotencyKey (unique)
- Lock mechanism: findOneAndUpdate with status filter

### AutoApplyQueue (auto-apply processor)
- Schema: userId, jobId, jobTitle, company, source, status, priority, retryCount, maxRetries
- Atomic claiming: findOneAndUpdate sets status='processing' + lockedAt
- Retry: exponential backoff (1min, 2min, 4min)

## Email Architecture

```
ApplicationEmailQueue
    ↓
Email Worker (polls every 5s)
    ↓
Atomic claim (findOneAndUpdate)
    ↓
Idempotency check (wasApplicationEmailSent)
    ↓
sendApplicationEmail() → Nodemailer
    ↓
Stalwart (smtp://stalwart:587)
    ↓
External SMTP
```

## Outcome Learning

```
Application Status Change
    ↓
recordApplicationOutcome()
    ↓
ApplicationOutcome collection
    ↓
getSuccessRates() by dimension
    ↓
Feed into match scoring (planned)
```

## Security

- Token encryption: AES-256-GCM (no hardcoded fallback)
- CAPTCHA: Detected → STOP → NEEDS_USER_ACTION
- Browser isolation: New context per application, always cleaned up
- Rate limiting: Hourly/daily/monthly quotas enforced
- Atomic queue claiming: No double-processing

## Browser execution environment

A browser is never launched inside the production web container.
`src/lib/services/browserService.ts` resolves an endpoint from `PLAYWRIGHT_REMOTE_URL` /
`PUPPETEER_BROWSER_WS_ENDPOINT`, and both `unifiedApplyService` (ATS automation) and
`puppeteerPoolService` (PDF rendering) attach to the same headless Chrome, which runs as the
`buildairesume-browser` systemd service on the VPS host. Development falls back to a local launch.
With nothing configured, production reports the browser as unavailable and every caller takes its
manual path instead of waiting for a launch that cannot succeed. See
`docs/deployment/vps-automation-workers.md`.

## Health Checks

- `/api/health` — split by intent: default = liveness (no network I/O, ms-fast, reports `commit`, `version` and `worker: { role, loops }`); `?deep=1` = dependency readiness (database, environment, memory, external services — each under a timeout budget)
- Stalwart SMTP: `testStalwartConnection()` integrated into health check
- Email worker status: `getWorkerStatus()` returns isRunning, activeJobs, maxConcurrent

## Integration Gaps (Remaining)

1. **Stalwart deployment** — Config exists, needs running container
2. **Candidate evidence engine** — Documented integration point, not yet wired to tailoring
3. **Success learning → recommendations** — Outcome recording works, feeding into scoring is planned
4. **Mobile-specific layouts** — Responsive but no mobile-optimized job cards
5. **Remote browser verification** — Wired and typechecked, but the CDP path needs an end-to-end
   run against the VPS-hosted Chrome before it can be called verified
