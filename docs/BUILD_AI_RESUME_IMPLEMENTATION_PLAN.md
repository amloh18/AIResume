# BuildAIResume - Automated Job Application System Implementation Plan

## Executive Summary

This plan implements the first production version of BuildAIResume's automated job application system. The system uses a **BuildAIResume-managed application identity** per user (not Gmail OAuth), a **persistent Playwright browser worker** with concurrency=1, and an **asynchronous pipeline** where Next.js API requests never block on Playwright.

**Architecture rating: 8.5/10** | **Production readiness after corrections: 9/10**

---

## ARCHITECTURE

```
                         BUILDAIRESUME
                              │
                 ┌────────────┴────────────┐
                 │                         │
              DISCOVER                 APPLICATIONS
                 │                         │
                 └────────────┬────────────┘
                              ↓
                         APPLICATION
                              │
                 ┌────────────┴────────────┐
                 │                         │
            PREPARATION                 POLICY
                 │                         │
                 └────────────┬────────────┘
                              ↓
                            READY
                              ↓
                            QUEUE
                              ↓
                       ATOMIC LEASE
                              ↓
                     APPLICATION WORKER
                              │
                       GLOBAL LOCK = 1
                              │
                              ↓
                       PLAYWRIGHT
                              │
                ┌─────────────┼─────────────┐
                ↓             ↓             ↓
            Greenhouse      Lever         Ashby
                │
                ↓
             SUBMIT
                │
                ↓
       SUBMISSION ATTEMPT
                │
        ┌───────┼────────┐
        ↓       ↓        ↓
   CONFIRMED  UNKNOWN  FAILED
        │       │
        │       ↓
        │   RECONCILIATION
        │
        ↓
      EMAIL
        ↓
 Cloudflare Email
        ↓
 ApplicationEmail
        ↓
 Correlation
        ↓
 Application Timeline
        ↓
 User Notification
```

### Hard Architectural Rules

1. **Next.js API requests NEVER block on Playwright** - the browser is completely decoupled from the web request lifecycle
2. **Global concurrency = 1** (configurable, but default and V1 limit)
3. **Queue is the traffic controller** - 100 users → 100 queued applications → ONE worker → ONE browser → ONE at a time
4. **CAPTCHA/MFA = STOP** - never bypass, always require user action
5. **Test mode prevents real submissions** - `APPLICATION_AUTOMATION_MODE=test`

### System Topology

```
Next.js (Vercel/Dokploy)
   │
   ├── MongoDB
   │
   └── Application Queue
             │
             ↓
      Application Worker (VPS, separate process)
             │
             ↓
       Persistent Browser (Chromium)
             │
             ↓
          Portal
```

---

## CORRECTIONS APPLIED (8 Mandatory Changes)

### Correction 1: Greenhouse Does NOT Require Portal Login

MyGreenhouse is optional. Greenhouse applications can be submitted **without an account**. The adapter should NOT begin with `connect() → Sign Up → Login`.

**Correct flow:**
```
Greenhouse job
  ↓
Open job application URL
  ↓
Detect application form
  ↓
Fill fields
  ↓
Upload CV
  ↓
Answer questions
  ↓
Review
  ↓
Submit
  ↓
Confirmation
```

### Correction 2: PortalAccount is Optional

Some portals support anonymous applications. The architecture must support:

```
Portal
 ├── requiresAccount = false
 │       ↓
 │   anonymous application (no PortalAccount needed)
 │
 └── requiresAccount = true
         ↓
     PortalAccount
         ↓
     persistent session
```

`Application.portalAccountId` is `optional`.

### Correction 3: ApplicationSubmissionAttempt Model

The application is the **business object**. The submission attempt is the **execution history**. This distinction is critical for debugging.

### Correction 4: SUBMISSION_STATUS_UNKNOWN + Reconciliation

After clicking Submit, the portal may receive the application while Playwright never sees confirmation. The system must never blindly retry. Instead: reconciliation via portal state, confirmation emails, or user verification.

### Correction 5: Atomic Daily-Quota Reservation

A limit check is not enough. Concurrent requests can bypass a simple check. Use atomic reservation.

### Correction 6: Per-Portal Circuit Breakers

If Greenhouse has 30% failure rate, stop hammering it. Other portals continue.

### Correction 7: No Automatic Recruiter Email Discovery (V1)

Don't search the internet to guess recruiter emails. If the recruiter email is unknown, show "No direct contact available" and let the user add it manually.

### Correction 8: Internal vs User-Facing Statuses

```
Internal:    FORM_FILLING
User-facing: Applying
```

Two separate status concepts reduce UI noise.

---

## PHASE 1: APPLICATION DATA MODEL + STATE MACHINE

### 1.1 Extend Application Model

**File:** `src/models/Application.ts`

Add fields:
```typescript
// Identity reference (not string duplication)
applicationIdentityId?: ObjectId;  // ref: ApplicationIdentity

// Portal
portal?: PortalProvider;
portalAccountId?: ObjectId;        // OPTIONAL - not all portals need accounts
portalApplicationId?: string;      // portal's own ID for this application

// Documents
cvVersionId?: ObjectId;
coverLetterVersionId?: ObjectId;
answers?: IApplicationAnswer[];

// Profile
matchScore?: number;
applicationEmail?: string;         // denormalized for convenience

// Timestamps
stagedAt?: Date;
readyAt?: Date;
queuedAt?: Date;
startedAt?: Date;
submittedAt?: Date;
confirmedAt?: Date;

// Evidence
confirmationUrl?: string;
lastError?: string;
requiresUserAction?: boolean;

// Worker
workerId?: string;
```

### 1.2 Dual Status System

**Internal execution state** (for worker diagnostics):
```typescript
type InternalExecutionState =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'queued'
  | 'claimed'
  | 'browser_starting'
  | 'navigating'
  | 'form_detecting'
  | 'form_filling'
  | 'questions_detected'
  | 'reviewing'
  | 'submitting'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'user_action_required'
  | 'unknown_submission';
```

**User-facing status** (for UI):
```typescript
type UserFacingStatus =
  | 'staged'
  | 'preparing'
  | 'ready'
  | 'queued'
  | 'applying'
  | 'action_required'
  | 'applied'
  | 'confirmed'
  | 'rejected'
  | 'failed'
  | 'unknown';
```

**Mapping:**
```typescript
const INTERNAL_TO_USER_FACING: Record<InternalExecutionState, UserFacingStatus> = {
  idle: 'staged',
  preparing: 'preparing',
  ready: 'ready',
  queued: 'queued',
  claimed: 'queued',
  browser_starting: 'applying',
  navigating: 'applying',
  form_detecting: 'applying',
  form_filling: 'applying',
  questions_detected: 'action_required',
  reviewing: 'applying',
  submitting: 'applying',
  confirming: 'applied',
  completed: 'confirmed',
  failed: 'failed',
  user_action_required: 'action_required',
  unknown_submission: 'unknown',
};
```

### 1.3 ApplicationSubmissionAttempt Model

**New file:** `src/models/ApplicationSubmissionAttempt.ts`

```typescript
interface IApplicationSubmissionAttempt {
  applicationId: ObjectId;
  attemptNumber: number;
  workerId: string;
  
  // Timing
  startedAt: Date;
  submitClickedAt?: Date;
  completedAt?: Date;
  
  // Status
  status: 'prepared' | 'submitting' | 'submitted' | 'confirmed' | 'unknown' | 'failed';
  
  // Portal state
  portalUrl?: string;
  portalApplicationId?: string;
  confirmationUrl?: string;
  
  // Evidence (screenshots stored in R2, referenced here)
  evidenceBeforeSubmit?: string;    // R2 reference
  evidenceAfterSubmit?: string;     // R2 reference
  confirmationEvidence?: string;
  
  // Error
  error?: string;
  errorCode?: string;
  
  createdAt: Date;
}
// Indexes: applicationId+attemptNumber (compound unique), status, workerId
```

### 1.4 Submission State Machine

```
SUBMITTING
    ↓
SUBMISSION_ATTEMPTED
    ↓
CONFIRMING
    ├── CONFIRMED (portal shows success, or confirmation email received)
    ├── FAILED (portal shows error)
    └── SUBMISSION_STATUS_UNKNOWN (clicked submit, no confirmation)
              ↓
         RECONCILIATION
              ├── portal application history check
              ├── confirmation email check
              ├── user manual verification
              └── never auto-retry
```

### 1.5 Application Queue with Leases

**File:** `src/models/ApplicationQueue.ts`

Add fields:
```typescript
// Lease (distinct from global worker lock)
leaseId?: string;
leaseExpiresAt?: Date;
leasedBy?: string;        // worker ID

// Portal pacing
portal?: string;
```

**Lease vs Global Lock:**
- **Global browser lock**: "Who is allowed to operate the browser?" → `ApplicationWorkerLock`
- **Queue lease**: "Who currently owns this application?" → `ApplicationQueue.leaseId`

### 1.6 ApplicationWorkerLock Model

**New file:** `src/models/ApplicationWorkerLock.ts`

```typescript
interface IApplicationWorkerLock {
  lockId: string;              // 'application-worker-global'
  ownerId: string;             // worker process ID
  acquiredAt: Date;
  expiresAt: Date;
  heartbeatAt: Date;
  status: 'acquired' | 'released' | 'expired';
}
```

---

## PHASE 2: APPLICATION IDENTITY SYSTEM

### 2.1 ApplicationIdentity Model

**New file:** `src/models/ApplicationIdentity.ts`

```typescript
interface IApplicationIdentity {
  userId: ObjectId;
  address: string;              // u_7f3k92@jobs.morigrid.com
  localPart: string;            // u_7f3k92
  domain: string;               // jobs.morigrid.com
  status: 'active' | 'disabled' | 'compromised';
  createdAt: Date;
  verifiedAt?: Date;
  disabledAt?: Date;
  disabledReason?: string;
}
// Indexes: userId (unique), address (unique), localPart (unique)
```

**Key design:** Reference by `applicationIdentityId` (ObjectId), not email string. Email is denormalized for convenience.

### 2.2 ApplicationIdentityService

**New file:** `src/lib/services/applicationIdentityService.ts`

- `createIdentity(userId)` - generate `u_` + 8 hex chars via `crypto.randomBytes`
- `getIdentityByUser(userId)` - retrieve
- `getIdentityById(identityId)` - lookup by ObjectId
- `getIdentityByEmail(email)` - lookup by full email
- `disableIdentity(userId, reason)` - soft disable
- `validateUniqueness(localPart)` - check collision

### 2.3 PortalAccount Model (OPTIONAL)

**New file:** `src/models/PortalAccount.ts`

```typescript
interface IPortalAccount {
  userId: ObjectId;
  portal: PortalProvider;
  applicationIdentityId?: ObjectId;  // ref: ApplicationIdentity
  applicationEmail?: string;         // denormalized
  authenticationRequired: boolean;   // NEW: not all portals need accounts
  
  // Account state
  username?: string;
  status: 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'REAUTH_REQUIRED' | 'BLOCKED' | 'DISABLED';
  sessionStatus: 'active' | 'expired' | 'invalid';
  
  // Browser profile (encrypted path reference, never exposed to frontend)
  browserProfileId: string;
  
  // Timestamps
  createdAt: Date;
  lastLoginAt?: Date;
  lastVerifiedAt?: Date;
  lastUsedAt?: Date;
  
  // State
  requiresUserAction: boolean;
  requiresVerification: boolean;
  lastError?: string;
}
// Indexes: userId+portal (compound unique), userId+status
```

### 2.4 ApplicationProfile Model

**New file:** `src/models/ApplicationProfile.ts`

Normalized profile for form filling. **Not another CV** - structured facts only.

```typescript
interface IApplicationProfile {
  userId: ObjectId;
  
  // Personal
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  applicationEmail: string;
  location: string;
  
  // Work
  workAuthorization: string;
  targetRoles: string[];
  
  // Education
  education: Array<{
    degree: string;
    school: string;
    year: number;
    gpa?: number;
  }>;
  
  // Employment
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  
  // Links
  linkedinUrl?: string;
  portfolioUrl?: string;
  
  // Preferences
  salaryPreference?: number;
  availability?: string;
  noticePeriod?: string;
  workplacePreference?: string;
  
  // Versioning
  profileVersion: number;
  lastSyncedAt: Date;
}
// Index: userId (unique)
```

### 2.5 Browser Profile Isolation

**Filesystem layout:**
```
/var/lib/buildairesume/browser-profiles/
    <portal>/
        <encrypted-internal-account-id>/
            Default/
            Local State/
            ...
```

**Rules:**
- Worker never constructs paths from user-controlled IDs
- Use encrypted/internal account ID as directory name
- `chmod 700` on profile directory
- Never expose filesystem path to frontend
- MongoDB stores `profileId`, `portal`, `status`, `metadata`
- Filesystem stores `cookies`, `localStorage`, `session state`

---

## PHASE 3: QUEUE + LEASE + WORKER LOCK

### 3.1 Queue Service

**New file:** `src/lib/applications/queueService.ts`

```typescript
// Core operations
enqueueApplication(params: EnqueueParams): Promise<string>  // returns queueItemId
claimNextApplication(workerId: string): Promise<QueueItem | null>  // atomic findOneAndUpdate
completeApplication(queueItemId: string, status: QueueStatus): Promise<void>
releaseApplication(queueItemId: string): Promise<void>  // release back to queue
deadLetter(queueItemId: string, error: string): Promise<void>

// Queries
getQueueStats(): Promise<QueueStats>
getQueuePosition(applicationId: string): Promise<number>
cleanupStaleLocks(ttlMs: number): Promise<number>
```

**Atomic claiming:**
```typescript
const claimed = await ApplicationQueue.findOneAndUpdate(
  { 
    status: 'queued',
    scheduledAt: { $lte: new Date() }
  },
  {
    $set: {
      status: 'claimed',
      leasedBy: workerId,
      leaseExpiresAt: new Date(Date.now() + LEASE_TTL_MS),
      claimedAt: new Date()
    }
  },
  { new: true, sort: { priority: -1, scheduledAt: 1 } }
);
```

### 3.2 Worker Lock Service

**New file:** `src/lib/applications/workerLockService.ts`

```typescript
acquireLock(workerId: string, ttlMs: number): Promise<boolean>
releaseLock(workerId: string): Promise<void>
heartbeat(workerId: string): Promise<void>
isLocked(): Promise<boolean>
recoverStaleLock(maxStaleMs: number): Promise<string | null>
```

### 3.3 Atomic Daily Quota Reservation

**New file:** `src/lib/applications/quotaService.ts`

```typescript
// Atomic reservation - prevents concurrent requests from bypassing limits
async function reserveQuota(userId: string, portal: string): Promise<QuotaResult> {
  const today = getStartOfDay(userTimezone);
  
  const result = await ApplicationQuota.findOneAndUpdate(
    {
      userId,
      date: today,
      count: { $lt: MAX_PER_DAY }
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { userId, date: today, count: 0 }
    },
    { new: true, upsert: true }
  );
  
  if (!result || result.count > MAX_PER_DAY) {
    // Rollback if over limit
    await ApplicationQuota.findOneAndUpdate(
      { userId, date: today, count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
    return { reserved: false, reason: 'Daily limit reached' };
  }
  
  return { reserved: true, reservationId: result._id };
}

// Release reservation if preparation fails before execution
async function releaseReservation(reservationId: string): Promise<void> {
  await ApplicationQuota.findByIdAndUpdate(
    reservationId,
    { $inc: { count: -1 } }
  );
}
```

### 3.4 Adaptive Polling

```typescript
// Worker polling with backoff
let pollInterval = INITIAL_POLL_MS;  // 2000ms

async function pollLoop() {
  while (running) {
    const item = await claimNextApplication(workerId);
    if (item) {
      pollInterval = INITIAL_POLL_MS;  // reset on work found
      await processApplication(item);
    } else {
      pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_MS);  // backoff to 15s
    }
    await sleep(pollInterval);
  }
}
```

---

## PHASE 4: PREPARATION PIPELINE

### 4.1 Preparation Service

**New file:** `src/lib/applications/preparationService.ts`

```typescript
async function prepareApplication(applicationId: string): Promise<void> {
  // 1. Load application, job, user profile
  // 2. Select CV version
  // 3. Prepare cover letter (if required)
  // 4. Prepare answers with confidence policy
  // 5. Validate against policy
  // 6. Reserve daily quota atomically
  // 7. If all pass → set READY → enqueue
  // 8. If any fail → set appropriate status + release reservation
}
```

### 4.2 Answer Confidence Policy

**New file:** `src/lib/applications/answerConfidencePolicy.ts`

```typescript
type AnswerSafety = 'safe' | 'maybe' | 'never';

const ANSWER_SAFETY_MAP: Record<string, AnswerSafety> = {
  // Safe to auto-answer
  'years_of_experience': 'safe',
  'location': 'safe',
  'work_authorization': 'safe',
  'notice_period': 'safe',
  'workplace_preference': 'safe',
  'linkedin_url': 'safe',
  'portfolio_url': 'safe',
  'education': 'safe',
  
  // Maybe auto-answer (only if confidence high + user policy permits)
  'why_interested': 'maybe',
  'why_company': 'maybe',
  'relevant_experience': 'maybe',
  
  // Never auto-invent
  'sponsorship_required': 'never',
  'legally_authorized': 'never',
  'criminal_history': 'never',
  'disability': 'never',
  'veteran_status': 'never',
  'demographic': 'never',
  'salary_commitment': 'never',
  'certification_claims': 'never',
  'security_clearance': 'never',
};

function getAnswerSafety(questionHash: string): AnswerSafety {
  return ANSWER_SAFETY_MAP[questionHash] ?? 'never';
}

function canAutoAnswer(questionHash: string, userPolicy: boolean): boolean {
  const safety = getAnswerSafety(questionHash);
  if (safety === 'never') return false;
  if (safety === 'maybe') return userPolicy;
  return true;  // 'safe'
}
```

### 4.3 CV Selection Service

**New file:** `src/lib/applications/cvSelectionService.ts`

- `selectCV(userId, jobId, portal)` - choose master or tailored CV
- `verifyCVExists(cvVersionId)` - ensure valid
- `generateTemporaryCV(cvVersionId)` - create upload-ready temp file

---

## PHASE 5: PLAYWRIGHT WORKER FRAMEWORK

### 5.1 Dependencies

```bash
npm install playwright
npx playwright install chromium
```

### 5.2 Worker Entry Point

**New file:** `src/workers/application-worker/index.ts`

```typescript
// Lifecycle:
// 1. Connect to MongoDB
// 2. Acquire global lock
// 3. Start heartbeat interval
// 4. Adaptive poll queue
// 5. Claim next application (lease)
// 6. Process application via Playwright
// 7. Release lock on shutdown
// 8. Handle SIGINT/SIGTERM gracefully
```

**Package.json script:**
```json
"worker:applications": "NODE_ENV=production tsx src/workers/application-worker/index.ts"
```

### 5.3 Browser Manager

**New file:** `src/workers/application-worker/browserManager.ts`

- `launchBrowser()` - launch persistent Chromium
- `closeBrowser()` - clean shutdown
- `loadProfile(profileId)` - load persistent context from encrypted path
- `createPage()` - new page in existing context
- `cleanup()` - clear temp data, preserve session
- `handleCrash()` - recover from browser crash
- `healthCheck()` - verify browser responsive

### 5.4 Application Processor

**New file:** `src/workers/application-worker/applicationProcessor.ts`

```typescript
async function processApplication(queueItem: QueueItem): Promise<void> {
  const run = await createSubmissionAttempt(applicationId);
  
  try {
    // 1. Load application, portal account (if needed), user profile
    // 2. Load CV + cover letter
    // 3. Get/reuse browser session
    // 4. Get portal adapter
    // 5. Execute adapter flow
    // 6. Capture evidence
    // 7. Update application status
    // 8. Record events
    // 9. Complete submission attempt
  } catch (error) {
    // Handle crash, record error, release lease
  }
}
```

### 5.5 Per-Portal Pacing

**New file:** `src/lib/applications/portalPacingService.ts`

```typescript
const PORTAL_PACING: Record<string, PortalPacingConfig> = {
  greenhouse: {
    minDelayMs: 30_000,      // 30 seconds between applications
    maxDelayMs: 120_000,     // 2 minutes max
    minDelaySamePortalMs: 60_000,  // 1 minute between same-portal apps
    randomize: true,         // Add random jitter
  },
  lever: {
    minDelayMs: 45_000,
    maxDelayMs: 180_000,
    minDelaySamePortalMs: 90_000,
    randomize: true,
  },
};

async function getPacingDelay(portal: string, lastApplicationAt?: Date): Promise<number> {
  const config = PORTAL_PACING[portal] ?? PORTAL_PACING.default;
  const base = config.randomize
    ? config.minDelayMs + Math.random() * (config.maxDelayMs - config.minDelayMs)
    : config.minDelayMs;
  
  if (lastApplicationAt) {
    const elapsed = Date.now() - lastApplicationAt.getTime();
    if (elapsed < config.minDelaySamePortalMs) {
      return config.minDelaySamePortalMs - elapsed + base;
    }
  }
  
  return base;
}
```

---

## PHASE 6: PORTAL ADAPTER INTERFACE

### 6.1 Adapter Interface

**New file:** `src/lib/applications/portals/portalAdapter.ts`

```typescript
export interface PortalAdapter {
  readonly portal: PortalProvider;
  readonly allowedDomains: string[];
  readonly requiresAccount: boolean;  // NEW: not all portals need accounts
  
  // Application flow (no account required for some portals)
  prepareApplication(params: PrepareParams): Promise<PrepareResult>;
  fillApplication(params: FillParams): Promise<FillResult>;
  handleQuestions(params: QuestionParams): Promise<QuestionResult>;
  reviewApplication(params: ReviewParams): Promise<ReviewResult>;
  submitApplication(params: SubmitParams): Promise<SubmitResult>;
  extractConfirmation(params: ConfirmParams): Promise<ConfirmationResult>;
  detectUserActionRequired(page: Page): Promise<UserActionDetection>;
  
  // Account flow (optional - only if requiresAccount = true)
  connect?(params: ConnectParams): Promise<ConnectResult>;
  checkSession?(params: SessionCheckParams): Promise<SessionStatus>;
}
```

### 6.2 Adapter Registry

**New file:** `src/lib/applications/portals/adapterRegistry.ts`

### 6.3 Domain Allowlist

**New file:** `src/lib/applications/portals/domainAllowlist.ts`

---

## PHASE 7: ONE PORTAL ADAPTER (Greenhouse)

### Why Greenhouse First
- Simplest ATS: public job board + standard application form
- **No account required** for most applications
- Already has a stub adapter in `src/platforms/greenhouse/GreenhouseAdapter.ts`
- Application forms are relatively standardized

### Greenhouse Adapter

**New file:** `src/lib/applications/portals/greenhouse/GreenhouseApplicationAdapter.ts`

```typescript
class GreenhouseApplicationAdapter implements PortalAdapter {
  readonly portal = 'greenhouse';
  readonly requiresAccount = false;  // MyGreenhouse is optional
  
  readonly allowedDomains = [
    'boards.greenhouse.io',
    'app.greenhouse.io',
    'boards-api.greenhouse.io',
  ];
  
  async prepareApplication(params: PrepareParams): Promise<PrepareResult> {
    // 1. Navigate to job URL
    // 2. Click "Apply" button
    // 3. Detect form structure
    // 4. Map fields to normalized data
  }
  
  async fillApplication(params: FillParams): Promise<FillResult> {
    // 1. Fill first name, last name, email, phone
    // 2. Fill location, LinkedIn, portfolio
    // 3. Upload CV (temp file)
    // 4. Upload cover letter if required
    // 5. Fill custom fields from answers
  }
  
  async handleQuestions(params: QuestionParams): Promise<QuestionResult> {
    // 1. Detect additional questions
    // 2. Match against known answers
    // 3. Fill or mark USER_ACTION_REQUIRED
  }
  
  async submitApplication(params: SubmitParams): Promise<SubmitResult> {
    // 1. Review filled form
    // 2. Check for validation errors
    // 3. Capture pre-submit screenshot
    // 4. Click submit
    // 5. Wait for confirmation or timeout
    // 6. Capture post-submit screenshot
    // 7. Extract confirmation details
    // 8. Return SUBMITTED or UNKNOWN
  }
  
  // Optional: only if user wants MyGreenhouse account
  async connect(params: ConnectParams): Promise<ConnectResult> {
    // Only called when requiresAccount = true
    // Navigate to MyGreenhouse signup/login
    // Handle email verification via auto-verify flow
  }
}
```

### Evidence Capture

```typescript
// Before submission
{
  url: page.url(),
  timestamp: new Date(),
  screenshot: await page.screenshot({ path: r2Reference }),
  detectedFormFields: formFields,
  selectedCV: cvVersionId,
  selectedCoverLetter: coverLetterVersionId,
}

// After submission
{
  screenshot: await page.screenshot({ path: r2Reference }),
  confirmationText: extractConfirmationText(page),
  confirmationUrl: page.url(),
  portalApplicationId: extractApplicationId(page),
}
```

---

## PHASE 8: CLOUDFLARE EMAIL PIPELINE

### 8.1 Email Architecture

```
INBOUND (Portal → User):
  Portal → u_xxx@jobs.morigrid.com → Cloudflare Email Routing → Email Worker → /api/internal/application-email/inbound → MongoDB → Timeline

OUTBOUND (User → HR):
  User composes → BuildAIResume backend → Cloudflare Email Service REST API → from: u_xxx@jobs.morigrid.com → HR inbox

NOTIFICATION (BuildAIResume → User):
  BuildAIResume → nodemailer → from: applications@morigrid.com → user@gmail.com
```

### 8.2 How User Sends Email

1. User clicks "Reply" or "Follow Up" in application timeline
2. UI shows email composer (pre-filled with AI draft if desired)
3. User writes/sends
4. Backend calls Cloudflare Email Service REST API
5. Recipient sees email from `u_xxx@jobs.morigrid.com`
6. Outbound email logged in `ApplicationEmail` collection

**Cloudflare pricing:** 3,000 included/month on Workers Paid, then $0.35/1K.

### 8.3 HR/Company Email Sources (V1 - Conservative)

| Source | How | V1 |
|--------|-----|-----|
| **Inbound email headers** | Extract `From`/`Reply-To` from portal emails | ✅ |
| **Job posting contacts** | Existing `JobApplication.contacts` array | ✅ |
| **Portal application page** | Playwright extracts recruiter info | ✅ |
| **Company website/LinkedIn** | AI lookup | ❌ V2 |

If recruiter email is unknown → show "No direct contact available" → user can add manually.

### 8.4 Auto-Verify in Browser

When portal requires email verification during account creation (for portals with `requiresAccount = true`):

1. Playwright fills application email on portal signup
2. Portal sends verification to `u_xxx@jobs.morigrid.com`
3. Email arrives at Cloudflare → Worker → Backend extracts verification link
4. Playwright (still open) navigates to verification link
5. Account verified, session persisted

### 8.5 Files

```
workers/application-email/wrangler.toml
workers/application-email/src/index.ts
workers/application-email/package.json
src/app/api/internal/application-email/inbound/route.ts
src/lib/services/applicationEmailIngestionService.ts
src/lib/services/applicationEmailSendingService.ts
src/lib/services/applicationEmailClassifier.ts
src/lib/services/applicationEmailCorrelationService.ts
src/models/ApplicationEmail.ts
```

### 8.6 Cloudflare Configuration

- `jobs.morigrid.com` MX records → Cloudflare
- Email Routing enabled
- Email Sending domain onboarded
- Worker route: `jobs.morigrid.com/*`
- SPF, DKIM, DMARC records
- API token with `Email Sending: Edit` permission

---

## PHASE 9: APPLICATION TIMELINE + COMMUNICATION

### 9.1 Extended Event Types

Add to `ApplicationEvent.ts`:
- `APPLICATION_STAGED`
- `APPLICATION_READY`
- `APPLICATION_QUEUED`
- `WORKER_STARTED`
- `SESSION_REUSED`
- `FORM_OPENED`
- `FORM_FILLED`
- `QUESTIONS_DETECTED`
- `USER_ACTION_REQUIRED`
- `SUBMIT_STARTED`
- `SUBMITTED`
- `SUBMISSION_UNKNOWN`
- `CONFIRMATION_RECEIVED`
- `EMAIL_RECEIVED`
- `INTERVIEW_RECEIVED`
- `REJECTED`
- `FAILED`
- `CANCELLED`

### 9.2 Email Classification

**New file:** `src/lib/services/applicationEmailClassifier.ts`

Rule-based (no AI in V1). Classifications:
- APPLICATION_CONFIRMATION, APPLICATION_RECEIVED, APPLICATION_REVIEWED
- ASSESSMENT_REQUEST, INTERVIEW_INVITATION, INTERVIEW_SCHEDULE
- RECRUITER_MESSAGE, REJECTION, OFFER, WITHDRAWAL
- EMAIL_VERIFICATION, MFA_REQUIRED, PORTAL_NOTIFICATION, UNKNOWN

### 9.3 Email Correlation

**New file:** `src/lib/services/applicationEmailCorrelationService.ts`

Matching strategy:
1. Explicit application/portal ID in email
2. Portal application ID
3. Company name
4. Job title
5. Sender domain
6. Timestamp proximity
7. Existing portal account

Confidence: ≥80 → attach, <80 → UNMATCHED (surface in UI for manual linking).

---

## PHASE 10: DISCOVER + APPLICATIONS UI

### 10.1 API Routes

```
POST /api/applications/stage          - stage application (validate, prepare, queue)
GET  /api/applications/[id]/status    - live status (internal + user-facing)
GET  /api/applications/[id]/timeline  - application timeline
GET  /api/applications/[id]/communications - application emails
POST /api/applications/[id]/reply     - send email from application identity
```

### 10.2 UI Changes

- Job card: `[Apply]` → `[Preparing...]` → `[Queued]` → `[Applying...]` → `[Applied ✓]`
- Application detail page with timeline, communications, materials
- User approval step before queueing (unless Auto Apply enabled)

### 10.3 User Approval Flow

```
Discover → Apply → Prepare → Ready for Review → User Approves → Queue
```

Auto Apply skips the approval step only when explicitly enabled.

---

## PHASE 11: AUTO APPLY POLICY

### 11.1 Policy Service

**New file:** `src/lib/applications/policyService.ts`

### 11.2 Safe Defaults

```typescript
autoApplyEnabled: false          // OFF by default
maxApplicationsPerDay: 5
minimumMatchScore: 85
allowedPortals: []
requireUserReview: true          // User must approve unless Auto Apply
```

### 11.3 Per-Portal Circuit Breaker

**New file:** `src/lib/applications/portalHealthService.ts`

```typescript
interface PortalHealth {
  portal: PortalProvider;
  successRate: number;
  failureRate: number;
  captchaRate: number;
  averageDurationMs: number;
  lastSuccessfulRun?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  status: 'healthy' | 'degraded' | 'paused' | 'blocked';
}

// Circuit breaker logic
if (consecutiveFailures >= FAILURE_THRESHOLD || successRate < SUCCESS_RATE_THRESHOLD) {
  status = 'blocked';
  // Stop new applications for this portal
  // Other portals continue
}
```

---

## PHASE 12: ADMIN CONTROL CENTER

### 12.1 Dashboard

```
┌─────────────────────────────────────────────┐
│ APPLICATION AUTOMATION                      │
│                                             │
│ ● Worker Online                             │
│ Browser: Healthy                            │
│ Current Job: #A123                          │
│ Runtime: 2m 31s                             │
│                                             │
│ [ PAUSE AUTOMATION ]                        │
└─────────────────────────────────────────────┘

Queue
─────────────────────────────
Ready              18
Running             1
Action Required    3
Failed             2
Unknown             1

Portal Health
─────────────────────────────
Greenhouse      ● Healthy
Lever           ● Healthy
Ashby           ● Degraded

Today's Execution
─────────────────────────────
Submitted       23
Confirmed       21
Unknown          1
Failed           1

Email Ingestion
─────────────────────────────
Received        42
Matched         38
Unmatched        3
Failed           1
```

### 12.2 Pause Global Automation

`PAUSE GLOBAL AUTOMATION` stops new applications from being claimed while allowing the current application to finish safely.

### 12.3 Files

```
src/app/api/admin/application-operations/route.ts
src/components/admin/application-operations/ApplicationOperationsDashboard.tsx
src/components/admin/application-operations/WorkerHealthPanel.tsx
src/components/admin/application-operations/ApplicationQueueTable.tsx
src/components/admin/application-operations/PortalHealthGrid.tsx
src/components/admin/application-operations/EmailIngestionMonitor.tsx
```

---

## PHASE 13: DRY RUN

### Test Mode

```
APPLICATION_AUTOMATION_MODE=test
```

- Opens pages, fills forms
- **Stops before final submit**
- Captures screenshots/diagnostics
- Marks as `SIMULATED_SUBMISSION`

### Dry Run Script

`scripts/test-application-dry-run.ts` - complete vertical slice test.

---

## PHASE 14: PRODUCTION

### Environment Variables

```
APPLICATION_AUTOMATION_ENABLED=false   # Must be explicitly enabled
APPLICATION_AUTOMATION_MODE=production
APPLICATION_GLOBAL_CONCURRENCY=1
APPLICATION_PROFILE_DIR=/var/lib/buildairesume/browser-profiles
```

### VPS Deployment

1. `npx playwright install chromium`
2. `mkdir -p /var/lib/buildairesume/browser-profiles`
3. `chmod 700 /var/lib/buildairesume/browser-profiles`
4. `npm run worker:applications`
5. PM2 or systemd for process management
6. Auto-restart on crash

### Production Safety

- `APPLICATION_AUTOMATION_ENABLED=false` by default
- User `autoApplyEnabled` must also be true
- Both conditions required for real submission
- Daily limits enforced with atomic reservation
- Duplicate detection before queueing

---

## COMPLETE FILE LIST

### New Models (~7)
```
src/models/ApplicationIdentity.ts
src/models/PortalAccount.ts
src/models/ApplicationProfile.ts
src/models/ApplicationEmail.ts
src/models/ApplicationWorkerLock.ts
src/models/ApplicationSubmissionAttempt.ts
src/models/ApplicationQuota.ts
```

### New Services (~15)
```
src/lib/services/applicationIdentityService.ts
src/lib/services/applicationEmailIngestionService.ts
src/lib/services/applicationEmailSendingService.ts
src/lib/services/applicationEmailClassifier.ts
src/lib/services/applicationEmailCorrelationService.ts
src/lib/services/applicationNotificationService.ts

src/lib/applications/stateMachine.ts
src/lib/applications/queueService.ts
src/lib/applications/workerLockService.ts
src/lib/applications/preparationService.ts
src/lib/applications/cvSelectionService.ts
src/lib/applications/answerConfidencePolicy.ts
src/lib/applications/policyService.ts
src/lib/applications/quotaService.ts
src/lib/applications/portalPacingService.ts
src/lib/applications/portalHealthService.ts
```

### Portal Adapters (~4)
```
src/lib/applications/portals/portalAdapter.ts
src/lib/applications/portals/adapterRegistry.ts
src/lib/applications/portals/domainAllowlist.ts
src/lib/applications/portals/greenhouse/GreenhouseApplicationAdapter.ts
```

### Worker Files (~4)
```
src/workers/application-worker/index.ts
src/workers/application-worker/browserManager.ts
src/workers/application-worker/applicationProcessor.ts
src/workers/application-worker/tempFileManager.ts
```

### API Routes (~5)
```
src/app/api/internal/application-email/inbound/route.ts
src/app/api/applications/stage/route.ts
src/app/api/applications/[id]/status/route.ts
src/app/api/applications/[id]/timeline/route.ts
src/app/api/admin/application-operations/route.ts
```

### Cloudflare Worker (~3)
```
workers/application-email/wrangler.toml
workers/application-email/src/index.ts
workers/application-email/package.json
```

### Admin UI (~5)
```
src/components/admin/application-operations/ApplicationOperationsDashboard.tsx
src/components/admin/application-operations/WorkerHealthPanel.tsx
src/components/admin/application-operations/ApplicationQueueTable.tsx
src/components/admin/application-operations/PortalHealthGrid.tsx
src/components/admin/application-operations/EmailIngestionMonitor.tsx
```

### Files to Modify (~12)
```
src/models/Application.ts          - extend schema + dual status
src/models/ApplicationQueue.ts     - add lease fields
src/models/ApplicationEvent.ts     - add event types
src/models/AutoApplyConfiguration.ts - add policy fields
src/models/PortalConnection.ts     - add browser profile fields
src/models/index.ts                - add exports

src/lib/env-validation.ts          - add env vars
env.example                        - document new vars
package.json                       - add playwright, worker script

src/app/api/jobs/discover/route.ts - add application status
src/lib/services/notificationService.ts - add app notification methods
src/components/dashboard/jobs/     - add Apply button + status
```

### New MongoDB Collections
```
applicationidentities
portalaccounts
applicationprofiles
applicationemails
applicationworkerlocks
applicationsubmissionattempts
applicationquotas
```

### New Environment Variables
```
APPLICATION_EMAIL_DOMAIN=jobs.morigrid.com
APPLICATION_AUTOMATION_ENABLED=false
APPLICATION_AUTOMATION_MODE=test
APPLICATION_WORKER_ID=application-worker-01
APPLICATION_PROFILE_DIR=/var/lib/buildairesume/browser-profiles
APPLICATION_QUEUE_POLL_MS=2000
APPLICATION_GLOBAL_CONCURRENCY=1
APPLICATION_MAX_ATTEMPTS=3
APPLICATION_TIMEOUT_MS=600000
INTERNAL_EMAIL_INGEST_SECRET=<secret>
APPLICATION_NOTIFICATION_FROM=applications@morigrid.com
CLOUDFLARE_ACCOUNT_ID=<account_id>
CLOUDFLARE_API_TOKEN=<api_token_with_email_sending_permission>
```

---

## ACCEPTANCE CRITERIA

- [ ] Every enabled user has unique `u_xxx@jobs.morigrid.com` identity (via ApplicationIdentity ObjectId reference)
- [ ] Gmail OAuth NOT implemented
- [ ] Portal email is stable per user/portal
- [ ] Inbound portal email reaches BuildAIResume
- [ ] Email linked to correct user
- [ ] Emails are idempotent
- [ ] Emails update application timelines
- [ ] User can see and send application communications
- [ ] Application state has internal + user-facing statuses
- [ ] STAGED and QUEUED are separate
- [ ] Applications persisted before browser execution
- [ ] Next.js API never waits for Playwright
- [ ] Exactly one browser runs at a time (configurable concurrency)
- [ ] Queue claiming is atomic with leases
- [ ] Worker locks recover after crashes
- [ ] Browser sessions are persistent with isolated profiles
- [ ] CAPTCHA/MFA → USER_ACTION_REQUIRED (never bypassed)
- [ ] Duplicate applications prevented
- [ ] Daily limits enforced with atomic reservation
- [ ] Match-score policy enforced server-side
- [ ] CV version recorded
- [ ] Cover letter version recorded
- [ ] Application answers recorded with confidence policy
- [ ] Submission attempts recorded with evidence
- [ ] SUBMISSION_STATUS_UNKNOWN exists and never auto-retries
- [ ] Reconciliation for unknown submissions
- [ ] Per-portal circuit breakers
- [ ] Per-portal pacing
- [ ] No automatic recruiter email discovery (V1)
- [ ] Timeline records every major event
- [ ] Portal emails update timeline
- [ ] User receives BuildAIResume notification emails
- [ ] Admin can monitor worker health + pause automation
- [ ] Admin can inspect queue state
- [ ] Test mode cannot submit real application
- [ ] Production automation disabled by default
- [ ] System survives VPS restart
- [ ] System survives worker crash without duplicate submission
- [ ] Greenhouse adapter works WITHOUT account (anonymous application)
- [ ] Build succeeds
- [ ] Typecheck succeeds
- [ ] Tests pass
- [ ] End-to-end dry run succeeds

---

## IMPLEMENTATION ORDER

```
PHASE 1:  Application data model + state machine
PHASE 2:  Application Identity
PHASE 3:  Queue + lease + worker lock
PHASE 4:  Preparation pipeline (CV + answers + policy)
PHASE 5:  Playwright worker framework
PHASE 6:  Portal adapter interface
PHASE 7:  One portal adapter (Greenhouse)
PHASE 8:  Submission evidence + reconciliation
PHASE 9:  Cloudflare inbound email
PHASE 10: Application timeline + communication
PHASE 11: Discover + Applications UI
PHASE 12: Admin Control Center
PHASE 13: Dry run
PHASE 14: Production
```

This gets the **core execution engine working before email becomes a dependency**.
