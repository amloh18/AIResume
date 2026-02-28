# CV Circle – Automation Guide (Deep Spec)

This document is the **authoritative technical specification** for the CV Circle job automation system.
If something is unclear elsewhere, **this document wins**.

---

## SECTION 1: DATA MODEL (DATABASE SCHEMA)

### Design Principles

* MongoDB-first (document-oriented)
* Explicit state tracking (no derived magic)
* Every automated action is auditable
* Server-side enforcement only (never trust client)

---

## 1.1 users

```ts
users {
  _id: ObjectId
  email: string (unique, indexed)
  name: string
  tier: "free" | "pro" | "auto" | "power"
  role: "user" | "admin" | "super_admin"
  createdAt: Date
  lastLoginAt: Date
}
```

Indexes:

* `email` (unique)
* `tier`

Why:

* Tier gates features
* Role gates admin APIs

---

## 1.2 job_preferences

```ts
job_preferences {
  _id: ObjectId
  userId: ObjectId (indexed)
  titles: string[]              // ["Data Analyst", "Business Analyst"]
  locations: string[]           // ["London", "Remote"]
  country: "UK"                 // enforced
  remoteOnly: boolean
  salaryMin?: number
  updatedAt: Date
}
```

Rules:

* Required before any automation
* Country locked to UK for auto-apply
* Used directly by job fetch queries

---

## 1.3 jobs

```ts
jobs {
  _id: ObjectId
  title: string
  company: string
  description: string
  location: string
  country: string
  remote: boolean
  salary?: string
  applyUrl: string
  source: "google_talent" | "serpapi" | "apify"
  atsType: "greenhouse" | "lever" | "workable" | "unknown"
  keywords: string[]
  createdAt: Date
}
```

Indexes:

* `title + company + location` (compound)
* `createdAt`
* `atsType`

Rules:

* Deduplicate before insert
* Never auto-apply if `atsType = unknown`

---

## 1.4 job_matches

```ts
job_matches {
  _id: ObjectId
  userId: ObjectId (indexed)
  jobId: ObjectId (indexed)
  score: number                 // 0–100
  breakdown: {
    skills: number
    title: number
    location: number
    recency: number
  }
  eligibleForAutoApply: boolean
  createdAt: Date
}
```

Rules:

* Generated asynchronously
* Recomputed when preferences change
* Auto-apply eligibility checked here

---

## 1.5 applications

```ts
applications {
  _id: ObjectId
  userId: ObjectId (indexed)
  jobId: ObjectId (indexed)
  resumeVersionId: ObjectId
  coverLetterVersionId: ObjectId
  status:
    | "draft"
    | "created"
    | "queued"
    | "applying"
    | "applied"
    | "failed"
    | "interview"
    | "offer"
  mode: "assisted" | "auto"
  failureReason?: string
  appliedAt?: Date
  createdAt: Date
}
```

Rules:

* One application per user per job
* Status transitions strictly enforced
* Failures logged verbosely

---

## 1.6 resume_versions

```ts
resume_versions {
  _id: ObjectId
  userId: ObjectId
  jobId: ObjectId
  content: string
  keywordsUsed: string[]
  createdAt: Date
}
```

Purpose:

* Audit trail
* ATS optimisation analysis
* Regeneration comparison

---

## 1.7 automation_settings

```ts
automation_settings {
  _id: ObjectId
  userId: ObjectId (indexed)
  enabled: boolean
  mode: "assisted" | "auto"
  dailyLimit: number
  applyWindow: {
    from: "HH:mm"
    to: "HH:mm"
  }
  blockedCompanies: string[]
  updatedAt: Date
}
```

Rules:

* Enforced server-side
* Assisted mode default
* Daily limits capped by tier

---

## 1.8 admin_rules

```ts
admin_rules {
  _id: ObjectId
  globalAutoApplyEnabled: boolean
  defaultMode: "assisted" | "auto"
  maxAppliesPerUserPerDay: number
  failureCooldownHours: number
  allowedATS: string[]
  monthlyCostCap: number
  updatedAt: Date
}
```

Rules:

* Single document only
* Read on every automation decision

---

## 1.9 api_usage

```ts
api_usage {
  _id: ObjectId
  provider: "serpapi" | "google_talent" | "apify" | "llm"
  month: "YYYY-MM"
  used: number
  limit: number
  cost: number
}
```

Purpose:

* Cost enforcement
* Auto-disable sources

---

## 1.10 audit_logs

```ts
audit_logs {
  _id: ObjectId
  actor: ObjectId
  action: string
  target?: ObjectId
  metadata: object
  createdAt: Date
}
```

Everything automation-related writes here.

---

# SECTION 2: API CONTRACTS (FULL)

## Auth

All endpoints require authenticated user.
Admin endpoints require role check.

---

## 2.1 User APIs

### Update Job Preferences

```
POST /api/jobs/preferences
```

Request:

```json
{
  "titles": ["Data Analyst"],
  "locations": ["London"],
  "remoteOnly": false,
  "salaryMin": 40000
}
```

Rules:

* Overwrites existing preferences
* Triggers rematching job

---

### Fetch Matched Jobs

```
GET /api/jobs/list?minScore=70&page=1&limit=50
```

Response:

```json
{
  "jobs": [
    {
      "jobId": "abc",
      "title": "Data Analyst",
      "company": "NHS",
      "score": 82,
      "eligibleForAutoApply": true
    }
  ],
  "total": 342,
  "page": 1,
  "hasMore": true
}
```

---

### Update Automation Settings

```
POST /api/automation/settings
```

Request:

```json
{
  "enabled": true,
  "mode": "assisted",
  "dailyLimit": 5,
  "blockedCompanies": ["Amazon"]
}
```

Server-side enforcement:

* Cap `dailyLimit` by tier
* Reject `mode=auto` if tier < Power

---

### Queue Auto-Apply

```
POST /api/applications/auto
```

Request:

```json
{
  "jobId": "job_123"
}
```

Flow:

* Validate eligibility
* Generate documents
* Create application
* Push to queue

---

## 2.2 Admin APIs

### Update Automation Rules

```
POST /api/admin/automation-rules
```

Request:

```json
{
  "globalAutoApplyEnabled": true,
  "maxAppliesPerUserPerDay": 10,
  "failureCooldownHours": 24,
  "allowedATS": ["greenhouse", "lever", "workable"]
}
```

---

### Toggle Job Source

```
POST /api/admin/job-sources/:source/toggle
```

Parameters:
- `source`: "google_talent" | "serpapi" | "apify"

---

### Kill Switch

```
POST /api/admin/kill-switch
```

Request:

```json
{
  "action": "disable_auto_apply" | "disable_fetching" | "lock_new_users"
}
```

Actions:

* disable_auto_apply
* disable_fetching
* lock_new_users

---

## 2.3 Metrics API

### Get Jobs Metrics

```
GET /api/jobs/metrics
```

Response:

```json
{
  "totalJobsMatched": 342,
  "averageMatchScore": 72.5,
  "applicationSuccessRate": 18.5,
  "pendingApplications": 24,
  "appliedThisWeek": 12,
  "companiesCount": 89,
  "locationsCount": 34,
  "sourceDistribution": {
    "google_talent": 180,
    "serpapi": 162
  },
  "salaryStats": {
    "min": 35000,
    "max": 120000,
    "average": 65000,
    "median": 62000
  },
  "matchDistribution": {
    "excellent": 45,
    "good": 120,
    "moderate": 98,
    "fair": 56,
    "low": 23
  },
  "topCompanies": [
    {"company": "NHS", "count": 15, "avgMatch": 78}
  ],
  "topLocations": [
    {"location": "London", "count": 120}
  ],
  "trendData": [
    {"date": "2026-01-15", "applications": 5, "matches": 23}
  ]
}
```

---

# SECTION 3: AUTOMATION LOGIC (IMPORTANT)

## Daily Limit Enforcement

Checked before queueing any application.

```ts
if (todayCount >= min(user.dailyLimit, admin.maxApplies)) {
  reject("Daily limit reached")
}
```

---

## Failure Cooldown

* 3 failures → pause automation
* Resume after `failureCooldownHours`

Implementation:

```ts
const recentFailures = await Application.countDocuments({
  userId,
  status: 'failed',
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});

if (recentFailures >= 3) {
  const lastFailure = await Application.findOne({
    userId,
    status: 'failed'
  }).sort({ createdAt: -1 });
  
  const cooldownEnd = new Date(lastFailure.createdAt.getTime() + 
    adminRules.failureCooldownHours * 60 * 60 * 1000);
  
  if (new Date() < cooldownEnd) {
    throw new Error('Account in cooldown due to repeated failures');
  }
}
```

---

## ATS Rules

* Unknown ATS → assisted only
* CAPTCHA → abort
* Login required → abort

Detection logic:

```ts
function detectATS(url: string): ATSType {
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('workable.com')) return 'workable';
  return 'unknown';
}
```

---

## Matching Algorithm

Weighted score calculation:

```ts
function computeMatchScore(userProfile, job): number {
  const skillsScore = calculateSkillsOverlap(userProfile.skills, job.keywords);
  const titleScore = calculateTitleSimilarity(userProfile.titles, job.title);
  const locationScore = calculateLocationMatch(userProfile.locations, job.location);
  const recencyScore = calculateRecencyBonus(job.createdAt);
  
  return (
    skillsScore * 0.40 +
    titleScore * 0.30 +
    locationScore * 0.20 +
    recencyScore * 0.10
  );
}
```

---

## Playwright Automation Rules

* Headful mode only
* 800–2000ms delays between actions
* No CAPTCHA retry attempts
* Abort on login walls
* Screenshot on failure

Supported ATS patterns:

### Greenhouse

```ts
await page.goto(applyUrl);
await page.fill('input[name="job_application[first_name]"]', firstName);
await page.fill('input[name="job_application[last_name]"]', lastName);
await page.fill('input[name="job_application[email]"]', email);
await page.setInputFiles('input[type="file"]', resumePath);
await page.click('button[type="submit"]');
```

### Lever

```ts
await page.goto(applyUrl);
await page.fill('input[name="name"]', fullName);
await page.fill('input[name="email"]', email);
await page.fill('input[name="phone"]', phone);
await page.setInputFiles('input[name="resume"]', resumePath);
await page.click('.submit-btn');
```

### Workable

```ts
await page.goto(applyUrl);
await page.fill('#candidate-name', fullName);
await page.fill('#candidate-email', email);
await page.setInputFiles('#resume-upload', resumePath);
await page.click('button.apply-button');
```

---

# SECTION 4: PRICING & LIMITS

## Tiers

| Tier | Price | Jobs Fetched | Daily Apply Cap | Auto Mode | Priority Queue |
|------|-------|--------------|-----------------|-----------|----------------|
| Free | £0 | 0 | 0 | ❌ | ❌ |
| Pro | £9 | 100/month | 3/day | ❌ (assisted only) | ❌ |
| Auto | £19 | 500/month | 10/day | ❌ (assisted only) | ❌ |
| Power | £39 | Unlimited | 20/day | ✅ | ✅ |

## Cost Breakdown (Example)

Per application costs:
- LLM (resume + cover letter): £0.15
- Playwright worker time: £0.10
- Job fetch (amortized): £0.05
- **Total: ~£0.30 per application**

Margin per tier (at 50% utilization):
- Pro: £9 - (3 × 30 × £0.30) = £9 - £27 = **-£18** (loss leader)
- Auto: £19 - (10 × 30 × £0.30) = £19 - £90 = **-£71** (needs optimization)
- Power: £39 - (20 × 30 × £0.30) = £39 - £180 = **-£141** (premium service)

**Break-even strategy:**
- Enforce strict daily caps
- Optimize LLM costs (caching, cheaper models for drafts)
- Reduce Playwright runtime (headless when possible)
- Target 30% utilization, not 50%

---

# SECTION 5: LEGAL & SAFETY

## User Disclosure (Required)

On first automation enable, show modal:

```
CV Circle Automation

By enabling automation, you understand:

✓ CV Circle will apply to jobs on your behalf
✓ Applications are submitted to real companies
✓ You remain responsible for all applications
✓ CV Circle does not guarantee interview or offer outcomes
✓ You can disable automation at any time

Daily limit: 3 applications
Mode: Assisted (you review before submit)

[Cancel] [Enable Automation]
```

## TOS Addition

```
Job Application Automation

CV Circle offers optional automation features that can submit
job applications on your behalf. By using this feature:

1. You grant CV Circle permission to submit applications to
   job postings you select or match your preferences.
2. You acknowledge that CV Circle acts as your agent in
   submitting applications, but does not control hiring outcomes.
3. You remain solely responsible for the accuracy of information
   submitted in applications.
4. CV Circle may limit or disable automation at any time to
   ensure system stability and compliance with third-party terms.
5. You agree to use automation responsibly and not to spam or
   submit fraudulent applications.

CV Circle is not liable for application rejections, technical
failures, or consequences of automated submissions.
```

---

# SECTION 6: MONITORING & ALERTS

## Critical Metrics to Track

1. **Application Success Rate**: applied / (applied + failed)
   - Alert if < 80%
2. **API Cost Burn Rate**: daily spend × 30
   - Alert if > monthly budget
3. **Failure Rate by ATS**: failures per ATS type
   - Alert if any ATS > 50% failure
4. **User Churn on Failures**: users who disable automation after failures
   - Alert if > 10%
5. **Queue Depth**: jobs waiting in apply queue
   - Alert if > 100

## Logging Requirements

Every automation action must log:
- Timestamp
- User ID
- Job ID
- Action (queued / applying / applied / failed)
- Mode (assisted / auto)
- Failure reason (if failed)
- Cost incurred

---

# SECTION 7: TESTING STRATEGY

## Unit Tests

- Matching score calculation
- Daily limit enforcement
- Failure cooldown logic
- Tier permission checks

## Integration Tests

- End-to-end API flows
- Queue processing
- Document generation
- Cost tracking

## E2E Tests

- Playwright dry runs against ATS sandboxes
- Full user journey: preferences → match → apply → track
- Admin controls (kill switches, rule changes)

## Load Tests

- 1000 concurrent users
- 10,000 jobs fetched/day
- 1000 applications/day
- Queue pressure tests

---

# SECTION 8: ROLLOUT PLAN

## Phase 1: Private Beta (Weeks 1-6)

- 50 invited users (Pro tier)
- Assisted mode only
- Manual approval for each application
- Daily monitoring

## Phase 2: Public Beta (Weeks 7-9)

- Open to all Pro/Auto tier users
- Assisted mode default, auto opt-in
- Automated monitoring
- Cost caps enforced

## Phase 3: Production (Weeks 10-12)

- Power tier launch
- Full auto-apply enabled
- KPI dashboards live
- 24/7 monitoring

---

**End of automation-guide.md**
