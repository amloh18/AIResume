# CV Circle – Engineering Tickets

**Ready-to-paste Jira/Linear/Notion tickets**

---

## PHASE 1: MVP (Weeks 1-6)

### TICKET-001: Setup MongoDB Collections
**Type:** Backend Infrastructure  
**Priority:** P0 (Blocker)  
**Est:** 2 days

**Description:**
Create all MongoDB collections with proper indexes for the automation system.

**Acceptance Criteria:**
- [ ] 10 collections created: users, job_preferences, jobs, job_matches, applications, resume_versions, automation_settings, admin_rules, api_usage, audit_logs
- [ ] Indexes applied: userId, email (unique), title+company+location (compound), createdAt
- [ ] Schema validation enabled for critical fields
- [ ] Migration script documented

**Technical Notes:**
- Use MongoDB schema validation
- Document index rationale
- Test performance with 10k+ documents

---

### TICKET-002: Job Preferences API
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 3 days

**Description:**
Build API endpoints for users to set and retrieve job preferences.

**Endpoints:**
- `GET /api/jobs/preferences` - Fetch user's preferences
- `POST /api/jobs/preferences` - Save preferences (triggers rematch)

**Acceptance Criteria:**
- [ ] Preferences save successfully
- [ ] UK-only constraint enforced (reject non-UK)
- [ ] Triggers rematch job on save
- [ ] Returns 400 for invalid input
- [ ] Unit tests pass

**Technical Notes:**
- Use Zod for validation
- Lock country field to "UK"
- Log preference changes to audit_logs

---

### TICKET-003: Job Preferences UI
**Type:** Frontend Feature  
**Priority:** P0 (Blocker)  
**Est:** 3 days

**Description:**
Build UI for users to set job preferences.

**Components:**
- Multi-input for job titles
- Multi-select for locations
- Checkbox for remote only
- Number input for salary minimum

**Acceptance Criteria:**
- [ ] UI renders without errors
- [ ] Multi-inputs work (add/remove)
- [ ] Form validation matches API
- [ ] Saves successfully
- [ ] Dark/light mode styling correct
- [ ] Mobile responsive

**Design:** Figma link (if available)

---

### TICKET-004: Google Talent API Integration
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 4 days

**Description:**
Integrate Google Cloud Talent Solution API to fetch UK jobs daily.

**Features:**
- Cron job runs daily at 2am UTC
- Fetches jobs matching common titles (Data Analyst, Software Engineer, etc.)
- Normalizes response to our schema
- Deduplicates based on title+company+location

**Acceptance Criteria:**
- [ ] Cron job triggers successfully
- [ ] 100+ jobs fetched per run
- [ ] Jobs stored in `jobs` collection
- [ ] Duplicates removed
- [ ] Cost tracked in `api_usage`

**Technical Notes:**
- Use Google Talent API v4
- Implement rate limiting
- Handle API errors gracefully

---

### TICKET-005: Matching Engine
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 5 days

**Description:**
Build matching engine to compute 0-100 score for each user-job pair.

**Algorithm:**
- Skills: 40% (keyword overlap)
- Title: 30% (fuzzy match)
- Location: 20% (exact or "Remote")
- Recency: 10% (posted < 7 days)

**Acceptance Criteria:**
- [ ] Score computed correctly (0-100)
- [ ] Breakdown stored (skills, title, location, recency)
- [ ] Eligibility flag set (score >= 70 and ATS supported)
- [ ] Rematch triggers on preference change
- [ ] Unit tests pass

**Technical Notes:**
- Use fuzzy matching library (e.g., fuzzball)
- Cache user profiles for performance
- Queue rematch jobs asynchronously

---

### TICKET-006: Jobs Page UI
**Type:** Frontend Feature  
**Priority:** P0 (Blocker)  
**Est:** 5 days

**Description:**
Build Jobs Dashboard page with matched jobs list/table.

**Components:**
- Jobs table (desktop) / cards (mobile)
- Columns: title, company, location, match score, salary, source, posted date, status, actions
- Filters: search, match score range, company, location, source, ATS type
- Sorting: by score, date, salary, company
- Pagination: 25/50/100 per page

**Acceptance Criteria:**
- [ ] Jobs display correctly
- [ ] Filters work
- [ ] Sorting works
- [ ] Pagination works
- [ ] Mobile responsive
- [ ] Dark/light mode styling correct
- [ ] Loading/error states implemented

**Design:** Figma link

---

### TICKET-007: LLM Document Generation
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 4 days

**Description:**
Integrate LLM API to generate tailored resumes and cover letters.

**Features:**
- Resume tailoring: extract user skills, match to job keywords
- Cover letter generation: personalized to company and role
- Store versions in `resume_versions` collection
- Track cost per generation

**Acceptance Criteria:**
- [ ] Resume generated in < 30s
- [ ] Cover letter generated in < 30s
- [ ] Keywords aligned with job description
- [ ] Versions stored with jobId
- [ ] Cost tracked
- [ ] Error handling for API failures

**Technical Notes:**
- Use OpenAI GPT-4 or Claude
- Implement retry logic with exponential backoff
- Cache prompts for performance

---

### TICKET-008: Assisted Apply Flow
**Type:** Full Stack Feature  
**Priority:** P0 (Blocker)  
**Est:** 5 days

**Description:**
Build assisted apply flow where user reviews documents before submitting.

**Flow:**
1. User clicks "Apply" on job
2. System generates resume + cover letter
3. Modal shows documents for review
4. User approves or edits
5. System creates application record (status: created)
6. Tracker updated

**Acceptance Criteria:**
- [ ] Apply button triggers flow
- [ ] Documents generated successfully
- [ ] Review modal displays documents
- [ ] User can approve/edit/cancel
- [ ] Application created on approve
- [ ] Tracker updated
- [ ] Audit log written

**Design:** Figma link

---

## PHASE 2: PRODUCTION HARDENING (Weeks 7-9)

### TICKET-009: SerpApi Integration
**Type:** Backend Feature  
**Priority:** P1 (High)  
**Est:** 3 days

**Description:**
Integrate SerpApi to fetch Google Jobs UK listings as secondary source.

**Acceptance Criteria:**
- [ ] Cron job fetches 200+ jobs/day
- [ ] Jobs attributed to "serpapi" source
- [ ] Deduplication with existing jobs
- [ ] Cost tracked

**Technical Notes:**
- Use SerpApi Google Jobs endpoint
- Filter by location: UK
- Handle rate limits

---

### TICKET-010: Admin Dashboard
**Type:** Frontend Feature  
**Priority:** P1 (High)  
**Est:** 5 days

**Description:**
Build admin dashboard for monitoring and controlling automation.

**Sections:**
- Metrics overview (active users, jobs fetched, applies, failures, cost)
- Job sources manager (enable/disable, edit params)
- Automation rules editor (global on/off, caps, cooldown, allowed ATS)
- Kill switches (disable auto-apply, disable fetching, lock users)
- Costs & usage (per provider, total vs budget)
- Jobs & applications monitor (recent jobs, recent applications, failures)

**Acceptance Criteria:**
- [ ] All sections render correctly
- [ ] Metrics display real-time data
- [ ] Rules updates apply immediately
- [ ] Kill switches work
- [ ] Role check: super_admin only

**Design:** Figma link

---

### TICKET-011: Daily Limit Enforcement
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 2 days

**Description:**
Enforce daily application limits server-side based on user tier.

**Logic:**
```ts
if (todayCount >= min(user.dailyLimit, admin.maxApplies)) {
  reject("Daily limit reached");
}
```

**Acceptance Criteria:**
- [ ] Limits enforced before queueing
- [ ] Correct tier caps applied (Pro: 3, Auto: 10, Power: 20)
- [ ] Countdown shown to user
- [ ] Resets at midnight UTC
- [ ] Unit tests pass

---

### TICKET-012: Failure Cooldown Logic
**Type:** Backend Feature  
**Priority:** P1 (High)  
**Est:** 3 days

**Description:**
Pause automation after 3 failures in 24h.

**Logic:**
- Count failures in last 24h
- If >= 3, calculate cooldown end time
- Reject new applies until cooldown expires
- Resume automatically after cooldown

**Acceptance Criteria:**
- [ ] Cooldown triggers after 3 failures
- [ ] Duration configurable (default: 24h)
- [ ] User notified of cooldown
- [ ] Countdown shown
- [ ] Resumes automatically
- [ ] Admin can override

---

### TICKET-013: Cost Tracking & Budget Caps
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 3 days

**Description:**
Track API costs per provider and enforce monthly budget cap.

**Features:**
- Track usage & cost in `api_usage` collection
- Per-provider limits (Google Talent, SerpApi, LLM)
- Global monthly cap
- Auto-disable source if limit hit
- Alert admin at 80% threshold

**Acceptance Criteria:**
- [ ] Cost tracked per API call
- [ ] Monthly totals computed correctly
- [ ] Auto-disable at cap
- [ ] Admin alerted at 80%
- [ ] Dashboard shows usage vs limit

---

### TICKET-014: Audit Logging
**Type:** Backend Feature  
**Priority:** P1 (High)  
**Est:** 2 days

**Description:**
Log every automated action to `audit_logs` for compliance and debugging.

**Events to Log:**
- Preferences updated
- Automation enabled/disabled
- Application queued
- Application applied/failed
- Admin rule changed
- Kill switch activated

**Acceptance Criteria:**
- [ ] All events logged with timestamp, actor, action, target, metadata
- [ ] Logs immutable
- [ ] Admin can query logs
- [ ] Retention policy defined (e.g., 1 year)

---

## PHASE 3: SCALE & AUTOMATION (Weeks 10-12)

### TICKET-015: Playwright Greenhouse Handler
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 5 days

**Description:**
Build Playwright automation for Greenhouse ATS.

**Flow:**
1. Navigate to applyUrl
2. Fill first name, last name, email, phone
3. Upload resume
4. Fill additional fields (if any)
5. Click submit
6. Verify success or capture error

**Acceptance Criteria:**
- [ ] Success rate > 80%
- [ ] Headful mode only
- [ ] Delays 800-2000ms between actions
- [ ] Screenshot on failure
- [ ] Failure reason logged
- [ ] Aborts on CAPTCHA or login

**Technical Notes:**
- Test against Greenhouse sandbox
- Handle dynamic field names
- Implement retry logic (max 3)

---

### TICKET-016: Playwright Lever Handler
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 5 days

**Description:**
Build Playwright automation for Lever ATS (similar to TICKET-015).

---

### TICKET-017: Playwright Workable Handler
**Type:** Backend Feature  
**Priority:** P0 (Blocker)  
**Est:** 5 days

**Description:**
Build Playwright automation for Workable ATS (similar to TICKET-015).

---

### TICKET-018: Full Auto Mode
**Type:** Full Stack Feature  
**Priority:** P1 (High)  
**Est:** 4 days

**Description:**
Enable full auto-apply mode for Power tier users.

**Features:**
- Mode toggle in automation settings
- Disclosure modal on first enable
- Queue jobs automatically based on match score
- Priority queue for Power tier
- User can pause/resume

**Acceptance Criteria:**
- [ ] Mode toggle works
- [ ] Tier check enforced (Power tier only)
- [ ] Disclosure shown on first enable
- [ ] Jobs queued automatically
- [ ] Priority queue processes faster
- [ ] User can pause/resume

---

### TICKET-019: KPI Dashboard (Jobs Page)
**Type:** Frontend Feature  
**Priority:** P1 (High)  
**Est:** 4 days

**Description:**
Add metrics grid and charts to Jobs page.

**Components:**
- MetricsGrid: 8 KPI cards (total matched, avg score, success rate, pending, this week, companies, locations, avg salary)
- ChartsRow: 4 charts (match distribution, source breakdown, top companies, applications trend)

**Acceptance Criteria:**
- [ ] All KPIs display correctly
- [ ] Charts render with correct data
- [ ] Responsive layout
- [ ] Dark/light mode styling
- [ ] Loading states
- [ ] Chart interactions (click to filter)

**Design:** Figma link

---

### TICKET-020: Performance Optimization & Load Testing
**Type:** Backend/DevOps  
**Priority:** P1 (High)  
**Est:** 5 days

**Description:**
Optimize performance and run load tests.

**Tasks:**
- Database query optimization (add missing indexes)
- Caching frequently accessed data (Redis)
- Code splitting on frontend
- Image optimization
- Load test: 1000 users, 10k jobs, 1k applications/day
- Fix bottlenecks identified

**Acceptance Criteria:**
- [ ] Page load < 2s
- [ ] API latency < 500ms (p95)
- [ ] Load tests pass without errors
- [ ] No memory leaks
- [ ] Lighthouse score > 90

---

## BACKLOG (Post-Launch)

### TICKET-021: Apify Integration
**Type:** Backend Feature  
**Priority:** P2 (Nice-to-have)  
**Est:** 3 days

---

### TICKET-022: Email Notifications
**Type:** Backend Feature  
**Priority:** P2 (Nice-to-have)  
**Est:** 3 days

**Features:**
- Daily digest of new matched jobs
- Application status updates
- Automation paused/resumed notifications
- Cooldown expiry notification

---

### TICKET-023: Mobile App (React Native)
**Type:** Mobile Feature  
**Priority:** P3 (Future)  
**Est:** 6 weeks

---

### TICKET-024: EU Country Expansion
**Type:** Full Stack Feature  
**Priority:** P3 (Future)  
**Est:** 8 weeks

**Countries:** Germany, France, Netherlands, etc.
**Requires:** Legal review, multi-language support, local job sources

---

### TICKET-025: LinkedIn Integration (Read-only)
**Type:** Backend Feature  
**Priority:** P3 (Future)  
**Est:** 4 weeks

**Features:**
- Import LinkedIn profile data
- Match to job requirements
- No login automation (read-only API)

---

**End of engineering-tickets.md**
