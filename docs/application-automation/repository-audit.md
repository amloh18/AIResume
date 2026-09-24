# Repository Audit - BuildAIResume

## Executive Summary

BuildAIResume has a **well-structured job ingestion architecture** that already implements many of the patterns found in the reference repositories. The existing system includes:

- ✅ Multi-source job ingestion (Greenhouse, Lever, Ashby, Workday, Adzuna, Remotive, RemoteOK, JobSpy)
- ✅ Source adapter pattern with `JobSource` interface
- ✅ Normalized job model with rich metadata
- ✅ Freshness scoring system
- ✅ Job quality scoring utilities
- ✅ Hard requirements filtering
- ✅ Do-not-apply engine
- ✅ Candidate evidence engine
- ✅ Application quality gate
- ✅ Application modes (Auto/Review/Manual)
- ✅ Success learning utilities
- ✅ Application queue with MongoDB locking
- ✅ Email infrastructure (Stalwart deployment ready)

## What Already Exists

### Job Ingestion Infrastructure

**Location**: `buildairesume-job-ingestion/src/`

| Component | Status | Notes |
|-----------|--------|-------|
| `JobSource` interface | ✅ Complete | Clean adapter pattern with `fetchJobs()`, `healthCheck()`, rate limiting |
| `RawJob` type | ✅ Complete | Rich metadata including salary, employment type, department |
| `NormalizedJob` model | ✅ Complete | Canonical ID, multi-source provenance, freshness, matching fields |
| Greenhouse adapter | ✅ Complete | 25 companies hardcoded, uses public API |
| Lever adapter | ✅ Complete | 13 companies hardcoded, uses public API |
| Ashby adapter | ✅ Complete | 13 companies hardcoded, uses public API |
| Workday adapter | ✅ Complete | Exists but may need expansion |
| Adzuna adapter | ✅ Complete | Multi-country support |
| Remotive adapter | ✅ Complete | Remote tech jobs |
| RemoteOK adapter | ✅ Complete | Remote jobs with ATS links |
| JobSpy adapter | ✅ Complete | Aggregator |
| `IngestionManager` | ✅ Complete | Orchestrates all sources, freshness refresh |
| `IngestionScheduler` | ✅ Complete | Per-source scheduling, stale reconciliation |
| `JobSource` model | ✅ Complete | Source health, statistics, credentials |
| `IngestionRun` model | ✅ Complete | Run metrics, error tracking |

### Job Intelligence Utilities

**Location**: `buildairesume-job-ingestion/src/utils/`

| Utility | Status | Notes |
|---------|--------|-------|
| `freshnessScore.ts` | ✅ Complete | Configurable decay formula, age-based scoring |
| `jobQualityScore.ts` | ✅ Complete | Separates candidate fit, opportunity quality, application readiness |
| `hardFilters.ts` | ✅ Complete | Work auth, location, salary, employment type, certifications |
| `doNotApplyEngine.ts` | ✅ Complete | Explicit skip rules with reasons |
| `candidateEvidenceEngine.ts` | ✅ Complete | Structured evidence from Master CV |
| `applicationQualityGate.ts` | ✅ Complete | Pre-submission validation |
| `applicationModes.ts` | ✅ Complete | Auto/Review/Manual with configurable thresholds |
| `successLearning.ts` | ✅ Complete | Track outcomes, calculate success rates |

### Application Infrastructure

**Location**: `src/`

| Component | Status | Notes |
|-----------|--------|-------|
| `JobApplication` model | ✅ Complete | Rich model with matchScore, trustScore, skillGapAnalysis |
| `ApplicationQueue` model | ✅ Complete | MongoDB-backed with locking, idempotency |
| `ApplicationJourney` model | ✅ Complete | Application lifecycle tracking |
| `TrackerEmail` models | ✅ Complete | EmailAccount, EmailMessage, EmailThread, SenderJobMemory |
| `ApplicationEmailQueue` model | ✅ Complete | Async email queue |
| `emailWorker.ts` | ✅ Complete | Processes email queue with retry |
| `applicationEmailService.ts` | ✅ Complete | Composes and sends application emails |
| Fresh Jobs API | ✅ Complete | `/api/jobs/fresh` endpoint |
| FreshMatchesWidget | ✅ Complete | Dashboard integration |

### Existing Job API Endpoints

**Location**: `src/app/api/jobs/`

| Endpoint | Purpose |
|----------|---------|
| `/api/jobs` | CRUD for jobs |
| `/api/jobs/fresh` | Fresh jobs feed |
| `/api/jobs/discover` | Job discovery |
| `/api/jobs/match` | Job matching |
| `/api/jobs/recommended` | Recommended jobs |
| `/api/jobs/analytics` | Job analytics |
| `/api/jobs/auto-apply` | Auto-apply automation |
| `/api/jobs/[id]` | Job details |
| `/api/jobs/[id]/skill-gap-analysis` | Skill gap analysis |
| `/api/jobs/[id]/insights` | Job insights |

## What's Missing / Needs Improvement

### 1. Company Watchlists

**Current State**: Not implemented

**What's Needed**:
- `CompanyWatchlist` MongoDB model
- API endpoints for CRUD operations
- Integration with ingestion scheduler to prioritize watched companies
- UI for managing watchlists

### 2. Job Deduplication Across Sources

**Current State**: Each source ingests independently, dedup happens at `canonicalId` level

**What's Needed**:
- Cross-source deduplication logic
- Canonical application URL preference
- Source provenance tracking (already in model, needs logic)
- Fingerprint-based fallback dedup

### 3. Company Career Page Discovery

**Current State**: Only known companies hardcoded in adapters

**What's Needed**:
- Dynamic company discovery
- Career page detection
- ATS type detection from URL patterns

### 4. Application Dry-Run Mode

**Current State**: Not implemented

**What's Needed**:
- Detect form fields without submitting
- Map fields to candidate data
- Show intended actions
- Useful for testing ATS adapters

### 5. Application Artifacts

**Current State**: Basic attachment support in JobApplication

**What's Needed**:
- Screenshot capture on errors
- Fill audit logs
- ATS detection results
- Application attempt history

### 6. Browser Automation (Playwright)

**Current State**: Not implemented in repository (referenced in docs)

**What's Needed**:
- ATS adapter architecture
- Deterministic form filling
- Browser context isolation
- CAPTCHA detection (safe halt)

### 7. Resume Routing

**Current State**: Basic resume selection

**What's Needed**:
- Best resume selection per job
- Keyword-based matching
- Multiple resume profile support

## Reusable Components

### Already Reusable

1. **JobSource adapter pattern** - Clean interface, easy to add new sources
2. **NormalizedJob model** - Rich schema with all needed fields
3. **Freshness scoring** - Configurable, production-ready
4. **Job quality scoring** - Multi-dimensional scoring
5. **Hard filters** - Deterministic filtering before AI
6. **Do-not-apply engine** - Explicit skip rules
7. **Application queue** - MongoDB-backed with locking
8. **Email infrastructure** - Stalwart + Nodemailer ready

### Needs Minor Modification

1. **Greenhouse/Lever/Ashby adapters** - Expand company lists, add dynamic discovery
2. **Ingestion scheduler** - Add watchlist priority scheduling
3. **Freshness refresh** - Already integrated, may need optimization

## Dangerous Areas

1. **Existing job ingestion** - Do not break the working pipeline
2. **Application queue locking** - Atomic operations critical
3. **Email idempotency** - Prevent duplicate sends
4. **Browser automation** - Resource-intensive, needs isolation

## Technical Gaps

| Gap | Priority | Complexity |
|-----|----------|------------|
| Company watchlists | P0 | Low |
| Cross-source dedup | P0 | Medium |
| Application dry-run | P1 | Medium |
| Playwright automation | P1 | High |
| Resume routing | P2 | Medium |
| Application artifacts | P2 | Low |

## Opportunities for Integration

1. **Career-Copilot's resume recommendation engine** → Adapt to existing Master CV
2. **job-apply-ai's dry-run mode** → Add to existing application pipeline
3. **job-application-agent's fill audits** → Add to ApplicationJourney
4. **JobSync's company tracking** → Adapt to company watchlists
5. **Career-Copilot's remote eligibility filtering** → Add to hard filters

## Conclusion

BuildAIResume already has a **solid foundation** for job intelligence. The main gaps are:

1. **Company watchlists** - Simple MongoDB model + API
2. **Cross-source dedup** - Logic layer on existing provenance tracking
3. **Application dry-run** - Mode flag in existing automation
4. **Playwright automation** - New module, but architecture is clear

The existing codebase is well-structured and ready for incremental enhancement.
