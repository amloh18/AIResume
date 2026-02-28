# CV Circle – Job Automation System

**Document:** README_AUTOMATION.md  
**Product:** CV Circle – Job Fetching & Auto-Apply (UK-only v1)  
**Last Updated:** February 2026  
**Owner:** CV Circle Engineering / Product

---

## 1. What This System Is

This system adds **job fetching, matching and (optionally) automated job applications** to CV Circle, with a **UK-only** v1 scope.

From a user's perspective:

- They define the kind of jobs they want.
- CV Circle finds relevant UK jobs for them.
- CV Circle prepares tailored resumes and cover letters.
- CV Circle can assist them in reviewing and submitting applications.
- If they opt in, CV Circle can **submit applications automatically** within strict limits.

From an admin's perspective:

- They control **data sources, limits, and costs**.
- They can see **live metrics** and **shut things down** safely if needed.

The goal is to ship **useful, safe, and commercially viable** automation, not "spray & pray" spam.

---

## 2. Scope & Non-Goals

### 2.1 In Scope (v1)

- Region: **United Kingdom** only.
- Sources: Google Cloud Talent Solution, SerpApi (Google Jobs UK), optional Apify.
- ATS: Greenhouse, Lever, Workable (Ashby optional).
- User features:
  - Job preferences (titles, UK, locations, salary range basics).
  - Jobs page with matched UK jobs and scores.
  - Automation settings (Assisted / Full Auto, caps, windows, blocked companies).
  - Enhanced tracker statuses.
- Admin features:
  - Dashboard with usage & cost.
  - Job sources manager.
  - Automation rules editor.
  - Costs & usage view.
  - Jobs & applications monitor.
  - Kill switches (automation & fetching).
- Automation:
  - Job fetching, normalization, deduplication.
  - Matching & scoring.
  - Document generation (LLM).
  - ATS form automation (Playwright).

### 2.2 Out of Scope (v1)

- Non-UK jobs being auto-applied.
- LinkedIn login-based automation.
- Storage or use of third‑party login credentials.
- Aggressive or deceptive scraping.
- Any hidden automation (everything is explicit to the user).

---

## 3. High-Level Architecture

### 3.1 Conceptual Overview

The system consists of four main layers:

1. **Frontend (Next.js)**
    - User app:
        - Jobs page
        - Automation settings
        - Tracker
    - Admin app (protected route):
        - Dashboard
        - Job sources
        - Rules
        - Costs & usage
        - Monitors
2. **Backend API (Node.js)**
    - REST endpoints for jobs, matches, automation settings, applications, admin controls.
    - Auth & feature gating by user tier (Free / Pro / Auto / Power).
3. **Workers & Queues**
    - Cron jobs to fetch jobs (Google Talent, SerpApi, Apify).
    - Matching jobs to users.
    - LLM document generation.
    - Playwright for ATS submissions.
    - Cost tracking & budget enforcement.
4. **Data Storage**
    - MongoDB for:
        - Users, preferences, jobs, matches, applications, automation settings.
        - Admin rules, API usage, logs.
    - Redis + BullMQ for queues and rate limiting.

### 3.2 Data Flow (Short Version)

1. **Job Fetch**
    - Cron triggers job fetch from configured sources (UK only).
    - Normalize & deduplicate jobs.
    - Store in `jobs` collection.
2. **Matching**
    - For each user with preferences:
        - Compute a 0–100 match score per job.
        - Store in `job_matches`.
3. **User UI**
    - `GET /api/jobs` returns matched jobs above a score threshold.
    - Jobs page shows:
        - Title, company, location, source, ATS, match %, actions.
4. **Automation Trigger**
    - User toggles automation in Settings.
    - User clicks `Auto-Apply` (Assisted or Full Auto).
    - Backend:
        - Checks user tier, limits, admin rules, budget.
        - Enqueues application job.
5. **Application Worker**
    - Worker generates resume + cover letter via LLM.
    - Detects ATS from URL.
    - Uses Playwright to fill and submit the form.
    - Updates `applications` & tracker status.
    - Logs usage and cost.
6. **Admin Oversight**
    - Admin UI shows metrics, errors, and cost.
    - Admin can change rules, disable sources, or hit kill switches.

---

## 4. Core Features (User-Facing)

### 4.1 Jobs Page

- Shows UK jobs based on the user's preferences.
- Columns:
    - Job title
    - Company
    - Location / Remote
    - Match score (%)
    - Source (Google Jobs, etc.)
    - ATS type (if detected)
- Actions:
    - View (open job)
    - Add to Tracker
    - Auto-Apply (if user + job are eligible)


### 4.2 Job Preferences

- Multi-input titles (e.g. "Data Analyst", "Business Analyst").
- Country locked to United Kingdom for v1.
- Locations (e.g. London, Remote).
- Optional salary floor.
- Drives:
    - Which jobs are fetched.
    - Which jobs are eligible for auto-apply.


### 4.3 Automation Settings

- Located under: `Settings → Automation`.
- Controls:
    - Enable / disable automation.
    - Daily apply limit.
    - Time window (e.g. 09:00–18:00).
    - Mode:
        - Assisted (default)
        - Full Auto (opt-in, higher tiers only).
    - Blocked companies (array of strings).
- Read-only:
    - Supported ATS list.


### 4.4 Tracker Enhancements

- Existing pipeline extended to:
    - `draft → created → queued → applying → applied → failed → interview → offer`.
- Each card shows:
    - Match or ATS score.
    - Source.
    - Whether it was auto-applied or manual.
- Hover tooltips show:
    - What automation did (resume/cover letter generated, submit pending/done).

---

## 5. Core Features (Admin-Facing)

### 5.1 Admin Dashboard

- Key metrics:
    - Active users (with automation enabled).
    - Jobs fetched today.
    - Auto-applies today.
    - Failures today.
    - Monthly API spend vs budget.
- Actions:
    - Global kill switches:
        - Kill Auto-Apply.
        - Disable Job Fetching.


### 5.2 Job Sources

- Table of configured sources:
    - Google Talent
    - SerpApi
    - Apify (optional)
- Parameters per source:
    - Status (on/off).
    - Frequency (daily/weekly).
    - Max jobs per run.
    - Monthly cap.
- Admin can edit or disable sources at any time.


### 5.3 Automation Rules

- Global settings:
    - Global auto-apply enable/disable.
    - Default mode (assisted or auto).
    - Max applies per user per day.
    - Cooldown after failures (in hours).
    - Allowed ATS list.
    - Block unknown ATS.


### 5.4 Costs & Usage

- For each provider:
    - Monthly usage.
    - Limit.
    - Cost so far.
- Global:
    - Total vs budget.
    - Auto-disable threshold.


### 5.5 Jobs & Applications Monitor

- Jobs monitor:
    - Recently fetched jobs.
    - Per-source match quality and status.
- Applications monitor:
    - Recent applications.
    - Per-user stats.
    - Failures with reasons.
    - ATS-specific error patterns.

---

## 6. Pricing & Tiers (Summary)

Pricing is implemented via **feature flags** in the backend.

Example tiers:

- **Free**
    - No auto-apply.
    - No job fetching (or heavily limited).
    - Basic resume tools.
- **Pro (£9 / month)**
    - Job fetching (UK).
    - Matching & alerts.
    - Assisted apply only.
    - Daily cap: low (e.g. 3).
- **Auto (£19 / month)**
    - Assisted auto-apply.
    - Higher daily caps.
    - KPI analytics.
- **Power (£29–39 / month)**
    - Full auto-apply.
    - Priority queue.
    - Highest daily caps.

Backend enforcement pattern (example):

```ts
if (!user.features.autoApply) {
  throw new Error("Auto-apply is not available on your plan.");
}

if (todayApplies >= user.limits.dailyApplyCap) {
  // stop queueing
}
```

Details, including margin calculations and cost tables, live in `automation-guide.md`.

---

## 7. Safety & Compliance (Principles)

This system is designed to be **safe, transparent, and sustainable**.

Key principles:

1. **Assisted mode by default**
    - Users must opt into full auto.
2. **Daily caps**
    - Per tier, strictly enforced.
3. **Supported ATS only**
    - Unknown ATS = assisted mode or blocked.
4. **Legal transparency**
    - Disclosure modal on first enable.
    - TOS clearly defines what CV Circle does and does not guarantee.
5. **Cost protection**
    - Monthly budget cap with auto-disable.
6. **Auditability**
    - Every application and automated action logged.

Full TOS and user messaging live in `automation-guide.md` (legal / UX sections).

---

## 8. Tech Stack

Recommended:

- **Frontend**
    - Next.js (App Router or Pages)
    - React, TypeScript
    - Tailwind or your design system
- **Backend**
    - Node.js / TypeScript
    - REST API routes (Next.js API routes or separate service)
    - MongoDB (Atlas)
    - Redis + BullMQ
- **Automation**
    - Playwright (headful mode)
    - Proxies (light usage)
    - Rate limiting and backoff
- **AI / LLM**
    - OpenAI or Claude
    - Used for:
        - Resume tailoring
        - Cover letters
        - Keyword extraction
- **Infra**
    - Vercel (frontend)
    - Railway/Fly.io/Render (workers & queues)
    - Monitoring & logging (e.g. Logtail, Datadog, Sentry)

Exact architecture details are in `AUTOMATION_ARCHITECTURE.md`.

---

## 9. Getting Started (Per Role)

### 9.1 Product / Founder

1. Read `00_START_HERE.md`.
2. Read this README.
3. Skim `automation-guide.md` sections:
    - System overview
    - User UI
    - Admin UI
    - Pricing & costs
    - Legal & safety
4. Decide:
    - Initial tier pricing.
    - Launch geography (UK-only).
    - KPI targets.

### 9.2 Frontend Engineer

1. Read `00_START_HERE.md`.
2. Read this README.
3. Read `automation-guide.md` user/admin UI sections.
4. Read `AUTOMATION_ARCHITECTURE.md` component mapping.
5. Start with:
    - Jobs page.
    - Automation settings.
    - Tracker enhancements.

### 9.3 Backend Engineer

1. Read `00_START_HERE.md`.
2. Read this README.
3. Read `automation-guide.md` DB schema + API contracts.
4. Read data flow section in `AUTOMATION_ARCHITECTURE.md`.
5. Start with:
    - Job preferences endpoints.
    - Jobs & matches endpoints.
    - Automation settings & application queueing.

### 9.4 DevOps / Infra

1. Read this README.
2. Read architecture overview in `AUTOMATION_ARCHITECTURE.md`.
3. Read infra section in `automation-guide.md`.
4. Set up:
    - Mongo, Redis, worker runtime.
    - Separate queues: fetch, match, documents, apply.
    - Monitoring for errors and costs.

### 9.5 QA / Testing

1. Read this README.
2. Read testing strategy in `AUTOMATION_ARCHITECTURE.md`.
3. Plan:
    - Unit tests for scoring & limits.
    - Integration tests for API flows.
    - E2E tests for assisted & full auto flows.
    - Manual tests against real ATS sandboxes.

---

## 10. Implementation Roadmap (Overview)

See `IMPLEMENTATION_ROADMAP.md` for full detail.

### Phase 1 – MVP (Weeks 1–6)

- Job preferences UI.
- Jobs page (read-only, from Google Talent).
- Basic matching & score display.
- Assisted apply only.
- Tracker integration.


### Phase 2 – Production Hardening (Weeks 7–9)

- SerpApi integration.
- Admin dashboard.
- Automation rules & caps.
- Cost tracking & safeguards.
- Playwright patterns for supported ATS.


### Phase 3 – Scale & Analytics (Weeks 10–12)

- Full auto-apply (opt-in).
- KPI dashboards.
- Performance & error monitoring.
- Beta → production rollout.

---

## 11. Checklists

### 11.1 Before Coding

- [ ] Read `00_START_HERE.md`.
- [ ] Read this README.
- [ ] Agree on UK-only v1 constraint.
- [ ] Agree on initial pricing tiers.
- [ ] Confirm tech stack and infra.


### 11.2 Before Beta

- [ ] End-to-end assisted apply flow works.
- [ ] Basic admin controls in place.
- [ ] Costs tracked and visible.
- [ ] Legal copy approved.


### 11.3 Before Public Launch

- [ ] Full auto-apply tested on real ATS flows.
- [ ] Kill switches verified.
- [ ] Budget limits enforced.
- [ ] Monitoring and alerts live.
- [ ] Beta feedback incorporated.

---

## 12. FAQ (Internal)

**Q: Can we extend beyond the UK later?**
Yes, but it should be treated as a Phase 4+ project with dedicated design, legal, and scaling work.

**Q: Can we support more ATS?**
Yes, by adding more Playwright handlers and updating the allowed ATS list.

**Q: Why Assisted by default?**
Trust and safety. Users should see what's being sent before we automate fully.

**Q: Why all the caps and kill switches?**
To avoid account bans, user complaints, and runaway infrastructure bills.

**Q: Is this meant to be "fire and forget"?**
No. The system is built to be transparent, controllable, and auditable.

---

## 13. Next Steps

1. Create `docs/automation/` in your repo.
2. Save this file as `README_AUTOMATION.md`.
3. Make sure `00_START_HERE.md` exists and links to this file.
4. Start implementing according to `IMPLEMENTATION_ROADMAP.md`.

You now have a clear, top-level README for the CV Circle automation system. Use it as the "front door" for anyone new to the project.
