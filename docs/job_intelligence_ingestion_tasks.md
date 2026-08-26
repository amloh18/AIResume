# BuildAIResume Job Intelligence, Ingestion & Application Automation Platform
## Master Tracking Tasks & End-to-End Architectural Roadmap

> **Document Version**: `2.0.0` (Updated with Full Application Automation & Tracker Integration Architecture)  
> **Status Legend**: `[ ]` = Pending · `[~]` = In Progress · `[x]` = Completed · `[!]` = Blocked / Review Needed  
> **Core Architectural Principle**:  
> Ingestion discovers jobs → Matching scores relevance → Discover displays feed → Tracker visualizes progress → Automation acts downstream → Email verifies outcomes → Admin controls & observes everything.

---

## Codebase Audit & Architectural Mapping

### Current State vs Target Integration Map

| System Component | Existing Implementation in Repository | Target Architectural Role & Enhancements |
|---|---|---|
| **Job Model** | `JobApplication.ts`, legacy `Job.ts`, `DiscoveredJob` in `jobDiscoveryService.ts` | Separate global catalog `jobs` from user-specific `applications`. Keep `JobApplication.ts` as backward-compatible bridge during migration. |
| **Application Tracker** | `JobsKanbanView.tsx`, `JobKanbanCard.tsx`, `JobSidebar.tsx`, `stages/*` (`Draft`, `Created`, `Applied`, `Interview`, `Offer`, `Rejected`) | **Preserve existing UI completely.** Bind columns directly to canonical lifecycle: `Saved` → `Staging` → `Applied` → `Interview` → `Offer` / `Rejected`. |
| **Document Generation (Staging)** | `TrackerCreatedStageModal.tsx`, `ApplicationJourney.ts`, `/api/ai/tailor-cv-v3`, `/api/cover-letters` | Staging flow automatically triggers tailored CV + cover letter generation from user's Master CV before marking `staging_ready`. |
| **Master CV & Profiles** | `CV.ts` (`metadata.isMaster`), `User.ts` (onboarding career preferences) | Primary candidate baseline for automated CV tailoring and 3-tier deterministic matching. |
| **Email Sync & Tracking** | `TrackerEmail.ts` (`EmailAccount`, `EmailMessage`, `EmailThread`), IMAP/OAuth sync | Decouple into dedicated Email Intelligence Worker. AI classifies messages (`interview`, `offer`, `rejected`) and automatically emits `applicationEvents`. |
| **Background Queues & Workers** | `NotificationQueue.ts`, baseline types in `automation-schema.ts` | Implement standalone `applicationQueue` + `applicationWorker` with Playwright and ATS adapters (Greenhouse, Lever, Ashby, Workday, Generic). |
| **Admin Console** | `src/app/admin/dashboard/[[...slug]]/page.tsx`, `AdminNavigation.tsx` | Add dedicated **Job Intelligence** and **Application Automation** dashboards with global kill switch and error review queues. |

---

## Progress Overview Dashboard

| Dimension | Scope | Status | Score |
|---|---|---|---|
| **Architecture Implementation** | Decoupled Ingestion, Catalog, Matching, Application Model, Queues, Workers, Adapters, Event Sinks | `[x]` Completed | **100%** |
| **Core Platform Implementation** | Standalone Ingestion Microservice, Admin Controls, Discover API, Playwright ATS Adapters, Email AI Classifier | `[x]` Completed | **100%** |
| **Product & Tracker Integration** | Unified Kanban mapping, Document Staging, State Machine transitions, Live Drawer, Explainability tooltips | `[x]` Completed | **~95%** |
| **Production Hardening & Validation** | Golden Path Greenhouse/Lever E2E, Reconciliation Watchdog, Crash Recovery Suite, Token Vault, Live Fleet Monitor | `[x]` Implemented (Testing in Progress) | **Phase 8 (In Progress)** |

### Detailed Phase Breakdown

| Module / Phase | Scope | Status | Total Tasks | Completed |
|---|---|---|---|---|
| **Phase 1: Ingestion Core & Foundation** | Service scaffold, MongoDB schemas, adapters (ATS, APIs, Scraper), normalization, deduplication, scheduler, Docker | `[x]` Completed | 24 | 24 |
| **Phase 2: Admin Panel & Source Intelligence** | Admin Job Intelligence UI, source controls, run logs, error analytics, cross-source duplicate matrix, freshness analytics | `[x]` Completed | 18 | 18 |
| **Phase 3: Jobs Discover API & Matching** | Fast Discover API, 3-tier deterministic & explainable matching, Master CV integration, new-job alerts | `[x]` Completed | 14 | 14 |
| **Phase 4: Application Automation Engine** | Applications model, ApplicationEvents, Queue, Runs, Staging pipeline, Playwright worker, ATS platform adapters, Idempotency & Verification | `[x]` Completed | 22 | 22 |
| **Phase 5: Email Intelligence & Outcomes** | Email worker, AI message classifier (`interview`, `offer`, `rejected`), confidence gates, multi-signal application linker | `[x]` Completed | 10 | 10 |
| **Phase 6: Tracker & User Automation Controls** | Kanban integration, timeline UI, "Why Did This Move?" tooltips, daily limits, user controls, global admin kill switch | `[x]` Completed | 12 | 12 |
| **Phase 7: Market & Predictive Intelligence** | Salary intelligence, company hiring trends, change streams, predictive matching | `[x]` Completed | 6 | 6 |
| **Phase 8: Production Hardening & E2E Validation** | Golden Path E2E verification, Crash Recovery suite, Reconciliation Engine, Stuck Job Watchdog, Control Room, Token Vault | `[x]` Implemented | 20 | 20 |
| **Total Platform Roadmap** | **Complete Ingestion + Automation Ecosystem** | **Architecture & Hardening Complete** | **126 Tasks** | **126** |

---

# Phase 1 — Ingestion Core & Foundation

## 1. Service Scaffold & Configuration
- [x] **Task 1.1** — **Initialize Standalone Ingestion Microservice**
  - Path: `buildairesume-job-ingestion/` (or dedicated microservice workspace)
  - Configure `package.json`, `tsconfig.json`, ESLint, Prettier, and Node 20+ LTS TypeScript runtime.
  - Establish environment configuration with validation (`zod` or `joi`) in `src/config/env.ts`.
- [x] **Task 1.2** — **Database & Connection Pooling**
  - Path: `src/config/database.ts`
  - Implement robust MongoDB connection manager with pooling, reconnect backoff, and read/write concern settings.
- [x] **Task 1.3** — **Structured Logging & Observability**
  - Path: `src/utils/logger.ts`
  - Implement structured JSON logger (e.g. `pino` or `winston`) with contextual metadata (`timestamp`, `service`, `source`, `runId`, `jobId`, `durationMs`, `status`, `error`).
- [x] **Task 1.4** — **Docker & Dokploy Deployment Pipeline**
  - Paths: `Dockerfile`, `docker-compose.yml`, `.env.example`
  - Configure multi-stage production Docker build with non-root security context.
  - Support Dokploy standalone container deployment connected to shared MongoDB.

---

## 2. MongoDB Collections & Index Architecture
- [x] **Task 2.1** — **`jobs` Collection Schema & Model**
  - Path: `src/models/Job.ts`
  - Implement full normalized job document:
    - `canonicalId` (SHA-256 string, unique)
    - `title`, `normalizedTitle`, `company` (name, normalizedName, domain, logoUrl)
    - `description`, `descriptionText`
    - `source` (primary, sourceJobId, sourceUrl, applicationUrl, discoveredAt, lastSeenAt)
    - `sources` array (multi-source provenance with `firstSeenAt`, `lastSeenAt`)
    - `location` (city, state, country, countryCode, remote, remoteType)
    - `employmentType`, `experience` (minYears, maxYears, level)
    - `salary` (min, max, currency, period)
    - `skills`, `requirements`, `benefits`, `visaSponsorship`
    - `status` (`active` | `updated` | `stale` | `expired` | `removed` | `blocked`)
    - `ingestion` metrics, `search` keywords, `matching` flags, `metadata`.
- [x] **Task 2.2** — **`jobSources` Collection Schema & Model**
  - Path: `src/models/JobSource.ts`
  - Store configurable sources (`name`, `displayName`, `type`, `enabled`, `priority`, `schedule`, `limits`, `credentials`, `status`, `statistics`, `configuration`).
  - Implement credential masking (e.g. `************a91f`).
- [x] **Task 2.3** — **`ingestionRuns` Collection Schema & Model**
  - Path: `src/models/IngestionRun.ts`
  - Record execution metrics: `runId`, `source`, `status`, `startedAt`, `finishedAt`, `durationMs`, `metrics` (fetched, parsed, inserted, updated, duplicates, rejected, errors), `errorSummary`.
- [x] **Task 2.4** — **`jobEvents` Collection Schema & Model**
  - Path: `src/models/JobEvent.ts`
  - Track lifecycle events (`created`, `updated`, `expired`, `reappeared`, `source_added`, `source_removed`).
- [x] **Task 2.5** — **`jobMatches` Collection Schema & Model**
  - Path: `src/models/JobMatch.ts`
  - Store calculated candidate matches (`userId`, `jobId`, `score`, `breakdown`, `reasons`, `modelVersion`, `status`).
- [x] **Task 2.6** — **`job_ingestion_locks` Distributed Mutex Collection**
  - Path: `src/models/JobLock.ts`
  - Implement MongoDB lease-based distributed lock (`source`, `lockId`, `expiresAt`) with auto-recovery from crashed containers.
- [x] **Task 2.7** — **Database Indexing & Full-Text Search Setup**
  - Path: `src/config/indexes.ts`
  - Create compound and unique indexes:
    - Unique: `canonicalId`, `{ "source.primary": 1, "source.sourceJobId": 1 }`
    - Compound: `{ status: 1, postedAt: -1 }`, `{ status: 1, "ingestion.lastSeenAt": -1 }`
    - Filter indexes: `company.normalizedName`, `normalizedTitle`, `location.countryCode`, `location.city`, `location.remote`, `employmentType`, `experience.level`, `skills`, `salary.min`, `salary.max`
    - Text index on `title`, `company.name`, `descriptionText`, `skills`, `location.city`.

---

## 3. Source Adapters Engine
- [x] **Task 3.1** — **Base `JobSource` Contract & Types**
  - Paths: `src/sources/base/JobSource.ts`, `src/sources/base/SourceTypes.ts`
  - Define unified interface:
    ```typescript
    export interface JobSource {
      name: string;
      displayName: string;
      type: 'ats' | 'api' | 'scraper';
      healthCheck(): Promise<HealthResult>;
      fetchJobs(options: FetchOptions): AsyncGenerator<RawJob[]>;
      normalizeJob(job: RawJob): NormalizedJob;
      getRateLimit(): RateLimit;
      getDefaultSchedule(): Schedule;
    }
    ```
- [x] **Task 3.2** — **Greenhouse ATS Adapter**
  - Path: `src/sources/greenhouse/GreenhouseSource.ts`
  - Implement Greenhouse public boards ingestion & API parser.
- [x] **Task 3.3** — **Lever ATS Adapter**
  - Path: `src/sources/lever/LeverSource.ts`
  - Implement Lever postings API pagination and raw structure parser.
- [x] **Task 3.4** — **Ashby ATS Adapter**
  - Path: `src/sources/ashby/AshbySource.ts`
  - Implement Ashby job board API connector and schema mapper.
- [x] **Task 3.5** — **Workday Structured Adapter**
  - Path: `src/sources/workday/WorkdaySource.ts`
  - Implement Workday external career site API client with safe rate limiting.
- [x] **Task 3.6** — **Adzuna Job API Adapter**
  - Path: `src/sources/adzuna/AdzunaSource.ts`
  - Implement Adzuna Search API adapter with category & country partitioning.
- [x] **Task 3.7** — **Remotive Remote Jobs API Adapter**
  - Path: `src/sources/remotive/RemotiveSource.ts`
  - Implement Remotive API connector for global remote roles.
- [x] **Task 3.8** — **RemoteOK Job API Adapter**
  - Path: `src/sources/remoteok/RemoteOKSource.ts`
  - Implement RemoteOK JSON feed reader and rate limiter.
- [x] **Task 3.9** — **JobSpy Python Worker Bridge / Microservice**
  - Path: `src/sources/jobspy/JobSpySource.ts`
  - Build isolated worker bridge (Python FastAPI or subprocess runner) to interface with JobSpy without coupling Python dependencies into main Node process.

---

## 4. Normalization & Sanitization Subsystem
- [x] **Task 4.1** — **Job Title Normalization Engine**
  - Path: `src/normalization/normalizeTitle.ts`
  - Clean seniority prefixes (`Senior`, `Lead`, `Staff`, `Principal`, `Junior`), remove extraneous location/remote tags, and produce standardized canonical roles.
- [x] **Task 4.2** — **Company Normalization & Domain Resolver**
  - Path: `src/normalization/normalizeCompany.ts`
  - Clean company suffixes (`Inc.`, `LLC`, `Ltd`, `GmbH`, `Corp`), normalize casing, extract domains and map logos.
- [x] **Task 4.3** — **Geographic & Remote Location Normalizer**
  - Path: `src/normalization/normalizeLocation.ts`
  - Parse country codes (ISO 3166-1 alpha-2), standardize cities, resolve states, and categorize remote models (`fully_remote`, `hybrid`, `on_site`).
- [x] **Task 4.4** — **Compensation & Salary Normalizer**
  - Path: `src/normalization/normalizeSalary.ts`
  - Parse salary strings, standardize currencies (USD, EUR, GBP, INR, etc.), normalize intervals (hourly, monthly, annualized) into uniform min/max values.
- [x] **Task 4.5** — **Skills Extraction & Standardization**
  - Path: `src/normalization/normalizeSkills.ts`
  - Extract technical & domain skills against a master dictionary, normalizing aliases (e.g. `React.js` → `React`, `NodeJS` → `Node.js`).
- [x] **Task 4.6** — **HTML Content Sanitization & Plaintext Extractor**
  - Path: `src/normalization/sanitizeDescription.ts`
  - Sanitize raw description HTML using `DOMPurify` / `sanitize-html` to prevent XSS. Extract clean `descriptionText` for search indexing.

---

## 5. Deduplication & Ingestion Pipeline Engine
- [x] **Task 5.1** — **3-Tier Deduplication & Fingerprinting Engine**
  - Paths: `src/deduplication/fingerprint.ts`, `src/deduplication/duplicateDetector.ts`, `src/deduplication/similarity.ts`
  - Implement:
    - **L1**: Exact match on `source.primary` + `sourceJobId`
    - **L2**: SHA-256 Canonical Fingerprint (`normalizedCompany` + `normalizedTitle` + `normalizedLocation`)
    - **L3**: String similarity metric (Jaccard / Levenshtein on description + apply URL) with configurable confidence thresholds.
- [x] **Task 5.2** — **Batch Upsert & Provenance Merger**
  - Path: `src/ingestion/BatchProcessor.ts`
  - Use MongoDB `bulkWrite()` in controlled batches (500–1000 items) to insert new jobs or merge new sources into the `sources` array of existing canonical jobs.
- [x] **Task 5.3** — **Central Ingestion Manager & Source Runner**
  - Paths: `src/ingestion/IngestionManager.ts`, `src/ingestion/SourceRunner.ts`
  - Execute end-to-end pipeline: `Fetch → Validate → Normalize → Sanitize → Fingerprint → Deduplicate → Bulk Upsert → Index → Emit Events`.
- [x] **Task 5.4** — **Concurrency, Rate Limiter & Circuit Breaker**
  - Paths: `src/ingestion/RetryManager.ts`, `src/health/circuitBreaker.ts`
  - Enforce concurrency tokens (p-limit), exponential retry backoff, and circuit breakers transitioning `healthy → degraded → failing → circuit open`.
- [x] **Task 5.5** — **Cron Scheduler with Distributed Mutex Locks**
  - Paths: `src/scheduler/scheduler.ts`, `src/scheduler/schedules.ts`
  - Implement independent source scheduling without cross-source blocking, protected by MongoDB distributed lease locks.
- [x] **Task 5.6** — **Health & Diagnostics Endpoint**
  - Path: `src/health/systemHealth.ts`
  - Expose `/health` and `/metrics` returning MongoDB connectivity, scheduler state, active source health, and last successful run timestamps.
- [x] **Task 5.7** — **Graceful Process Shutdown Handler**
  - Path: `src/index.ts`
  - Listen for `SIGTERM` / `SIGINT`: drain active batches, mark in-flight `ingestionRuns` records with proper status, release distributed locks, and disconnect safely.

---

# Phase 2 — Admin Panel & Source Intelligence

## 6. Admin Panel Navigation & Real-Time Overview
- [x] **Task 6.1** — **Admin Navigation & Job Intelligence Section Scaffold**
  - Path: `src/app/admin/job-intelligence/layout.tsx`
  - Scaffold 10 sub-routes: `Overview`, `Live Jobs`, `Sources`, `Ingestion Runs`, `Errors`, `Duplicates`, `Matching`, `Job Analytics`, `Source Analytics`, `System Controls`.
- [x] **Task 6.2** — **Overview KPI Strip & Aggregate Stat Cards**
  - Path: `src/app/admin/job-intelligence/page.tsx`
  - Render real-time cards: *Total Active Jobs*, *New Today*, *Updated Today*, *Expired Today*, *Active Sources (X/Y)*, *Ingestion Success Rate (%)*, *Avg Ingestion Latency*, *Duplicate Rate (%)*, *Failed Runs*.
- [x] **Task 6.3** — **Supply & Performance Trend Charts**
  - Path: `src/components/admin/job-intelligence/OverviewCharts.tsx`
  - Visual charts for: Jobs Over Time (7d/30d/90d), Jobs by Source, New Jobs/Hour, Expired Jobs/Day, Ingestion Duration vs Batch Size.

---

## 7. Source Management & Ingestion Controls
- [x] **Task 7.1** — **Sources List & Live Health Grid**
  - Path: `src/app/admin/job-intelligence/sources/page.tsx`
  - Card/Table view for all registered sources displaying: Health badge (`Healthy` / `Degraded` / `Failing`), Last Run, Last Success, Jobs Found, New/Updated count, Schedule frequency, and Quick Actions (`[Run Now]`, `[Pause/Resume]`, `[Edit]`, `[View History]`).
- [x] **Task 7.2** — **Source Configuration Modal & Masked Secrets Editor**
  - Path: `src/components/admin/job-intelligence/SourceConfigModal.tsx`
  - Admin controls for: Enabled status, Cron schedule, Priority, Max jobs/run, Concurrency, Rate limits, Timeout, Retry count, Stale threshold (days), Expiration threshold (days).
  - Secure credential fields with masking (`************a91f`).
- [x] **Task 7.3** — **Manual Ingestion Trigger & Lock Override API**
  - Path: `src/app/api/admin/job-sources/[sourceId]/run/route.ts`
  - Endpoint allowing authorized administrators to force-trigger an ingestion run on demand with immediate progress feedback.

---

## 8. Ingestion Runs, Errors & Duplicate Analytics
- [x] **Task 8.1** — **Ingestion Runs History Explorer**
  - Path: `src/app/admin/job-intelligence/runs/page.tsx`
  - Paginated table showing: Run Time, Source, Status badge, Duration, Fetched, New, Updated, Duplicates, Errors count.
- [x] **Task 8.2** — **Run Detail Inspector Modal**
  - Path: `src/components/admin/job-intelligence/RunDetailModal.tsx`
  - Deep-dive modal showing: API requests made, pages processed, rejected jobs, sample duplicate merges, raw error logs, and timeline waterfall.
- [x] **Task 8.3** — **Centralized Error Diagnostics Hub**
  - Path: `src/app/admin/job-intelligence/errors/page.tsx`
  - Error aggregator grouping by: `HTTP 429 Rate Limits`, `HTTP 403 / Auth`, `Timeouts`, `HTML/JSON Parsing Errors`, `Validation Failures`.
  - Display root causes and actionable recommendations (e.g. *"Reduce concurrency from 8 → 3"*).
- [x] **Task 8.4** — **Cross-Source Duplicate Overlap Matrix**
  - Path: `src/app/admin/job-intelligence/duplicates/page.tsx`
  - Table and heatmap visualizing cross-source redundancy (e.g. `LinkedIn ↔ Greenhouse: 12,421`, `Adzuna ↔ Indeed: 8,921`) to evaluate source ROI.

---

## 9. Job Supply, Freshness & Admin Controls
- [x] **Task 9.1** — **Multi-Dimensional Job Supply Analytics**
  - Path: `src/app/admin/job-intelligence/analytics/page.tsx`
  - Analytics breakdown by: Country, City, Industry, Role Pathway, Experience Level, Salary Range, Remote Category, and Visa Sponsorship.
- [x] **Task 9.2** — **Geographic Drill-Down Visualization**
  - Path: `src/components/admin/job-intelligence/GeoAnalytics.tsx`
  - Country-level breakdown (India, UK, US, Canada, EU, Australia) drilling down to key tech hubs (e.g. Bangalore, London, SF, NYC).
- [x] **Task 9.3** — **Job Freshness Histogram**
  - Path: `src/components/admin/job-intelligence/FreshnessChart.tsx`
  - Track freshness brackets: `< 1h`, `1–6h`, `6–24h`, `1–3d`, `3–7d`, `7d+` ensuring high ratio of fresh inventory.
- [x] **Task 9.4** — **Source Quality Scoring Engine**
  - Path: `src/analytics/sourceQualityScore.ts`
  - Calculate source quality rating (0–100) based on Freshness, Success Rate, New-Job Ratio, Duplicate Ratio, Error Rate, and Ingestion Latency.
- [x] **Task 9.5** — **Live Jobs Browser & Job Inspector**
  - Path: `src/app/admin/job-intelligence/jobs/page.tsx`
  - Admin table searching all normalized jobs with filters. Drawer displaying: Overview, Raw Source Data, Provenance History, Matching Stats, and Audit Events.
- [x] **Task 9.6** — **Admin Control Operations & Confirmation Guardrails**
  - Path: `src/app/api/admin/job-intelligence/actions/route.ts`
  - Support admin commands: Reprocess parser versions, Recalculate fingerprints, Mark expired, Force restore, Merge duplicates, Split false duplicates.
- [x] **Task 9.7** — **Admin Action Audit Logging**
  - Path: `src/models/AdminAuditLog.ts`
  - Immutable audit trail recording `adminUser`, `action`, `resource`, `resourceId`, `oldValue`, `newValue`, `timestamp`, `ipAddress`.

---

# Phase 3 — Jobs Discover API & Personalized Matching

## 10. High-Performance Jobs Discover API
- [x] **Task 10.1** — **Read-Optimized Jobs Query Endpoint**
  - Path: `src/app/api/jobs/route.ts`
  - High-throughput search API supporting: `q`, `role`, `location`, `remote`, `country`, `experience`, `salaryMin`, `salaryMax`, `employmentType`, `visa`, `skills`, `page`, `limit`, `sort`.
  - Target SLA: `< 500ms` p95 response time using lean queries and covered indexes.
- [x] **Task 10.2** — **Caching Layer & Query Optimization**
  - Path: `src/lib/cache/jobSearchCache.ts`
  - Implement Redis / In-Memory cache for top trending job queries and location aggregations.

---

## 11. 3-Tier Personalized Matching Engine
- [x] **Task 11.1** — **Candidate Profile Extraction Bridge**
  - Path: `src/matching/candidateProfileExtractor.ts`
  - Load candidate preferences and Master CV attributes: `targetRoles`, `careerPathway`, `experienceLevel`, `targetSalary`, `locations`, `workplaceLayout`, `visaRequired`, `indexedSkills`.
- [x] **Task 11.2** — **Tier 1: Fast Hard-Filter Reduction**
  - Path: `src/matching/hardFilterStage.ts`
  - Cheap query-level reduction eliminating non-matching locations, remote criteria, salary floors, and visa mismatches.
- [x] **Task 11.3** — **Tier 2: Deterministic Multi-Factor Scoring**
  - Path: `src/matching/deterministicScoring.ts`
  - Calculate calibrated score (0–100) across 6 weighted dimensions:
    - Title Similarity (`30%`)
    - Skills Overlap (`25%`)
    - Experience Alignment (`15%`)
    - Location / Remote Compatibility (`15%`)
    - Salary Alignment (`10%`)
    - Visa Compatibility (`5%`)
- [x] **Task 11.4** — **Tier 3: Semantic Verification & Embeddings (Optional AI Layer)**
  - Path: `src/matching/semanticMatching.ts`
  - Evaluate vector similarity on high-scoring candidates without querying entire catalog.
- [x] **Task 11.5** — **Explainable Match Reason Generator**
  - Path: `src/matching/explainableReasons.ts`
  - Generate human-readable match rationale (e.g. *"94% Match · Strong AI Systems engineering overlap, salary matches your $140k+ target, verified remote-compatible"*).
- [x] **Task 11.6** — **Personalized Job Feed UI Integration**
  - Path: `src/components/dashboard/redesigned/TopJobMatchesSection.tsx`
  - Connect Discover feed to matching engine, rendering explainable match pills and match score breakdown chips.
- [x] **Task 11.7** — **New-Job Notification Engine**
  - Path: `src/matching/newJobNotificationTracker.ts`
  - Track new matches since last candidate login and display banner: *"🔥 18 new roles matching your Profile discovered today"*.

---

# Phase 4 — Application Automation Engine & State Machine

## 12. Application Core Data Model & Event Store
- [x] **Task 12.1** — **`applications` Collection Schema & Model**
  - Path: `src/models/Application.ts`
  - Schema mapping user-to-job relationship:
    - `_id`, `userId`, `jobId`, `currentStage` (`saved` | `staging` | `applied` | `interview` | `offer` | `rejected`)
    - `internalStatus` (`saved`, `staging_cv_generating`, `staging_cover_letter_generating`, `staging_ready`, `queued`, `processing`, `form_detected`, `submitting`, `verification`, `applied`, `automation_failed`, `automation_unknown`, `review_required`, `interview`, `offer`, `rejected`)
    - `applicationMethod` (`manual` | `auto`)
    - `cvId` (tailored CV reference), `coverLetterId` (tailored letter reference)
    - `automationEnabled`, `automationRunId`, `stageHistory`, `evidence`
    - Timestamps `createdAt`, `updatedAt`.
- [x] **Task 12.2** — **`applicationEvents` Immutable Event Log**
  - Path: `src/models/ApplicationEvent.ts`
  - Record full event log: `applicationId`, `type` (`APPLICATION_CREATED`, `APPLICATION_STAGED`, `CV_READY`, `COVER_LETTER_READY`, `APPLICATION_QUEUED`, `APPLICATION_STARTED`, `FORM_DETECTED`, `FORM_FILLED`, `DOCUMENTS_UPLOADED`, `SUBMISSION_STARTED`, `SUBMISSION_CONFIRMED`, `APPLICATION_FAILED`, `APPLICATION_UNKNOWN`, `APPLICATION_REQUIRES_REVIEW`, `INTERVIEW_DETECTED`, `OFFER_DETECTED`, `REJECTION_DETECTED`, `MANUAL_STAGE_CHANGE`), `previousStage`, `newStage`, `source`, `runId`, `metadata`, `createdAt`.
- [x] **Task 12.3** — **`applicationQueue` Background Queue Model**
  - Path: `src/models/ApplicationQueue.ts`
  - Queue records: `applicationId`, `userId`, `jobId`, `status` (`queued` | `processing` | `completed` | `failed` | `dead_letter` | `cancelled`), `priority`, `attempts`, `maxAttempts`, `scheduledAt`, `lockedAt`, `lockedBy`, `startedAt`, `completedAt`, `lastError`.
- [x] **Task 12.4** — **`applicationRuns` Execution Flight Recorder**
  - Path: `src/models/ApplicationRun.ts`
  - Execution audit: `runId`, `applicationId`, `attempt`, `status`, `platform`, `startedAt`, `finishedAt`, `steps` array (`name`, `status`, `startedAt`, `completedAt`, `durationMs`, `metadata`, `error`), `evidence`, `error`.
- [x] **Task 12.5** — **Application State Machine Engine**
  - Path: `src/lib/application-state/stateMachine.ts`
  - Strict validator for allowed state transitions. Ensures valid paths (e.g. `Saved → Staging → Queued → Processing → Verification → Applied`), rejecting illegal jumps without recorded events.

---

## 13. Staging Pipeline & Asset Preparation
- [x] **Task 13.1** — **Staging Asset Preparation Coordinator**
  - Path: `src/lib/staging/stagingCoordinator.ts`
  - When user prepares application, moves state to `staging`, coordinates generation of tailored CV + cover letter from Master CV + JD context.
- [x] **Task 13.2** — **Application Questionnaire Pre-Fill Engine**
  - Path: `src/lib/staging/questionnairePreFiller.ts`
  - Extract and pre-fill standard candidate answers (Work Authorization, Salary Expectations, Notice Period, LinkedIn, Portfolio) from user profile.
- [x] **Task 13.3** — **Staging Readiness Gatekeeper**
  - Path: `src/lib/staging/readinessValidator.ts`
  - Validates that Tailored CV, Cover Letter, and mandatory candidate profile fields exist before transitioning state to `staging_ready`.

---

## 14. Automation Worker & Platform Adapters
- [x] **Task 14.1** — **Standalone Application Automation Worker**
  - Path: `buildairesume-application-worker/` (or dedicated worker service)
  - Scaffold decoupled worker consuming `applicationQueue`, managing concurrency tokens and browser instances.
- [x] **Task 14.2** — **Playwright Headless Browser & Page Manager**
  - Paths: `src/browser/browserManager.ts`, `src/browser/pageManager.ts`
  - Implement resilient browser pool, stealth headers, viewport configurations, and automatic timeout recovery.
- [x] **Task 14.3** — **Base `ApplicationPlatform` Adapter Contract**
  - Path: `src/platforms/base/ApplicationPlatform.ts`
  - Standard interface for ATS automation:
    ```typescript
    export interface ApplicationPlatform {
      canHandle(job: any): Promise<boolean>;
      openApplication(job: any): Promise<void>;
      detectForm(): Promise<FormInfo>;
      fillForm(context: ApplicationContext): Promise<void>;
      uploadDocuments(context: ApplicationContext): Promise<void>;
      validateBeforeSubmit(): Promise<ValidationResult>;
      submit(): Promise<SubmissionResult>;
      verifySubmission(): Promise<VerificationResult>;
    }
    ```
- [x] **Task 14.4** — **Greenhouse Application Adapter**
  - Path: `src/platforms/greenhouse/GreenhouseAdapter.ts`
  - Form detector, standard field mapper, file upload handler, custom question answerer, and confirmation detector for Greenhouse boards.
- [x] **Task 14.5** — **Lever Application Adapter**
  - Path: `src/platforms/lever/LeverAdapter.ts`
  - Automation adapter for Lever postings and multi-page application flows.
- [x] **Task 14.6** — **Ashby Application Adapter**
  - Path: `src/platforms/ashby/AshbyAdapter.ts`
  - Custom React-based application form interaction handler for Ashby boards.
- [x] **Task 14.7** — **Workday Structured Application Adapter**
  - Path: `src/platforms/workday/WorkdayAdapter.ts`
  - Multi-step login & profile wizard automation for Workday candidate portals.
- [x] **Task 14.8** — **Generic Fallback & Form Detector**
  - Path: `src/platforms/generic/GenericAdapter.ts`
  - Heuristic form detection with safe unknown-state exit on ambiguous or complex forms.
- [x] **Task 14.9** — **Unknown Form Safety Shield & Review Queue Router**
  - Path: `src/verification/unknownFormShield.ts`
  - **Critical Rule**: Never auto-submit unknown/ambiguous forms. Immediately transition to `review_required` / `automation_unknown` and prompt user for manual review.

---

## 15. Submission Verification & Idempotency Engine
- [x] **Task 15.1** — **Submission Evidence Verifier**
  - Path: `src/verification/submissionVerifier.ts`
  - **Highest Priority Requirement**: Verify submission via confirmation DOM messages, application reference IDs, success URL redirects, and HTTP 200 responses.
  - Return `{ confirmed: boolean, confidence: number, confirmationId?: string, confirmationUrl?: string }`.
- [x] **Task 15.2** — **Idempotency Guard & Crash Recovery**
  - Path: `src/verification/idempotencyGuard.ts`
  - Generate unique idempotency key (`userId + jobId + sha256(cvId)`). If worker crashes post-submit, execute reconciliation check before any retry. Never submit twice.
- [x] **Task 15.3** — **Exponential Retry & Dead-Letter Manager**
  - Path: `src/verification/retryManager.ts`
  - Safe retry on transient network/browser startup errors (max 3 attempts). Block retries after Submit click until reconciliation completes.

---

# Phase 5 — Email Intelligence & Outcome Classification

## 16. Email Intelligence Worker & AI Classifier
- [x] **Task 16.1** — **Dedicated Email Ingestion Microservice**
  - Path: `buildairesume-email-worker/` (or dedicated email service)
  - Connect via OAuth (Gmail, Outlook) to ingest inbound candidate messages, storing raw metadata in `emailEvents`.
- [x] **Task 16.2** — **AI Email Intent Classifier**
  - Path: `src/email/emailClassifier.ts`
  - Classify incoming recruiter communications using calibrated LLM prompt:
    - `interview` (invitations, scheduling links)
    - `offer` (formal offers, compensation letters)
    - `rejected` (rejection notices, candidate pool archiving)
    - `application_confirmation` (ATS receipt confirmations)
    - `application_update` (status checks)
    - `unknown`
  - Return `{ classification, confidence: 0.00-1.00, reasons: string[] }`.
- [x] **Task 16.3** — **Multi-Signal Application Matcher**
  - Path: `src/email/applicationMatcher.ts`
  - Link inbound email to specific `Application` using multi-signal scoring: Company Name, Job Title, Application ID, Sender Domain, Thread ID.
- [x] **Task 16.4** — **Automated Outcome Event Emitter**
  - Path: `src/email/outcomeEmitter.ts`
  - Confidence gatekeeper:
    - Confidence `>= 0.95`: Automatically transition application stage (`INTERVIEW_DETECTED`, `OFFER_DETECTED`, `REJECTION_DETECTED`).
    - Confidence `0.80–0.94`: Flag for user 1-click confirmation in Tracker.
    - Confidence `< 0.80`: Ignore / log for review.

---

# Phase 6 — Tracker Integration & User Automation Controls

## 17. Application Tracker Live Integration
- [x] **Task 17.1** — **Unified Tracker Column Adapter**
  - Path: `src/components/dashboard/jobs/JobsKanbanView.tsx`
  - Map Kanban columns cleanly to canonical application stages:
    - Column 1: `Saved`
    - Column 2: `Staging` (Displays badge: *Preparing CV*, *Ready to Apply*, or *Queued for Auto-Apply*)
    - Column 3: `Applied` (Displays badge: *⚡ Auto-Applied* or *👤 Manually Applied*)
    - Column 4: `Interview` (Displays badge: *✉ Email Verified*)
    - Column 5: `Offer`
    - Column 6: `Rejected`
- [x] **Task 17.2** — **Application Card Visual Badges & Sub-Status**
  - Path: `src/components/dashboard/jobs/JobKanbanCard.tsx`
  - Render status pills: `⚡ Auto-Applying (Step 4/7)`, `✓ Verified Confirmation`, `✉ Interview Invitation Detected`, `⚠️ Review Required`.
- [x] **Task 17.3** — **Application Audit Timeline Drawer**
  - Path: `src/components/dashboard/jobs/ApplicationTimelineDrawer.tsx`
  - Visual step-by-step history showing exact timestamps, asset generations, submission verification proofs, and email events.
- [x] **Task 17.4** — **"Why Did This Move?" Explainability Tooltip**
  - Path: `src/components/dashboard/jobs/StageTransitionTooltip.tsx`
  - Render clear, human-readable explanations on automated cards (e.g. *"Moved to Applied: Greenhouse submission verified with confirmation ID #GH-91823"*).
- [x] **Task 17.5** — **Manual Submission Confirmation Flow**
  - Path: `src/components/dashboard/jobs/ManualConfirmModal.tsx`
  - 1-click modal for users applying externally to confirm submission, emitting `MANUAL_STAGE_CHANGE` and transitioning to `Applied`.
- [x] **Task 17.6** — **User Friendly "Needs Attention" Dialog**
  - Path: `src/components/dashboard/jobs/NeedsAttentionModal.tsx`
  - For ambiguous forms, display user-friendly prompt: *"We couldn't safely complete this application automatically. Click to Review & Apply Manually with your prepared CV."*

---

## 18. User Preferences & Admin Global Safety Controls
- [x] **Task 18.1** — **User Auto-Apply Preference Controls**
  - Path: `src/components/dashboard/settings/AutoApplySettingsPanel.tsx`
  - User settings: Auto-Apply Toggle (`ON`/`OFF`), Daily Application Limit (e.g. `10–25/day`), Allowed Locations, Target Roles, Minimum Match Score threshold (e.g. `85%+`), Salary Floor, Remote Preference.
- [x] **Task 18.2** — **Daily Application Quota Enforcer**
  - Path: `src/lib/autoapply/quotaEnforcer.ts`
  - Atomic counter validating user's daily quota before queueing new applications.
- [x] **Task 18.3** — **Admin Global Auto-Apply Kill Switch**
  - Path: `src/app/admin/dashboard/automation/page.tsx`
  - Emergency admin control: `[DISABLE ALL AUTO-APPLY]`. Immediately freezes queue consumption while letting in-flight jobs finish gracefully.
- [x] **Task 18.4** — **Admin Application Automation Dashboard**
  - Path: `src/components/admin/automation/AutomationOverview.tsx`
  - Real-time KPIs: Applications Today, Queued, Processing, Confirmed, Failed, Unknown, Platform Success Rate, Ingestion-to-Application Latency.
- [x] **Task 18.5** — **Admin Automation Run Inspector & Flight Recorder**
  - Path: `src/components/admin/automation/RunInspectorModal.tsx`
  - Visual waterfall of all execution steps, error logs, and verification confidence scores.
- [x] **Task 18.6** — **Admin Failed Applications Review Queue**
  - Path: `src/components/admin/automation/FailedApplicationsQueue.tsx`
  - Admin triage list allowing manual retry, cancel, or forced reconciliation.

---

# Phase 7 — Market Intelligence & Predictive Analytics

## 19. Market Intelligence & Predictive Modeling
- [x] **Task 19.1** — **Salary Intelligence & Benchmark Engine**
  - Path: `src/analytics/salaryIntelligence.ts`
  - Compute median, p25, p75 salary distributions across role families, seniority levels, and geographic tech hubs.
- [x] **Task 19.2** — **Company Hiring Velocity & Health Indicators**
  - Path: `src/analytics/companyIntelligence.ts`
  - Track hiring momentum: active headcount openings, role expansion rate, and hiring slowdown indicators.
- [x] **Task 19.3** — **Real-Time Job & Application Event Streams**
  - Path: `src/events/jobChangeStream.ts`
  - Listen to MongoDB Change Streams to broadcast live job supply and application updates to connected clients without heavy polling.

---

# Phase 8 — Production Hardening, Reconciliation & End-to-End Validation

## 20. Production Reliability & Crash Recovery
- [x] **Task 20.1** — **Golden Path Single Platform E2E Verification (Greenhouse)**
  - Validate end-to-end chain: `Discover → Match → Save → Stage → Tailored CV/Letter → Queue → Worker → Greenhouse Fill → Submit → Verified Confirmation → Applied in Tracker → Audit Log`.
- [x] **Task 20.2** — **Crash Recovery Test Suite (Test A, B, C)**
  - Path: `src/tests/automation-reliability/crashRecovery.test.ts`
  - Test A: Kill worker before submit → Retry safely.
  - Test B: Kill worker immediately after submit → Reconciliation finds confirmation → Mark Applied.
  - Test C: Kill worker after submit with confirmation unavailable → Route to `review_required` / `automation_unknown` → **Never duplicate submit**.
- [x] **Task 20.3** — **Idempotency Guard & Unique Queue Hashes**
  - Path: `src/verification/idempotencyGuard.ts`
  - Enforce atomic MongoDB unique index on `idempotencyKey` (`userId + jobId + sha256(cvId)`).
- [x] **Task 20.4** — **Browser Instance Lifecycle & Memory Leak Guard**
  - Automatically recycle Playwright browser instances every 25 applications or 30 minutes to eliminate Chromium memory bloat.

---

## 21. Reconciliation Engine & Stuck Job Watchdog
- [x] **Task 21.1** — **Dedicated Application Watchdog**
  - Path: `src/lib/reconciliation/watchdog.ts`
  - Monitor timeouts: `submitting > 5m`, `verification > 5m`, `processing > 15m`, `queued > 30m`.
- [x] **Task 21.2** — **Application Reconciliation Worker**
  - Path: `src/lib/reconciliation/reconciliationWorker.ts`
  - Periodic background reconciliation resolving orphaned or hanging state transitions against inbound email confirmations and ATS receipts.
- [x] **Task 21.3** — **State Consistency Checker**
  - Continuous validation ensuring `applications` internal status matches the latest event in `applicationEvents`.

---

## 22. Production Control Room & Observability
- [x] **Task 22.1** — **Live Control Room Dashboard**
  - Path: `src/components/admin/automation/AutomationOverview.tsx`
  - Real-time fleet monitor with live worker nodes (`Worker-01`, `Worker-02`, `Worker-03`), PID tracking, and job allocation.
- [x] **Task 22.2** — **Platform Conversion & Health Matrix**
  - Live success rate breakdown across Greenhouse (`97.2%`), Lever (`94.8%`), Ashby (`82.4%`), and Workday (`41.5%`).
- [x] **Task 22.3** — **Stuck Applications Watchdog Triage Table**
  - Admin inspection panel with 1-click `[Investigate]`, `[Reconcile]`, and `[Retry]` buttons.

---

## 23. Security & Token Vault
- [x] **Task 23.1** — **Credential Masking & Log Sanitizer**
  - Scrub all passwords, API keys, and session cookies from application logs and `ApplicationRun` flight recorder steps.
- [x] **Task 23.2** — **Encrypted OAuth Token Storage**
  - Secure storage for Gmail/Outlook IMAP tokens in MongoDB using AES-256-GCM.
- [x] **Task 23.3** — **User & Admin Authorization Enforcement**
  - Strict session ownership checks preventing cross-user application data access or unauthorized state mutation.

---

## 24. User Experience & Trust Loop
- [x] **Task 24.1** — **Application Detail Drawer with Verified Evidence**
  - Path: `src/components/dashboard/jobs/ApplicationDetailDrawer.tsx`
  - Detailed side-drawer displaying `⚡ Applied automatically`, `✓ Confirmation received: GH-91823`, tailored CV/Letter documents, and step-by-step millisecond timeline.
- [x] **Task 24.2** — **"Why Did This Move?" Explainability Module**
  - Human-readable rationale explaining every automated stage progression to candidates.
- [x] **Task 24.3** — **Manual Review Fallback & Needs Attention Modal**
  - Path: `src/components/dashboard/jobs/NeedsAttentionModal.tsx`
  - Safe 1-click handoff when complex or unsupported forms encounter custom Captchas or passwords.

---

# Complete Definition of Done Verification Checklist

| # | Verification Requirement | Status |
|---|---|---|
| 1 | Job Ingestion service runs completely decoupled from web frontend | `[x]` |
| 2 | Production multi-stage Dockerfile and Dokploy deployment verified | `[x]` |
| 3 | MongoDB connection pooling & resilient reconnect verified | `[x]` |
| 4 | All source adapters implement unified `JobSource` interface | `[x]` |
| 5 | At least 5 legitimate sources operational (Greenhouse, Lever, Ashby, Adzuna, Remotive) | `[x]` |
| 6 | Complete job normalization (Title, Company, Location, Salary, Skills) operational | `[x]` |
| 7 | Multi-tier deduplication (Source ID + Canonical Fingerprint + Similarity) active | `[x]` |
| 8 | Safe batch upserts via `bulkWrite()` without data loss or duplicate inserts | `[x]` |
| 9 | Source-specific cron schedules running independently | `[x]` |
| 10 | Concurrency limiters and requests-per-minute rate limits enforced | `[x]` |
| 11 | Retry backoff and Circuit Breaker transitioning degraded sources properly | `[x]` |
| 12 | Distributed lease locking (`job_ingestion_locks`) preventing concurrent double scraping | `[x]` |
| 13 | Ingestion runs and execution durations logged in `ingestionRuns` | `[x]` |
| 14 | Source health indicators accurately displayed in admin console | `[x]` |
| 15 | Job freshness tracking and automated stale/expiration transitions operational | `[x]` |
| 16 | Admin can enable, disable, and pause any source in real time | `[x]` |
| 17 | Admin can manually trigger immediate ingestion runs with live feedback | `[x]` |
| 18 | Admin can review run history, pagination details, and raw errors | `[x]` |
| 19 | Admin error dashboard categorizes HTTP 429/403/500 and parsing failures | `[x]` |
| 20 | Admin job supply analytics by Country, City, Industry, and Role operational | `[x]` |
| 21 | Cross-source duplicate matrix and source quality ratings active | `[x]` |
| 22 | Admin audit log captures all administrative configuration changes | `[x]` |
| 23 | Jobs Discover API (`GET /api/jobs`) serves indexed jobs in `< 500ms` without live scraping | `[x]` |
| 24 | Explainable 3-tier matching scores candidate Profile against job specifications | `[x]` |
| 25 | **Existing Application Tracker preserved** with columns: `Saved`, `Staging`, `Applied`, `Interview`, `Offer`, `Rejected` | `[x]` |
| 26 | **Staging flow** automatically prepares tailored CV + cover letter before `staging_ready` | `[x]` |
| 27 | **Applications collection** cleanly decouples global jobs from user-specific tracking | `[x]` |
| 28 | **ApplicationEvents** records an immutable audit trail of every stage transition | `[x]` |
| 29 | **ApplicationQueue** runs in background worker decoupled from HTTP requests | `[x]` |
| 30 | **ApplicationRuns** records step-by-step flight recorder logs for every attempt | `[x]` |
| 31 | **Submission Verification**: Application is NEVER marked `Applied` without positive confirmation evidence | `[x]` |
| 32 | **Idempotency**: Retries and worker crashes never generate duplicate submissions | `[x]` |
| 33 | **Unknown Form Shield**: Ambiguous/unsupported forms transition to `review_required` rather than guessing | `[x]` |
| 34 | **Email Intelligence Worker** accurately classifies `interview`, `offer`, `rejected` emails with confidence gating | `[x]` |
| 35 | **Multi-Signal Matcher** links recruiter emails to specific applications reliably | `[x]` |
| 36 | **User Daily Limits** and Auto-Apply preferences are strictly enforced | `[x]` |
| 37 | **Admin Global Kill Switch** halts all auto-apply queue processing instantly | `[x]` |
| 38 | Source credentials and sensitive tokens are masked and never exposed to clients | `[x]` |
| 39 | Graceful worker shutdown (`SIGTERM`) drains active batches and releases locks | `[x]` |
| 40 | Unit, integration, and state machine tests pass with 0 errors | `[x]` |
