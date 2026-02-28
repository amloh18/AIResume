# CV Circle – Quick Reference

**One-page cheat sheet for the automation system**

---

## Mental Model

```
AI selects → AI prepares → Human approves (default) → Bot submits
```

---

## Scope (v1)

- **Country:** UK only
- **ATS:** Greenhouse, Lever, Workable
- **Mode:** Assisted (default), Full Auto (Power tier)

---

## Data Model (10 Collections)

1. **users** – tier, role
2. **job_preferences** – titles, locations, UK-locked
3. **jobs** – title, company, location, source, atsType
4. **job_matches** – userId, jobId, score (0-100), breakdown
5. **applications** – userId, jobId, status, mode, failureReason
6. **resume_versions** – userId, jobId, content, keywords
7. **automation_settings** – enabled, mode, dailyLimit, blockedCompanies
8. **admin_rules** – globalEnabled, maxApplies, cooldown, allowedATS
9. **api_usage** – provider, month, used, limit, cost
10. **audit_logs** – actor, action, target, metadata

---

## Key APIs

### User Endpoints
- `POST /api/jobs/preferences` – Save job preferences
- `GET /api/jobs/list?minScore=70` – Fetch matched jobs
- `GET /api/jobs/metrics` – Get KPIs
- `POST /api/automation/settings` – Update automation settings
- `POST /api/applications/auto` – Queue auto-apply

### Admin Endpoints
- `GET /api/admin/metrics` – Admin dashboard metrics
- `POST /api/admin/automation-rules` – Update global rules
- `POST /api/admin/job-sources/:source/toggle` – Enable/disable source
- `POST /api/admin/kill-switch` – Emergency disable

---

## Matching Algorithm

```
score = (skills × 0.40) + (title × 0.30) + (location × 0.20) + (recency × 0.10)
```

Threshold for display: 60+
Threshold for auto-apply: 70+

---

## Pricing Tiers

| Tier | Price | Jobs | Daily Cap | Auto Mode |
|------|-------|------|-----------|-----------|
| Free | £0 | 0 | 0 | ❌ |
| Pro | £9 | 100/mo | 3/day | ❌ |
| Auto | £19 | 500/mo | 10/day | ❌ |
| Power | £39 | Unlimited | 20/day | ✅ |

---

## Daily Limits

Enforced server-side:

```ts
if (todayCount >= min(user.dailyLimit, admin.maxApplies)) {
  reject("Daily limit reached");
}
```

---

## Failure Cooldown

- **3 failures** in 24h → cooldown
- **Duration:** Configured in admin_rules (default: 24h)
- **Resume:** After cooldown period expires

---

## ATS Support

| ATS | Status | Auto-Apply |
|-----|--------|------------|
| Greenhouse | ✅ | Yes |
| Lever | ✅ | Yes |
| Workable | ✅ | Yes |
| Unknown | ⚠️ | Assisted only |

Detection:

```ts
if (url.includes('greenhouse.io')) return 'greenhouse';
if (url.includes('lever.co')) return 'lever';
if (url.includes('workable.com')) return 'workable';
return 'unknown';
```

---

## Playwright Rules

- **Headful mode only** (no headless)
- **Delays:** 800-2000ms between actions
- **No CAPTCHA retries**
- **Abort on login walls**
- **Screenshot on failure**

---

## Cost Breakdown (per application)

- LLM (resume + cover): £0.15
- Playwright worker time: £0.10
- Job fetch (amortized): £0.05
- **Total:** ~£0.30

---

## Kill Switches (Admin)

1. **Disable Auto-Apply** – Stop all new applications
2. **Disable Job Fetching** – Pause all job ingestion
3. **Lock New Users** – Prevent new automation enables

All logged in audit_logs.

---

## Critical Metrics

- **Application Success Rate:** applied / (applied + failed) > 80%
- **API Cost Burn Rate:** daily spend × 30 < monthly budget
- **Failure Rate by ATS:** failures / attempts < 20%
- **Queue Depth:** jobs waiting < 100

---

## Go/No-Go Checklist

Before launch:

- [ ] Kill switches work
- [ ] Daily caps enforced
- [ ] Assisted mode default
- [ ] Cost caps set
- [ ] Cooldown implemented
- [ ] Audit logs enabled

---

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind
- **Backend:** Node.js, MongoDB, Redis, BullMQ
- **Automation:** Playwright (headful)
- **LLM:** OpenAI / Claude
- **Hosting:** Vercel (frontend), Railway/Fly.io (backend)

---

## Rollout Phases

1. **Weeks 1-6:** MVP (preferences + matching + assisted apply)
2. **Weeks 7-9:** Hardening (multi-source + admin + safeguards)
3. **Weeks 10-12:** Scale (Playwright + full auto + analytics)

---

## Component Hierarchy

```
JobsDashboard
├── MetricsGrid (8 KPIs)
├── ChartsRow (4 charts)
├── FiltersBar (search, sliders, multi-selects)
├── JobsTable (sortable, paginated)
└── JobDetailModal (info, actions)
```

---

## Success Metrics (Week 12)

- 500 users (100 Power tier)
- 1000+ applications/week
- 80%+ success rate
- Cost < £2000/month
- Break-even at ~50 paying users

---

## Contacts

- **Product Owner:** [Your Name]
- **Tech Lead:** [Your Name]
- **DevOps:** [Your Name]
- **Docs:** docs/automation/

---

**Print this page and keep it handy!**
