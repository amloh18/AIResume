# CV Circle – Job Automation System

**Read this first (5–10 minutes)**

## Why this exists

This system turns CV Circle from a **manual job tracker** into a **controlled job-application engine** while staying:

* legally defensible
* cost predictable
* safe from platform bans
* profitable at low scale

The goal is not "apply everywhere instantly".
The goal is **apply intelligently, safely, and consistently**.

---

## Mental Model (non-negotiable)

**AI selects → AI prepares → Human approves (default) → Bot submits**

If you break this model:

* users lose trust
* costs explode
* ATS block you
* accounts get flagged

---

## What the system DOES

* Fetches jobs (UK only)
* Matches jobs to user preferences
* Scores job relevance
* Generates tailored resumes & cover letters
* Applies via supported ATS (Greenhouse, Lever, Workable)
* Tracks applications end-to-end
* Enforces daily limits & cooldowns

## What it explicitly DOES NOT do

* ❌ No LinkedIn login automation
* ❌ No CAPTCHA solving
* ❌ No credential storage
* ❌ No "unlimited" auto-apply
* ❌ No bypassing ATS safeguards

---

## Supported Scope (v1)

* **Country:** United Kingdom only (auto-apply)
* **ATS:** Greenhouse, Lever, Workable
* **Mode:** Assisted by default, Full Auto optional

---

## Go / No-Go Checklist (before launch)

* Admin kill switch works
* Daily caps enforced server-side
* Assisted mode is default
* API cost caps set
* Failure cooldown implemented
* Automation logs enabled

If any of the above are missing: **do not ship**.

---

## Build Order (recommended)

1. Jobs page + preferences
2. Google Talent API ingestion
3. Matching & scoring
4. Assisted auto-apply
5. KPI strip
6. Admin controls
7. Full auto (Power tier only)

---

## Success Metrics

* Jobs fetched per day
* Match quality (avg score > 70)
* Application success rate (>15%)
* User churn on automation failures (<5%)
* Cost per application (<£0.50)
* Break-even at ~50 paying users

---

## Reading Order

1. **This file** (you are here)
2. `README_AUTOMATION.md` - System overview
3. `automation-guide.md` - Deep technical spec
4. `AUTOMATION_ARCHITECTURE.md` - Technical architecture
5. `IMPLEMENTATION_ROADMAP.md` - 12-week delivery plan
6. `QUICK_REFERENCE.md` - One-page cheat sheet
