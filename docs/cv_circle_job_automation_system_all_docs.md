# 📦 CV Circle – Job Automation System Documentation

> This canvas contains **ALL requested documents** combined into a single markdown file for immediate use. Each section is **clearly delimited by filename headers** so you can split them into individual files (`00_START_HERE.md`, `README_AUTOMATION.md`, etc.) without editing content.

---

# ===============================
# FILE: 00_START_HERE.md
# ===============================

## Purpose (Read This First – 5 Minutes)
This document is your executive entry point. It explains **what you are building**, **why it works**, and **how to start safely**.

### What CV Circle Automation Does
- Fetches UK-only jobs
- Matches jobs to user preferences
- Generates tailored resumes & cover letters
- Applies safely via supported ATS
- Tracks every application transparently

### What It Does NOT Do
- No LinkedIn login automation
- No CAPTCHA bypass
- No unlimited or hidden automation

### Core Principle
AI selects → AI prepares → Human approves (default) → Bot submits

### Go/No-Go Checklist
- [ ] Admin rules configured
- [ ] Cost caps set
- [ ] Assisted mode default
- [ ] Kill switches tested

### Quick Start
1. Deploy Jobs page UI
2. Enable Google Talent API
3. Ship Assisted Auto-Apply
4. Add KPI strip
5. Enable Pro tier

---

# ===============================
# FILE: README_AUTOMATION.md
# ===============================

## System Overview
This system introduces **controlled automation** into CV Circle without sacrificing trust, safety, or margins.

### Supported Geography
- United Kingdom only (auto-apply)

### User Journey (High Level)
1. User sets job preferences
2. Jobs fetched & scored
3. User enables automation
4. Documents generated
5. Application submitted
6. Tracker updated

### Core Modules
- Job Fetching
- Matching & Scoring
- Document Generation
- Application Automation
- Tracking & Analytics
- Admin Control Plane

---

# ===============================
# FILE: automation-guide.md
# ===============================

## 1. User UI Specification

### Jobs Page
Components:
- Job Preferences Panel
- KPI Strip
- Job Cards

#### Job Preferences Panel
Fields:
- Job titles (multi-input)
- Country (UK only)
- Locations
- Remote toggle

CTA: Update Preferences

#### KPI Strip
- Jobs fetched
- Jobs applied
- Auto-apply success
- Failures (7 days)

---

## 2. Automation Settings (User)

Fields:
- Enable auto-apply
- Mode: Assisted / Full
- Daily apply cap
- Apply time window
- Blocked companies

---

## 3. Admin Panel Specification

### Admin Sections
- Dashboard
- Job Sources
- Automation Rules
- Costs & Usage
- Jobs Monitor
- Applications Monitor

### Kill Switches
- Disable auto-apply
- Disable fetching
- Lock new users

---

## 4. Database Schema (Summary)

Collections:
- users
- job_preferences
- jobs
- job_matches
- applications
- automation_settings
- admin_rules
- api_usage
- resume_versions
- audit_logs

Indexes defined per collection.

---

## 5. API Contracts (Summary)

User APIs:
- GET /jobs
- POST /jobs/preferences
- POST /automation/settings
- POST /applications/auto

Admin APIs:
- POST /admin/rules
- GET /admin/costs
- POST /admin/kill-switch

---

## 6. Job Fetching Logic

Sources:
- Google Cloud Talent Solution (primary)
- SerpApi (coverage)
- Apify (fallback)

Deduplication:
- title + company + location
- fuzzy similarity

---

## 7. Matching Algorithm

Weighted Score:
- Skills: 40%
- Title: 30%
- Location: 20%
- Recency: 10%

Thresholds enforced by admin rules.

---

## 8. Playwright ATS Automation

Supported:
- Greenhouse
- Lever
- Workable

Rules:
- Headful mode
- Human delays
- No CAPTCHA retries

---

## 9. Pricing Model

Tiers:
- Free
- Pro (£9)
- Auto (£19)
- Power (£39)

Daily caps enforced per tier.

---

## 10. Legal & Compliance

- Explicit user consent
- Assisted mode default
- No credential storage
- Best-effort disclaimer

---

# ===============================
# FILE: AUTOMATION_ARCHITECTURE.md
# ===============================

## Architecture Overview

Frontend (Next.js)
→ API Layer
→ Job Services
→ Queue (Redis)
→ Playwright Workers
→ ATS

---

## Data Flow
User Preferences
→ Job Fetch
→ Normalize
→ Match
→ Display
→ Apply
→ Track

---

## Testing Strategy
- Unit tests: scoring, limits
- Integration: APIs
- E2E: Playwright dry runs
- Load: queue pressure tests

---

# ===============================
# FILE: IMPLEMENTATION_ROADMAP.md
# ===============================

## 12-Week Plan

### Weeks 1–2
- Jobs page UI
- Job preferences
- Google Talent API

### Weeks 3–4
- Matching engine
- KPI strip
- Tracker states

### Weeks 5–6
- Resume & cover letter generation
- Assisted apply flow

### Weeks 7–8
- Playwright ATS (Greenhouse, Lever)
- Failure handling

### Weeks 9–10
- Admin panel
- Cost controls
- Kill switches

### Weeks 11–12
- Pricing enforcement
- Load testing
- Production hardening

---

# ===============================
# FILE: QUICK_REFERENCE.md
# ===============================

## Golden Rules
- UK only
- Assisted default
- Daily caps always on
- Kill switch tested

## Daily Apply Caps
- Pro: 3
- Auto: 5–10
- Power: 10–20

## Break-even
- ~50 paying users

---

# ===============================
# FILE: SYSTEM_DIAGRAM_ASCII.txt
# ===============================

[ User ]
   |
   v
[ Jobs UI ]
   |
   v
[ API Layer ]
   |
   v
[ Matching Engine ]
   |
   v
[ Queue ] ---> [ Playwright Workers ] ---> [ ATS ]
   |
   v
[ Tracker ]

---

# ===============================
# FILE: INDEX.md
# ===============================

## Navigation

1. Start Here → 00_START_HERE.md
2. System Overview → README_AUTOMATION.md
3. Full Specs → automation-guide.md
4. Architecture → AUTOMATION_ARCHITECTURE.md
5. Roadmap → IMPLEMENTATION_ROADMAP.md
6. Cheat Sheet → QUICK_REFERENCE.md
7. Diagrams → SYSTEM_DIAGRAM_ASCII.txt

---

## Status
This documentation is **complete, safe-by-design, and ready to implement**.
