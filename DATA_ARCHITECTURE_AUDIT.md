# BuildAIResume — Full Data Architecture Audit

**Date:** 2026-08-25
**Scope:** Complete codebase data layer audit
**Status:** AUDIT ONLY — No code changes made

---

## A. Repository Data Map

### Models (52 Mongoose schemas)

| # | Model | Collection | Key Fields | Timestamps |
|---|-------|------------|------------|------------|
| 1 | User | users | email, firstName, lastName, role, currentPlanKey, subscription, credits, usage, onboarding, autoApplyPreferences, naukriIntegration, indeedIntegration | YES |
| 2 | CV | cvs | userId, title, cvData, resumeData, templateId, cvType, status, cv_score_master, cv_score_ats | YES |
| 3 | Job | jobs | userId, jobTitle, company, jobUrl, status, source, atsScore | YES (deprecated) |
| 4 | JobApplication | jobapplications | userId, jobTitle, company, status, matchScore, trustScore, skillGapAnalysis | YES |
| 5 | Application | applications | userId, jobId, currentStage, internalStatus, cvId, attempts, stageHistory | YES |
| 6 | ApplicationJourney | applicationjourneys | journeyId, userId, jobId, cvId, status, currentStep, atsScore | YES |
| 7 | ApplicationQueue | applicationqueues | applicationId, userId, jobId, status, priority, attempts | YES |
| 8 | ApplicationRun | applicationruns | runId, applicationId, attempt, status, platform, steps | YES |
| 9 | ApplicationEvent | applicationevents | applicationId, userId, type, previousStage, newStage, source | NO |
| 10 | CoverLetter | coverletters | userId, title, content, header, body, footer, jobId, cvId | YES |
| 11 | InterviewSession | interviewsessions | userId, jobId, readinessScore, targetRole | YES |
| 12 | InterviewQuestion | interviewquestions | sessionId, content, userAnswer, aiFeedback | YES |
| 13-17 | TrackerEmail (5 models) | emailaccounts, emailmessages, emailthreads, senderjobmemories, stagechangelogs | Various email/tracking fields | YES |
| 18 | Notification | notifications | userId, type, title, message, read, priority | YES |
| 19 | NotificationQueue | notificationqueues | taskType, payload, status, retries | YES |
| 20 | Subscription | subscriptions | userId, planId, status, startDate, endDate | YES |
| 21-28 | Billing (8 models) | invoices, invoiceitems, transactions, paymentmethods, pricingplans, coupons, discountcodes, subscriptiondiscounts | Various billing fields | YES |
| 29 | UserBillingProfile | userbillingprofiles | userId, billingCountryCode, billingCurrency | YES |
| 30-31 | Tax/Pricing | taxrates, countrypricings | countryCode, currency, planPrices | YES |
| 32 | WebhookLog | webhooklogs | provider, eventType, payload, status | YES |
| 33 | ActivityLog | activitylogs | logType, userId, action, apiMetadata | YES |
| 34 | VerificationToken | verificationtokens | userId, token, code, type | YES |
| 35-36 | Misc | advocates, feedbacks | Various | YES |
| 37 | MoriChat | morichats | userId, cvId, messages | YES |
| 38 | UserSettings | usersettings | userId, security, notifications, privacy, preferences | YES |
| 39 | LinkedInSnapshot | linkedin_enhancer | userId, sourceCvId, generatedContent | YES |
| 40 | TemporaryCVDraft | temporarycvdrafts | userId, sessionId, cvData, expiresAt | YES |
| 41 | PortalConnection | portalconnections | userId, provider, status, encryptedSessionState | YES |
| 42 | PortalJobSyncTask | portaljobsynctasks | userId, portalConnectionId, status | YES |
| 43 | AdminAuth | adminauths | email, password, role | YES |
| 44 | Template | templates | name, category, tier, globalStyles | YES |
| 45-52 | Misc/Admin | testimonials, newsletters, promotionaloffers, supportnotes, ush1bemployers, uksponsors, emailcampaigns, adminusers | Various | YES |

### API Routes (250+ routes)

| Category | Key Routes | Count |
|----------|------------|-------|
| User/Profile | /api/user, /api/user/create-profile, /api/user/update-* | 10+ |
| Onboarding | /api/user/onboarding | 1 |
| Job Preferences | /api/jobs/preferences | 1 |
| Jobs/Tracker | /api/jobs, /api/jobs/[id], /api/jobs/discover, /api/jobs/auto-apply | 15+ |
| CV Management | /api/cvs, /api/cvs/[id], /api/cvs/[id]/save, /api/cv-draft/* | 15+ |
| Subscription | /api/user/subscription, /api/payment/*, /api/checkout/* | 8+ |
| Settings | /api/user/settings, /api/user/settings/security, /api/user/settings/profile | 5+ |
| Notifications | /api/notifications, /api/notifications/* | 5+ |
| Tracker Email | /api/tracker/emails, /api/tracker/emails/sync | 3+ |
| Cover Letters | /api/cover-letters/* | 4+ |
| Application Journey | /api/application-journey/* | 5+ |
| AI | /api/ai/* | 25+ |
| Cron | /api/cron/* | 16 |
| Admin | /api/admin/* | 30+ |
| Auth | /api/auth/* | 20+ |
| Portal Connections | /api/portal-connections/* | 5+ |
| Webhooks | /api/webhooks/polar | 1 |

### Services (115+ services)

| Category | Key Services | Count |
|----------|-------------|-------|
| Auto-Apply & Job Processing | autoapply-processor, unifiedApplyService, jobDiscoveryService, jobMatchingService | 10+ |
| Email & Notification | notificationService, emailNotificationService, dailySummaryEmailService | 12+ |
| Subscription & Credits | subscriptionService, creditService, entitlementService, quotaService | 8+ |
| CV & Document | pdfService, docxService, templateRendererService, cvS3Service | 15+ |
| Job Portal & Integration | portal-connection-service, indeedApplyService, naukriApplyService | 8+ |
| AI & Analysis | aiAssistantService, cv-surgeon-service, skillGapAnalysisService | 10+ |
| Billing & Transactions | billingSchedulerService, transactionService | 3+ |
| Analytics & Metrics | metricsService, activityLogService, auditService | 5+ |
| Infrastructure | configService, puppeteerPoolService, rendererHealthService | 5+ |
| Cleanup & Recovery | guestCleanupService, deep-freeze-service, stateRecoveryService | 5+ |

### Cron Jobs (16 scheduled tasks)

| Cron | Schedule | Purpose |
|------|----------|---------|
| unified | Daily 8AM | Consolidated daily tasks |
| credits/reset | Monthly 1st | Reset free plan credits |
| billing | Periodic | Subscription renewals, dunning |
| daily-summary | Daily | Send progress emails |
| state-recovery | Periodic | Repair inconsistent state |
| deep-freeze | Nightly | Downgrade expired subscriptions |
| notifications/* | Various | Job status, membership, deadline, follow-up checks |
| process-queue | Periodic | Process notification queue |
| process-triggers | Periodic | Lifecycle emails |
| process-campaigns | Periodic | Admin email campaigns |
| webhook-retry | 15min | Retry failed webhooks |
| sponsorship/* | Weekly/Monthly | Update sponsor registries |

---

## B. Duplicate Data Findings

### CRITICAL: Job Preferences — 5 Independent Stores

| Location | Type | Fields | Writers | Readers |
|----------|------|--------|---------|---------|
| `user.autoApplyPreferences` | Mixed on User doc | targetRoles, locations, minSalary, experienceYears, maxNoticePeriodDays, workplaceTypes, searchIntensity, applicationMode | /api/jobs/preferences POST, Welcome onboarding | /api/jobs/preferences GET, JobsHub, FiltersBar |
| `user.onboarding.target_roles/locations/etc.` | Embedded subdoc on User | targetRoles, locations, experienceLevel, salaryRange, searchStatus, monthlyVolume | /api/user/onboarding PATCH | Welcome restore, session restore |
| `job_preferences` collection | Separate MongoDB collection | titles, locations, country, remoteOnly, salaryMin | JobPreferencesService | JobMatchingService, JobDiscoveryService |
| `UserQuota.autoApplySettings` | Embedded in userquotas | targetRoles, locations, remoteOnly, minSalary, maxPerDay | autoapply-processor | Auto-apply processor |
| `user.naukriIntegration.preferences` | Embedded in User doc | targetTitles, targetLocations, minCtcLakhs, experienceYears | Naukri login, /api/jobs/preferences sync | NaukriApplyService |
| `user.indeedIntegration.preferences` | Embedded in User doc | targetTitles, targetLocations, minSalary, salaryCurrency | Indeed login, /api/jobs/preferences sync | IndeedApplyService |

**Severity:** CRITICAL
**Finding:** The same conceptual data (target roles, locations, salary, experience) is stored in 6 places with different field names and schemas. The `UserJobPreferencesService` was recently added to sync `autoApplyPreferences` to legacy stores, but the reverse sync (from legacy to canonical) is not implemented. Users updating preferences via Naukri/Indeed integration login do NOT update the canonical `autoApplyPreferences`.

### HIGH: Application Status — 4 Independent Representations

| Location | Type | Fields | Canonical? |
|----------|------|--------|------------|
| `Application.currentStage` | Separate collection | saved/staging/applied/interview/offer/rejected | YES (auto-apply pipeline) |
| `JobApplication.status` | Separate collection | Various statuses | YES (tracker UI) |
| `ApplicationEvent` | Event sourcing | previousStage → newStage | YES (immutable history) |
| `user.onboarding.tracker_interest` | Onboarding subdoc | yes/no | NO (onboarding only) |

**Severity:** HIGH
**Finding:** `Application` and `JobApplication` are TWO SEPARATE collections tracking the same concept (a user's job application). `Application` is used by the auto-apply pipeline. `JobApplication` is used by the tracker UI. They have overlapping but different fields and statuses.

### HIGH: User Settings — 3 Overlapping Locations

| Location | Type | Fields |
|----------|------|--------|
| `User.settings` | Embedded in User doc | theme, notifications, timezone, languagePreference, cvTailoringMode, hasSeenWelcome |
| `UserSettings` (separate collection) | Full settings model | security, notifications, privacy, preferences, advanced |
| `user.notificationPreferences` | Embedded in User doc | Per-type notification preferences |

**Severity:** HIGH
**Finding:** Settings are split between `User.settings` (embedded) and `UserSettings` (separate collection). Some fields like `notifications` exist in both places. The `/api/user/settings` PUT handler writes to BOTH `User` and `UserSettings`.

### MEDIUM: CV Storage — Multiple Copies

| Location | Type | Purpose |
|----------|------|---------|
| `CV.cvData` | Canonical master CV | Authoritative CV data |
| `TemporaryCVDraft.cvData` | TTL-based draft | In-progress edits |
| `unsaved_master_cv` (localStorage) | Offline recovery buffer | Network failure recovery |
| `guest-cv-draft` (localStorage) | Guest backup | Anonymous user backup |
| `mori_cv_context` (localStorage) | Ephemeral context | Mori assistant context |

**Severity:** MEDIUM
**Finding:** CV data exists in up to 5 places. The localStorage copies are intentional (offline recovery, guest drafts) but create potential for stale data if not properly synchronized.

### MEDIUM: Monthly Goal — 2 Locations

| Location | Type |
|----------|------|
| `user.monthlyGoal` | Embedded in User doc |
| `buildairesume_monthly_goal` (localStorage) | Client-side preference |

**Severity:** MEDIUM
**Finding:** The monthly goal is stored in both MongoDB and localStorage. The localStorage copy may diverge from the server value.

---

## C. Source-of-Truth Matrix

| Domain | Canonical Storage | Canonical Writer | Canonical Reader | Derived/Cache | Legacy/Duplicate |
|--------|------------------|------------------|------------------|---------------|-----------------|
| User Profile | `users` collection | /api/user, /api/user/create-profile | /api/user/current | AdminUser (synced copy) | — |
| Master CV | `cvs` collection (cvType=master) | /api/cvs, /api/cvs/[id]/save | /api/cvs/master, /api/cvs/[id] | unsaved_master_cv (offline) | — |
| Job Preferences | `users.autoApplyPreferences` | /api/jobs/preferences, Welcome onboarding | /api/jobs/preferences GET, JobsHub | job_preferences collection (legacy sync) | user.onboarding.jobPreferences (legacy), UserQuota.autoApplySettings (legacy) |
| Jobs Catalog | `jobs` collection | jobDiscoveryService, portal-fetcher-service | /api/jobs/discover, /api/jobs | — | — |
| Saved/Passed Jobs | `passed_jobs` collection | /api/jobs/pass | /api/jobs/discover | — | — |
| Applications (Tracker) | `jobapplications` collection | /api/jobs, /api/jobs/[id], UnifiedApplyService | /api/jobs GET, Dashboard | — | `applications` collection (auto-apply pipeline) |
| Applications (Auto-Apply) | `applications` collection | ApplicationService, autoapply-processor | ApplicationReconciliationWorker | — | `jobapplications` collection (tracker) |
| Application Events | `applicationevents` collection | ApplicationService | Reconciliation, audit | — | — |
| Application Queue | `applicationqueues` collection | autoapply-processor | autoapply-processor | — | — |
| Application Runs | `applicationruns` collection | autoapply-processor | /api/jobs/[id] | — | — |
| Cover Letters | `coverletters` collection | /api/cover-letters, AI generation | /api/cover-letters/[id] | — | — |
| Subscriptions | `subscriptions` collection + `user.subscription` | /api/payment/confirm, /api/webhooks/polar | /api/user/subscription, EntitlementService | — | User embedded subscription (denormalized) |
| Usage/Credits | `users.credits`, `users.usage` | creditService, usageLimitsService | /api/user/usage-limits, EntitlementService | — | — |
| Portal Connections | `portalconnections` collection | /api/portal-connections | portal-fetcher-service, UnifiedApplyService | — | user.naukriIntegration (legacy), user.indeedIntegration (legacy) |
| Notifications | `notifications` collection | notificationService, crons | /api/notifications, Dashboard | notificationqueues (async processing) | — |
| Email Intelligence | emailmessages, emailthreads, senderjobmemories, stagechangelogs | /api/tracker/emails, email workers | Tracker UI | — | — |
| Onboarding | `users.onboarding` | /api/user/onboarding | Welcome restore | buildairesume_onboarding_state (localStorage backup) | — |
| Settings | `users.settings` + `usersettings` collection | /api/user/settings | Settings UI, Dashboard | — | Split between User doc and separate collection |
| Recommendations | In-memory cache | jobDiscoveryService, jobMatchingService | /api/jobs/discover | 5-min TTL cache | — |

---

## D. Schema Problems

### 1. User Document is Oversized

The User document contains:
- Profile fields (firstName, lastName, email, etc.)
- `subscription` (embedded subdoc with plan, status, dates)
- `credits` (embedded subdoc with aiCredits, jobsCreated)
- `usage` (embedded subdoc with cvJourneyCount, exportCount, etc.)
- `settings` (embedded subdoc with theme, notifications, timezone)
- `onboarding` (embedded subdoc with 20+ fields)
- `autoApplyPreferences` (embedded Mixed with 18 fields)
- `naukriIntegration` (embedded subdoc with credentials, preferences)
- `indeedIntegration` (embedded subdoc with credentials, preferences)
- `notificationPreferences` (embedded subdoc)
- `interviewCoach` (embedded subdoc)
- `calendarIntegration` (embedded subdoc)

**Risk:** Document may approach 16MB limit as more fields are added. High write contention on frequently updated fields.

### 2. Inconsistent Reference Types

Some models use proper Mongoose `ref`:
```ts
{ type: Schema.Types.ObjectId, ref: 'User' }
```

Others use `Mixed` type:
```ts
{ type: Schema.Types.Mixed }  // userId in Application, ApplicationJourney, etc.
```

**Impact:** No referential integrity enforcement, no populate support, potential for invalid references.

### 3. Missing Indexes

Based on query patterns identified:
- `jobapplications`: Needs compound index on `userId + status` (frequent query)
- `applicationevents`: Needs index on `applicationId + createdAt` (sorted retrieval)
- `applications`: Has compound unique index on `userId + jobId` (good)
- `job_preferences`: Needs index on `userId` (frequent lookup)
- `userquotas`: Needs index on `userId` (frequent lookup)

### 4. Dual Application Models

`Application` and `JobApplication` represent the same concept with different schemas:
- `Application`: Auto-apply pipeline (saved → staging → applied → interview → offer → rejected)
- `JobApplication`: Tracker UI (more fields, different status enum)

These should be unified or clearly separated with a documented relationship.

---

## E. Business Logic Duplication

### 1. Match Score Calculation

Match scores are calculated by:
- `JobMatchingService.computeScore()` — server-side, reads from `job_preferences`
- `JobDiscoveryService.scoreDiscoveredJobs()` — server-side, reads from `job_preferences`
- `/api/jobs/[id]` PUT — updates `matchScore` on `JobApplication`
- Frontend `jobAnalysisService.triggerJobAnalysis()` — calls API, updates job

**Finding:** The matching engine reads from `job_preferences` collection, NOT from `autoApplyPreferences`. This means preferences set during onboarding may not be used by the matching engine.

### 2. Subscription Entitlement Calculation

Entitlements are calculated by:
- `EntitlementService.getUserEntitlements()` — reads `users` doc
- `UsageLimitsService.checkLimits()` — reads `users` doc + `pricingplans`
- `CreditService` — reads `users.credits`
- `QuotaService` — reads `quotatracker` collection
- `UnifiedLimitService.checkLimits()` — reads `users`, `cvs`, `jobs`, `templates`
- Frontend `useMembership()` hook — React Query cache

**Finding:** Multiple services independently calculate overlapping entitlements. No single authoritative entitlement resolution.

### 3. Application Status Determination

Status is determined by:
- `JobApplication.status` — set by tracker UI, email worker, auto-apply
- `Application.currentStage` — set by auto-apply pipeline
- `ApplicationEvent` — records transitions
- Email worker — updates based on inbound emails
- Reconciliation worker — repairs stuck applications

**Finding:** Two independent status systems (`JobApplication` and `Application`) with no documented relationship.

---

## F. Cache Problems

### 1. In-Memory Discovery Cache

`JobDiscoveryService` uses a 5-minute in-memory TTL cache:
```ts
const discoveryCache = new Map<string, { data: DiscoveredJob[]; timestamp: number }>();
```

**Problem:** Key is not user-specific. If two users search for the same query, the second user gets cached results from the first user's search. This is a cross-user data leakage risk.

### 2. No Cache Invalidation on Preference Change

When `autoApplyPreferences` are updated via `/api/jobs/preferences`, the legacy `job_preferences` collection is synced. However, the `JobDiscoveryService` cache is NOT invalidated, meaning stale results may be served for up to 5 minutes.

### 3. PDF Cache

`PDFCacheService` uses Redis + in-memory fallback with 1-hour TTL. Cache key includes CV data hash + template + options. This is properly scoped and invalidated.

---

## G. Proposed Canonical Architecture

```
USER
 ├── canonical profile (firstName, lastName, email, etc.)
 ├── subscription → { plan, status, dates }  [embedded]
 ├── credits → { aiCredits, jobsCreated }  [embedded]
 ├── usage → { cvCount, exportCount }  [embedded]
 ├── settings → { theme, notifications, timezone }  [embedded, slim]
 └── onboarding → { stage, progress }  [embedded, temporary]

USER_SETTINGS (separate collection)
 └── detailed settings (security, privacy, advanced)

MASTER_CVS (cvs collection, cvType=master)
 └── canonical candidate profile

CV_VERSIONS (cvs collection, cvType=journey/standalone)
 └── job-specific tailored CVs

JOB_PREFERENCES (user.autoApplyPreferences)
 └── canonical job search preferences
     ├── syncs TO → job_preferences collection (matching engine)
     ├── syncs TO → UserQuota.autoApplySettings (auto-apply)
     ├── syncs TO → naukriIntegration.preferences (portal)
     └── syncs TO → indeedIntegration.preferences (portal)

JOBS (jobs collection)
 └── global job catalog (no user-specific data)

USER_JOB_STATE (passed_jobs collection)
 └── user-specific saved/dismissed state

APPLICATIONS (unified)
 ├── canonical current state
 └── APPLICATION_EVENTS (immutable history)

TRACKER → view/projection of Application state

SUBSCRIPTION
 ├── Plan → entitlements
 ├── Usage → actual consumption
 └── UserPreference → desired behavior

PORTAL_CONNECTIONS (portalconnections collection)
 └── external account relationships

AUTOMATION_RUNS (applicationruns collection)
 └── execution history

RECOMMENDATIONS → derived/cacheable output
```

---

## H. Migration Plan

### Phase 1: Document Findings (CURRENT)
- [x] Complete inventory of all models, APIs, services
- [x] Identify all duplicate data stores
- [x] Produce source-of-truth matrix
- [ ] Present findings to team for approval

### Phase 2: Unify Job Preferences (Priority: CRITICAL)
1. Designate `user.autoApplyPreferences` as canonical
2. Update `JobMatchingService` to read from `autoApplyPreferences` (via `UserJobPreferencesService`)
3. Update `JobDiscoveryService` to read from `autoApplyPreferences`
4. Update `autoapply-processor` to read from `autoApplyPreferences`
5. Remove `job_preferences` collection writes (keep reads during transition)
6. Remove `UserQuota.autoApplySettings` writes
7. Add reverse sync: `naukriIntegration.preferences` → `autoApplyPreferences`
8. Validate all preference readers use canonical source

### Phase 3: Unify Application Models (Priority: HIGH)
1. Document the relationship between `Application` and `JobApplication`
2. Decide: merge into one model, or maintain clear separation with a bridge
3. If merging: create migration script to combine data
4. Update all readers/writers to use unified model
5. Remove duplicate model

### Phase 4: Clean Up User Document (Priority: MEDIUM)
1. Move `naukriIntegration` and `indeedIntegration` to separate `portalconnections` collection
2. Move `notificationPreferences` to `UserSettings`
3. Consider moving `subscription` to separate collection if document grows
4. Add proper indexes for frequent queries

### Phase 5: Fix Cache Issues (Priority: MEDIUM)
1. Make `JobDiscoveryService` cache user-specific
2. Add cache invalidation on preference changes
3. Add cache invalidation on application state changes

### Phase 6: Frontend Cleanup (Priority: LOW)
1. Remove `temp_password` from localStorage (security concern)
2. Standardize localStorage key naming
3. Ensure all MongoDB-synced localStorage has proper conflict resolution

---

## I. Risk Assessment

### CRITICAL
- **Cross-user data leakage in discovery cache** — Cache key is not user-specific
- **Job preferences split-brain** — 6 stores, no single source of truth

### HIGH
- **Dual application models** — `Application` and `JobApplication` track same concept
- **Settings split** — `User.settings` and `UserSettings` collection overlap
- **Matching engine reads wrong source** — Reads `job_preferences`, not `autoApplyPreferences`

### MEDIUM
- **User document oversize risk** — 15+ embedded subdocuments
- **Inconsistent reference types** — Mixed usage of ObjectId refs vs Mixed type
- **localStorage divergence** — Monthly goal, CV draft can diverge from server

### LOW
- **Security: temp_password in localStorage** — Plaintext password stored
- **Cache TTL mismatch** — Discovery cache 5-min vs preference update frequency
- **Missing indexes** — Some frequent queries lack compound indexes

---

## J. Files Changed (Audit Only)

**None.** This is an audit-only document. No code was modified.

---

## K. Remaining Technical Debt

1. **52 Mongoose models** — many with overlapping responsibilities
2. **250+ API routes** — some with duplicated business logic
3. **115+ services** — some doing similar things independently
4. **6 job preference stores** — needs consolidation to 1 canonical + derived
5. **2 application models** — needs unification or clear documentation
6. **Split settings** — needs consolidation
7. **User document complexity** — may need decomposition
8. **Cache safety** — needs user-specific keys
9. **Index coverage** — needs audit against actual query patterns
10. **Frontend persistence** — needs standardization and documentation
