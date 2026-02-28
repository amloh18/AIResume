# CV Circle – Automation Architecture

**Document:** AUTOMATION_ARCHITECTURE.md  
**Last Updated:** February 2026

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER LAYER                           │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  Jobs Page   │  │   Automation  │  │  Tracker Page   │  │
│  │              │  │   Settings    │  │                 │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       API LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/jobs/*  /api/automation/*  /api/applications/* │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     SERVICE LAYER                            │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │   Job      │ │   Matching   │ │   Application         │ │
│  │ Preferences│ │   Engine     │ │   Service             │ │
│  └────────────┘ └──────────────┘ └───────────────────────┘ │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ Automation │ │    Audit     │ │   LLM Document Gen    │ │
│  │  Service   │ │   Service    │ │                       │ │
│  └────────────┘ └──────────────┘ └───────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    QUEUE & WORKERS                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Redis + BullMQ Job Queues                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │Job Fetch │ │ Matching │ │Document  │ │ Apply    │ │ │
│  │  │ Queue    │ │  Queue   │ │  Queue   │ │  Queue   │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Playwright Workers                        │ │
│  │  (Headful browser automation for ATS)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   MongoDB    │  │    Redis     │  │   File Storage   │  │
│  │  (Primary)   │  │  (Cache)     │  │   (Resumes)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend Components

```
JobsDashboard (Main Container)
├── MetricsGrid
│   ├── MetricCard (x8)
│   └── SparklineChart
├── ChartsRow
│   ├── MatchScoreDistributionChart (Bar)
│   ├── SourceBreakdownChart (Donut)
│   ├── TopCompaniesChart (Horizontal Bar)
│   └── ApplicationsTrendChart (Area)
├── FiltersBar
│   ├── SearchInput
│   ├── RangeSlider (Match Score)
│   ├── MultiSelect (Companies, Locations, Sources, ATS, Status)
│   ├── SortDropdown
│   └── ResetButton
├── JobsTable
│   ├── TableHeader (Sortable)
│   ├── TableRow (x per page)
│   │   ├── JobTitle
│   │   ├── Company
│   │   ├── Location
│   │   ├── MatchScoreBar
│   │   ├── SalaryDisplay
│   │   ├── SourceBadge
│   │   ├── StatusBadge
│   │   └── ActionButtons
│   └── Pagination
└── JobDetailModal
    ├── ModalHeader
    ├── JobInfo
    ├── MatchScoreBreakdown
    ├── SalarySection
    ├── ATSInfo
    ├── JobDescription
    ├── ApplicationHistory
    └── ActionButtons
```

### 2.2 Service Architecture

```typescript
// Job Preferences Service
interface JobPreferencesService {
  getPreferences(userId: string): Promise<JobPreferences>;
  updatePreferences(userId: string, prefs: JobPreferences): Promise<void>;
  validatePreferences(prefs: JobPreferences): ValidationResult;
}

// Job Matching Service
interface JobMatchingService {
  computeScore(userId: string, jobId: string): Promise<MatchScore>;
  rematchAllJobsForUser(userId: string): Promise<void>;
  getEligibleJobs(userId: string, minScore: number): Promise<Job[]>;
}

// Application Service
interface ApplicationService {
  createApplication(userId: string, jobId: string, mode: Mode): Promise<Application>;
  updateApplicationStatus(appId: string, status: Status): Promise<void>;
  getApplicationHistory(userId: string): Promise<Application[]>;
}

// Automation Service
interface AutomationService {
  checkDailyLimit(userId: string): Promise<boolean>;
  applyFailureCooldown(userId: string): Promise<void>;
  getFailureCooldownRemaining(userId: string): Promise<number>;
}

// Audit Service
interface AuditService {
  logAction(actor: string, action: string, target?: string, metadata?: object): Promise<void>;
  queryAuditLog(filters: AuditFilters): Promise<AuditLog[]>;
}
```

---

## 3. Data Flow Diagrams

### 3.1 Job Matching Flow

```
[Cron Job Trigger]
        │
        ▼
[Fetch Jobs from Sources]
   (Google Talent, SerpApi, Apify)
        │
        ▼
[Normalize & Deduplicate]
        │
        ▼
[Store in jobs collection]
        │
        ▼
[For each user with preferences]
        │
        ▼
[Compute Match Score]
   (40% skills + 30% title + 20% location + 10% recency)
        │
        ▼
[Store in job_matches]
        │
        ▼
[Jobs available to user]
```

### 3.2 Auto-Apply Flow

```
[User clicks "Auto-Apply"]
        │
        ▼
[POST /api/applications/auto]
        │
        ▼
[Check User Tier & Limits]
        │
        ├─ Daily limit exceeded? → Reject
        ├─ Cooldown active? → Reject
        ├─ ATS unsupported? → Reject
        └─ OK → Continue
        │
        ▼
[Generate Resume & Cover Letter]
   (LLM service)
        │
        ▼
[Create Application Record]
   (status: queued)
        │
        ▼
[Enqueue to Apply Queue]
        │
        ▼
[Playwright Worker picks up]
        │
        ▼
[Navigate to ATS]
        │
        ▼
[Fill Form & Upload Resume]
        │
        ▼
[Submit Application]
        │
        ├─ Success → Update status: applied
        └─ Failure → Update status: failed + reason
        │
        ▼
[Update Tracker]
        │
        ▼
[Log to Audit Trail]
        │
        ▼
[Track Cost]
```

### 3.3 Admin Kill Switch Flow

```
[Admin clicks "Kill Switch"]
        │
        ▼
[POST /api/admin/kill-switch]
        │
        ▼
[Update admin_rules]
   (globalAutoApplyEnabled: false)
        │
        ▼
[Reject all new apply requests]
        │
        ▼
[Drain existing queue]
   (complete in-flight, reject new)
        │
        ▼
[Log action to audit_logs]
        │
        ▼
[Notify affected users]
   (optional: email/notification)
```

---

## 4. State Management

### 4.1 Frontend State

Using React hooks + Context:

```typescript
// Jobs Dashboard Context
interface JobsDashboardState {
  metrics: JobsMetrics | null;
  jobs: JobListing[];
  filters: JobsFilter;
  page: number;
  pageSize: number;
  loading: boolean;
  selectedJob: JobListing | null;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
}

// Theme Context (existing)
interface ThemeContextState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

### 4.2 Backend State

- **Session-based auth** (JWT or session cookies)
- **Server-side state** in MongoDB (preferences, settings, applications)
- **Queue state** in Redis (job statuses, worker assignments)
- **Cache** in Redis (frequently accessed data, rate limits)

---

## 5. Error Handling

### 5.1 Frontend Error Boundaries

```typescript
<ErrorBoundary fallback={<JobsErrorState />}>
  <Suspense fallback={<JobsLoadingState />}>
    <JobsDashboard />
  </Suspense>
</ErrorBoundary>
```

### 5.2 API Error Responses

Standard format:

```json
{
  "error": {
    "code": "DAILY_LIMIT_EXCEEDED",
    "message": "You've reached your daily application limit of 3.",
    "details": {
      "limit": 3,
      "used": 3,
      "resetAt": "2026-02-06T00:00:00Z"
    }
  }
}
```

Error codes:
- `DAILY_LIMIT_EXCEEDED`
- `COOLDOWN_ACTIVE`
- `TIER_INSUFFICIENT`
- `ATS_UNSUPPORTED`
- `JOB_NOT_ELIGIBLE`
- `AUTOMATION_DISABLED`

### 5.3 Worker Error Handling

```typescript
// Retry policy
const retryPolicy = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 10s, 20s
  },
};

// Failure handling
queue.on('failed', async (job, err) => {
  await Application.findByIdAndUpdate(job.data.applicationId, {
    status: 'failed',
    failureReason: err.message,
  });
  
  await AuditService.logAction(
    job.data.userId,
    'application_failed',
    job.data.jobId,
    { error: err.message }
  );
  
  await checkFailureCooldown(job.data.userId);
});
```

---

## 6. Security Architecture

### 6.1 Authentication & Authorization

```typescript
// Middleware stack
app.use(authenticate); // Verify JWT/session
app.use(checkTier);    // Verify user tier for feature access
app.use(checkRole);    // Verify admin role for admin endpoints
```

### 6.2 Rate Limiting

```typescript
// Per-user rate limits
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rate_limit',
  points: 100, // requests
  duration: 60, // per 60 seconds
});
```

### 6.3 Data Validation

```typescript
// Zod schemas for all inputs
const JobPreferencesSchema = z.object({
  titles: z.array(z.string()).min(1).max(10),
  locations: z.array(z.string()).max(10),
  country: z.literal('UK'),
  remoteOnly: z.boolean(),
  salaryMin: z.number().optional(),
});
```

---

## 7. Performance Optimization

### 7.1 Database Indexes

```typescript
// Compound indexes for common queries
db.job_matches.createIndex({ userId: 1, score: -1 });
db.applications.createIndex({ userId: 1, createdAt: -1 });
db.jobs.createIndex({ title: 1, company: 1, location: 1 }, { unique: true });
```

### 7.2 Caching Strategy

```typescript
// Cache job metrics for 5 minutes
const cachedMetrics = await redis.get(`metrics:${userId}`);
if (cachedMetrics) return JSON.parse(cachedMetrics);

const metrics = await computeMetrics(userId);
await redis.setex(`metrics:${userId}`, 300, JSON.stringify(metrics));
return metrics;
```

### 7.3 Frontend Optimization

- **Code splitting**: Each dashboard component lazy-loaded
- **Image optimization**: Next.js Image component
- **Data fetching**: SWR for client-side caching
- **Debouncing**: Filter inputs debounced at 300ms

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track

```typescript
// Application metrics
metrics.gauge('jobs.matched.total', totalJobsMatched);
metrics.gauge('applications.pending', pendingApplications);
metrics.gauge('applications.success_rate', successRate);

// System metrics
metrics.gauge('queue.depth', queueDepth);
metrics.histogram('api.latency', latency);
metrics.counter('api.errors', { endpoint, errorCode });

// Cost metrics
metrics.gauge('costs.llm.monthly', llmCostThisMonth);
metrics.gauge('costs.playwright.monthly', playwrightCostThisMonth);
```

### 8.2 Logging

```typescript
// Structured logging
logger.info('Application submitted', {
  userId,
  jobId,
  mode: 'auto',
  atsType: 'greenhouse',
  duration: 3500, // ms
  cost: 0.30, // GBP
});
```

### 8.3 Alerts

- **Critical**: API error rate > 5%
- **Critical**: Application success rate < 70%
- **Warning**: Queue depth > 100
- **Warning**: Monthly cost > 80% of budget
- **Info**: Daily application count milestone

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
describe('JobMatchingService', () => {
  it('computes correct match score', () => {
    const score = computeMatchScore(userProfile, job);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
  
  it('enforces UK-only constraint', () => {
    expect(() => validatePreferences({ country: 'US' }))
      .toThrow('Country must be UK');
  });
});
```

### 9.2 Integration Tests

```typescript
describe('Auto-Apply Flow', () => {
  it('queues application when eligible', async () => {
    const response = await request(app)
      .post('/api/applications/auto')
      .send({ jobId: 'job_123' })
      .expect(200);
    
    expect(response.body).toHaveProperty('applicationId');
    expect(response.body.status).toBe('queued');
  });
  
  it('rejects when daily limit exceeded', async () => {
    await request(app)
      .post('/api/applications/auto')
      .send({ jobId: 'job_456' })
      .expect(429);
  });
});
```

### 9.3 E2E Tests

```typescript
test('User can apply to job', async ({ page }) => {
  await page.goto('/dashboard/jobs');
  await page.click('[data-testid="apply-button-job-123"]');
  await page.click('[data-testid="confirm-apply"]');
  
  await expect(page.locator('[data-testid="success-message"]'))
    .toContainText('Application queued successfully');
});
```

---

## 10. Deployment Architecture

### 10.1 Infrastructure

```
Vercel (Frontend)
  │
  ├─ Next.js App
  └─ Static Assets

Railway/Fly.io (Backend)
  │
  ├─ API Server (Node.js)
  ├─ Worker Processes (BullMQ)
  └─ Playwright Workers

MongoDB Atlas
  │
  └─ Primary Database

Redis Cloud
  │
  ├─ Queue Storage
  └─ Cache

AWS S3 / R2
  │
  └─ Resume Storage
```

### 10.2 Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# API Keys
GOOGLE_TALENT_API_KEY=...
SERPAPI_KEY=...
OPENAI_API_KEY=...

# Feature Flags
AUTOMATION_ENABLED=true
ADMIN_EMAILS=admin@cvcircle.com

# Limits
MAX_APPLIES_PER_DAY=10
MONTHLY_COST_CAP=5000
```

---

## 11. Scalability Considerations

### 11.1 Horizontal Scaling

- **API servers**: Load-balanced across multiple instances
- **Worker pools**: Separate worker nodes for each queue
- **Database**: MongoDB replica set for read scaling

### 11.2 Queue Management

- **Job priority**: Power tier users get priority queue
- **Concurrency limits**: Max 10 Playwright workers simultaneously
- **Graceful degradation**: Fallback to assisted mode if workers overloaded

---

**End of AUTOMATION_ARCHITECTURE.md**
