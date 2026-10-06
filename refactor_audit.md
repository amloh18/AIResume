# refactor_audit.md — duplicate logic, duplicated components, redundant calls

Full inspection of the user-facing app, 2026-09-26. Scope: `src/components` (319 files), `src/lib` (407),
`src/hooks` (11), `src/app` (57 pages, 352 API routes).

**Every finding below was verified by reading the code.** Line numbers are current as of this audit.
Where two copies *disagree*, that is called out separately — duplication is a maintenance cost, but
divergence is a correctness bug that users can see.

## Executive summary — fix these five first

| # | Issue | Why it matters |
| --- | --- | --- |
| **A1** | Application status has **4 label maps** that disagree on 7 statuses | The same application is labelled differently on three screens. A candidate in a technical test shows as **"Saved"** in the Discover feed. |
| **A2** | "Which ATS supports Auto-Apply" has **4 mutually contradictory lists** | Discover advertises the *opposite* of what the worker does for Workday. |
| **C2** | **N+1 polling** — one poller per kanban card, per journey | ~200 requests/min on a 10-card board. Highest request cost in the app. |
| **A4** | `workday` URLs are mapped to **`'workable'`** | Not duplication — a mis-mapping that routes Workday jobs to the wrong handler. |
| **A6** | Plan limit fallback `?? 25` — **25 exists nowhere** | Paid users are shown "25 remaining" while the server enforces 10. |

---

## Tier 1 — Behavioural divergence (users see contradictions)

### A1 · Application status → label/tone: four maps, seven disagreements

**Locations**

| File | Symbol |
| --- | --- |
| `src/lib/utils/application-status-badge.ts:62-75` | `STATUS_RULES` — the canonical one |
| `src/components/jobs/JobCard.tsx:94-149` | `TRACKER_STAGE_META` + `trackerStageMeta()` |
| `src/components/dashboard/Analytics.tsx:1492-1510` | `getStatusLabel` |
| `src/lib/applications/live-progress.ts:191-204, 287-315` | `PHASE_LABELS`, `phaseForInternalStatus` |

**Verified divergences** (badge vs `JobCard`):

| Stored status | `application-status-badge.ts` | `JobCard.tsx` |
| --- | --- | --- |
| `screening` | "Interview" (purple) | "Screening" (cyan) |
| `rejected` | "Rejected" | **"Closed"** |
| `created` | "Submitting" (amber) | **"Staging"** (violet) |
| `draft` | "Draft" (neutral) | **"Saved"** (amber) |
| `accepted` | "Offer" | "Accepted" |
| `withdrawn` | *no rule* → falls through to "Draft" | "Withdrawn" |
| `assessment` / `phone_screen` / `technical_test` | "Interview" | **no entry → falls back to "Saved"** |

The last row is the worst: `TRACKER_STAGE_META[status] || TRACKER_STAGE_META.saved` silently mislabels
every status it does not know as "Saved". A candidate mid-technical-test reads as an untouched saved job.

`JobCard` is mounted by both the Discover feed (`JobsDashboard.tsx:1650`) and the Top-matches carousel
(`TopJobMatchesSection.tsx:788`), so the wrong label appears on the main dashboard.

**Consolidation.** `application-status-badge.ts` already owns *derivation*; extend it to own the
**label/tone table** too, and have `JobCard` and `Analytics` consume it. Keep `chipTone()` for appearance
(the chip *styling* is already partly unified; the *mapping* is not).

**Risk: medium** — `application-status-badge.test.ts` pins the badge's labels, so those are the intended
ones, but changing "Closed"→"Rejected" and "Staging"→"Submitting" in the feed is a visible change that
should be signed off. Note `JobCard` has **no test**.

---

### A2 · "Which ATS supports Auto-Apply": four lists, two of them exact opposites

| Location | Contents |
| --- | --- |
| `src/lib/jobs/autoApplySupport.ts:12-19` | greenhouse, lever, ashby, workable, **naukri, indeed** — no workday |
| `src/lib/worker/processApplication.ts:99` | greenhouse, lever, ashby, workable, **workday** — no naukri/indeed |
| `src/lib/decision/hardFilters.ts:101` | greenhouse, lever, ashby, workable, workday, **unknown** |
| `src/lib/services/unifiedApplyService.ts:299-324` | `switch` has greenhouse, lever, ashby, workable, naukri, indeed, adzuna — **no `workday` case** |

`autoApplySupport.ts` is consumed by `api/jobs/discover/route.ts:915` and its own doc comment claims it
"Matches the ATS adapters in UnifiedApplyService" — it does not. The four lists disagree in both
directions, so **the badge the user sees and the behaviour they get are computed from different rules.**

`workday` is the clearest case: advertised as *unsupported* by Discover, *supported* by the worker gate,
and then has no handler in the switch → falls to `applyGeneric` (`unifiedApplyService.ts:1263`), which
returns `action_required` without ever attempting a submission.

**Consolidation.** `autoApplySupport.ts` becomes the single list. Migrate the worker gate and
`hardFilters` to import `isAutoApplySupported()`. Then decide, once, whether Workday is in or out — and
make `unifiedApplyService`'s switch agree.

**Risk: medium** — this changes routing, so it needs a decision, not just a refactor. Related: SB-04 in
`server_bugs.md`.

---

### A3 · `hardFilters.ts` ATS check is a no-op

```ts
// src/lib/decision/hardFilters.ts:101-105
const automatableAts = ['greenhouse', 'lever', 'ashby', 'workable', 'workday', 'unknown'];
if (ctx.job.atsType && !automatableAts.includes(ctx.job.atsType)) {
  // Non-automatable ATS — soft warning, not hard fail
}
```

The `if` body is **a comment**. Nothing is pushed to `failedChecks`, so the rule never fires. It reads
like an enforced constraint and enforces nothing — and it is a *fourth* copy of the ATS list.

**Consolidation.** Either implement it (push a soft warning that is actually surfaced) or delete it.
Do not leave it looking enforced. **Risk: low.**

---

### A4 · `workday` URLs are mapped to `'workable'`

```ts
// src/lib/services/portal-fetcher-service.ts:326-332
private static detectATS(url: string): JobListing['atsType'] {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('greenhouse')) return 'greenhouse';
  if (urlLower.includes('lever')) return 'lever';
  if (urlLower.includes('workday') || urlLower.includes('myworkday')) return 'workable';  // ← wrong
  return 'unknown';
}
```

A `myworkdayjobs.com` URL is labelled `workable`. Downstream that selects the Workable Playwright
handler, which will not find a Workday form. **This is a mis-mapping, not mere duplication.**

Compare `src/lib/services/applicationDryRunService.ts:140-165`, which knows workday, icims and
smartrecruiters; and `src/platforms/greenhouse/GreenhouseAdapter.ts:8-9`.

**Consolidation.** One `detectAtsFromUrl()` — this is the same function that would fix **SB-03** in
`server_bugs.md` (deriving the ATS from the apply URL rather than the discovery source). Build it once,
in `src/lib/jobs/autoApplySupport.ts`, and have all four call sites import it.

**Risk: low** to extract, **medium** to switch routing onto it (same decision as A2/SB-03).

---

### A5 · Document readiness re-derived from the primary journey only

`src/lib/utils/journey-documents.ts` is the documented single source of truth (it unions across all
journeys). Three call sites still use the **primary journey only**:

| Location | Code |
| --- | --- |
| `src/components/dashboard/jobs/stages/CreatedStageView.tsx:119-122` | `!!journey?.cvId` / `!!journey?.coverLetterId` on `journeys[0]` |
| `src/components/dashboard/jobs/trackerSidebarConfig.ts:405-408, 434-447` | `primaryJourney?.cvId` / `.coverLetterId` for the Ready/Queued/Pending stats |
| `src/components/dashboard/JourneyTimelineCard.tsx:3067-3068` | `journey.cvId && !cvNotFound` |

**Impact.** When a CV and cover letter land on **two different journey rows**, these read "missing" while
the kanban, list and sidebar read "ready". Same application, contradictory document state.

**Consolidation.** `getJourneyDocumentsForJob()`. **Risk: low** — `src/tests/regression/journey-documents.test.ts`
covers the shared function, not these call sites, so add coverage when migrating.

---

### A6 · Plan limit fallback `?? 25` — a number that exists nowhere

```ts
// identical in both files
const limit = isUnlimited ? Infinity : (autoApplyLimit?.limit ?? (plan === 'free' ? 10 : 25));
```

- `src/components/dashboard/redesigned/RedesignedDashboardView.tsx:447`
- `src/components/jobs/ApplicationsPanel.tsx:810`

The real limits are in `src/lib/services/autoApplyQuotaService.ts:39-61`:
**free** lifetime 10 · **starter** monthly 10 · **focused** daily 50. **There is no 25 anywhere.**

So while `autoApplyLimit` is loading (or if it fails), a paid user is shown a limit of 25 while the server
enforces 10. A third source, `src/components/jobs/AutoApplyPanel.tsx:460-462`, reads entitlements instead.

**Consolidation.** Delete the fallback — render nothing (or a skeleton) until the real limit arrives.
If a fallback is unavoidable, derive it from `PLAN_CONFIGS` rather than inventing a number.
**Risk: low.**

---

### A7 · Match score bypasses its own resolver

`src/lib/utils/scoreResolver.ts:74-89` exists and clamps (`Math.min(98, …)`). These do not use it:

| Location | What it does |
| --- | --- |
| `src/components/dashboard/jobs/JobKanbanCard.tsx:393-396` | raw `${job.matchScore}% Match` |
| `src/components/dashboard/jobs/JobsListView.tsx:292, 366` | own `Math.round` |
| `src/components/dashboard/jobs/stages/DraftStageView.tsx:123, 160-161` | own 80/60 thresholds |
| `src/components/dashboard/jobs/stages/RejectedStageView.tsx:63, 132, 163-167, 269-282` | own 80/60 thresholds + bar width |
| `src/components/jobs/ApplicationsPanel.tsx:357-361` | own average + ≥70 "strong match" |
| `src/components/dashboard/JobsDashboard.tsx:71` | dedupes on raw `matchScore` |
| `src/lib/utils/jobIntelligence.ts:96` | `job.matchScore \|\| job.atsScore` — **conflates two metrics** the codebase elsewhere warns are different |

**Impact.** A stored 100 renders as 100 in the kanban but 98 through the resolver; "strong match" means
≥70 in one place and ≥80 in another. The `jobIntelligence.ts:96` conflation is the most serious — a
*skill* score silently substituting for a *job* score.

**Consolidation.** Route every read through `resolveJobScores()`. **Risk: low-medium** (visible numbers
change; `jobIntelligence.ts:96` may change behaviour, so check its consumers).

---

## Tier 2 — Duplicate components

### B1 · Modal overlays — 53 files, 3 users of the shared dialog

`grep -rl 'fixed inset-0' src/` matches **53 files**. `@/components/ui/dialog` (Radix) is imported by
only three: `admin/AddPricingModal.tsx`, `admin/EmailCampaignManager.tsx`,
`dashboard/settings/PortalManageDialog.tsx`.

Every hand-rolled modal re-declares the backdrop and centred shell; near-identical class strings repeat
across files, e.g. `fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4`.
Jobs-area examples: `dashboard/jobs/DuplicateJobWarningModal.tsx:66-84`, `EmailConnectModal`,
`TrackerCreatedStageModal`, `JobDetailModal`, `jobs/ContextualLimitModal`.

**Consolidation.** Route centred modals through `ui/dialog.tsx`; keep genuine edge-drawers separate.
**Risk: medium** — focus trap, ESC handling and scroll lock differ per hand-rolled copy and need a visual
check per modal. Highest line-count payoff in the app.

### B2 · Empty / error states — ≥5 hand-rolled shapes

`dashboard/jobs/JobsListView.tsx:273-286` ("No jobs found") · `redesigned/TopJobMatchesSection.tsx:667-703`
(error) and `:753-772` ("You're all caught up") · `dashboard/JobsDashboard/JobsErrorState.tsx` · many
`forms/*Section.tsx`. `ui/EmptyStateSkeleton.tsx` exists but is a form-specific variant (it has an
add-first-item hook), not a general empty state.

**Consolidation.** Extract `ui/EmptyState` with `{ icon, title, description, action }`. **Risk: low.**

### B3 · `ErrorBoundary` — two implementations plus one inline

`ui/ErrorBoundary.tsx` (219 lines) and `resume-enhancer/ErrorBoundary.tsx` (167 lines) share identical
`Props`/`State`, `getDerivedStateFromError`, `componentDidCatch` and retry handler. A third,
`DashboardErrorBoundary`, is inline at `admin/job-intelligence/JobIntelligenceDashboard.tsx:17-30`.

Differences: `ui/` adds `onError`/`userId` + error tracking + `handleGoHome`; `resume-enhancer/` adds
`stepName`/`onReset` + a `withErrorBoundary` HOC. Call sites: `providers/ClientErrorBoundary.tsx:3`,
`app/dashboard/settings/page.tsx:45`, `resume-enhancer/ResumeEnhancerContainer.tsx:23`.

**Consolidation.** One boundary with optional `variant`/`onReset`/`stepName`; keep the HOC as a wrapper.
**Risk: low-medium.**

### B4 · Loading skeletons bypass the design system

Canonical: `ui/Skeleton.tsx`, `ui/PageSkeleton.tsx`, `ui/SkeletonLoader.tsx`, `ui/LoadingAnimation.tsx`.
Raw `animate-pulse` divs instead: `dashboard/JobsDashboard/JobsLoadingState.tsx` (whole file),
`dashboard/jobs/JobsListView.tsx:237-272`, `redesigned/TopJobMatchesSection.tsx:638-662`.
**Risk: low.**

### B5 · Document-readiness icon pair rebuilt in three surfaces

`jobs/JobCard.tsx:477-483` · `dashboard/jobs/JobsListView.tsx:417-432` ·
`dashboard/jobs/JobKanbanCard.tsx:635-648`. **Consolidation:** `<DocumentReadinessIcons hasCV hasCoverLetter />`.
**Risk: low.**

### B6 · KPI / stat cards — six independent shells

`admin/AdminKPIs.tsx` (656 lines) · `admin/CVJourneyKPIs.tsx` · `admin/job-intelligence/OverviewKPIs.tsx` ·
`admin/CampaignPerformancePanel.tsx:160` (`MetricCard`) · `admin/automation/AutomationOverview.tsx:488`
(`KpiCard`) · `redesigned/RedesignedDashboardView.tsx:253` (`Panel`). **Risk: low.**

### B7 · Two parallel toast systems

`ui/toast.tsx` + `ui/toaster.tsx` (12 `useToast` importers) vs `ui/ProgressToast.tsx` +
`ui/ProgressToaster.tsx` (wired in `providers/ClientProviders.tsx`). Plus
`notifications/NotificationCenter.tsx` (457 lines) and `admin/UnifiedNotificationManager.tsx` (391).
**Consolidation:** decide which is canonical; the "Unified" name suggests that was already the intent.
**Risk: medium.**

### B8 · Same filename, **not** duplicates — rename, don't merge

| Files | Verdict |
| --- | --- |
| `ui/PageHeader.tsx` (title/description/badge/eyebrow/actions/tabs) vs `dashboard/PageHeader.tsx` (breadcrumb from `usePathname`, `user`/`compact`) | **Different props, zero shared markup.** Used by `app/design-system/page.tsx` vs `dashboard/Analytics.tsx:1833`. Rename the second → `BreadcrumbBar`. |
| `jobs/JobCard.tsx` (699 lines, full discover card) vs `resume-enhancer/JobCard.tsx` (74 lines, nav card) | **Different types, props, markup.** Rename the second. |

Merging either of these would be a mistake — but the shared names are a real navigation hazard, and a
future contributor will "reuse" the wrong one.

---

## Tier 3 — Redundant API calls

**Root cause for most of these:** react-query is used in only **5 files**. Everywhere else is
`useState` + `useEffect` + `fetch`, which is **not deduped across mounts** — every mount is a fresh
request. Verified: there are **no inline-object `queryKey`s**, so there is no refetch-loop bug.

### C1 · `ApplicationsPanel` re-fetches four endpoints the provider already loaded

- **Duplicate:** `src/components/jobs/ApplicationsPanel.tsx:210-215` (`Promise.all` of `/api/jobs?limit=all`,
  `/api/journeys?limit=all`, `/api/cvs?projection=summary`, `/api/cover-letters`)
- **Already fetched by:** `src/contexts/DashboardDataContext.tsx:181, 220, 259, 302`
- **Why:** `ApplicationsPanel` reads only its own `tracker:${userId}` session cache (`:279`) and never
  consults `DashboardDataContext`. Mounted at `JobsDashboard.tsx:1890`.
- **Cost:** +4 requests on every first open of the tracker tab.
- **Fix:** seed from `useDashboardData()`. **Risk: low.**

### C2 · N+1 polling on the kanban — one poller per card and per journey ⚠️ highest cost

- `src/components/dashboard/jobs/JobKanbanCard.tsx:255-274` — `setInterval(…, 3000)` fetching
  `/api/application-journey?jobId=<X>`, **per card**, bounded at 5 minutes, guarded only by `shouldPoll`
- `src/components/dashboard/JourneyTimelineCard.tsx:797-808` — `setInterval(…, 1500/2000)`, **per journey**
- Mounted per item by `JobsKanbanView.tsx:588, 618` → `ApplicationsPanel.tsx:1158`

- **Why redundant:** the provider already holds every journey (`/api/journeys?limit=all`), and
  `useApplicationProgress` already polls `/api/applications/progress` adaptively for the whole page.
- **Cost:** N requests / 3 s. A board with 10 processing cards ≈ **200 requests/min**. No
  `IntersectionObserver` guard, so off-screen columns keep polling.
- **Fix:** reuse `useApplicationProgress`, or batch into one poll; gate on visibility.
  **Risk: medium** — this is the live-progress path, so it must not regress what was just built.

### C3 · The jobs list is fetched twice for a count

- `src/components/dashboard/JobsDashboard.tsx:571` — `/api/jobs?limit=200&lite=true`
- `src/components/dashboard/JobsDashboard.tsx:582` — `/api/jobs?limit=200&lite=true&status=saved`
- **Why:** the second is a strict subset of the first, requested only to read `length`.
- **Cost:** +1 request per mount, and it repeats on every `jobUpdated` / `jobDeleted` event (`:714`, `:725`).
- **Fix:** derive `savedCount` by filtering the first payload. **Risk: low.**

### C4 · Entitlements fetched twice on the jobs page

`useEntitlements()` (key `['entitlements', userId]`) is used at `JobsDashboard.tsx:308` **and**
`FiltersBar.tsx:181` — correctly shared. But `JobsDashboard.tsx:480` does a raw
`fetch('/api/entitlements')` into separate local state, which is **never invalidated** by the
`invalidateQueries(['entitlements'])` at `:1016` — so it drifts as well as duplicating.
**Fix:** delete the raw fetch. **Risk: low.**

### C5 · Portal connections fetched outside its query cache

Raw `fetch` at `JobsDashboard.tsx:456` vs `useJobSourceConnections` (`useJobSourceConnections.ts:34`,
key `JOB_SOURCES_QUERY_KEY`). Two sources of truth for one resource; the raw fetch always pays a round
trip. **Fix:** consume the hook. **Risk: low.**

### C6 · Per-open journey fetch duplicates data passed in as a prop

`JobSidebar.tsx:539` (effect at `:607`) fetches `/api/application-journey?jobId=` on every job open —
but `JobsDashboard.tsx:1855` already passes the matching `jobJourneys` in as a prop.
**Cost:** +1 request per sidebar open. **Fix:** use the prop; fetch only when absent. **Risk: low.**

### C7 · Two independent 30 s pollers on the same endpoint

`OptimizedNavigation.tsx:153` (+ interval `:203`) and `useCredits.ts:64` (+ interval `:241`) both poll
`/api/user/usage-limits` every 30 s. `useCredits` is mounted globally via `FeaturePromotionProvider`
(`ClientProviders.tsx:40`). `useState`-based, so not deduped — 2× steady-state load.
**Fix:** one poller. **Risk: low.**

### C8 · Notification fallback poll at 5 s with no visibility guard

`src/contexts/NotificationContext.tsx:729-737` — `setInterval(…, 5000)` when SSE is down (20 s when up),
on top of the SSE stream. Up to 12 requests/min/user. **Fix:** raise to ≥30 s and pause when
`document.hidden`. **Risk: low.**

### C9 · Server-side self-HTTP instead of importing

- `src/app/api/journey-documents/retry/route.ts:71-85` — `fetch()` to its own
  `/api/journey-documents/create`, forwarding the cookie
- `src/app/api/ai/cover-letter-generate/route.ts:218, 226` — `fetch()` to its own `/api/cvs/${cvId}` and
  `/api/jobs/${jobId}`

Extra network hop plus a redundant auth round-trip through the same process.
**Fix:** extract the handler bodies into shared functions. **Risk: low.**

---

## Tier 4 — Duplicated formatting helpers

| Helper | Copies | Divergence |
| --- | --- | --- |
| `formatSalary` | `jobs/JobCard.tsx:168`, `jobs/JobDetailModal.tsx:49`, `dashboard/jobs/JobsListView.tsx:148`, `dashboard/jobs/JobKanbanCard.tsx:330`, `lib/services/jobDiscoveryService.ts:1085` (+ `CreatedStageView.tsx:52`, `DraftStageView.tsx:62`, `AppliedStageView.tsx:67`, `OfferStageView.tsx:66`, `InterviewStageView.tsx:52`, `JobInfoContent.tsx:82`, `useJobInsights.ts:150`) | **Two output formats**: `CreatedStageView` prints `$120k`, `JobCard` prints `$120,000`. `JobDetailModal` cannot read the nested `salary{}` shape at all. |
| relative time | `jobs/JobCard.tsx:155` (`shortAge` → `2d ago`), `dashboard/JourneyTimelineCard.tsx:1943` (`2 days ago`), `lib/utils/format-utils.ts:5` (`timeAgo` → `a day ago`), `NotificationCenter.tsx:139` (date-fns) | **Three different string styles** for the same concept. |
| currency symbols | `lib/config/job-constants.ts:91-114` and `lib/utils/currencyConverter.ts:18-49` — same constant name, same function name | **Different values.** Plus local maps in `dashboard/jobs/EditJobSidebar.tsx:171-202`, `payment/locationService.ts:418`, `welcome/page.tsx:249`. |
| admin check | `role === 'admin' \|\| role === 'superadmin'` inlined in 12+ places: `proxy.ts:168`, `lib/middleware/admin-auth.ts:27`, `lib/auth/unified-auth-service.ts:134,256,396,649,816`, `auth/UnifiedAuthPage.tsx:215`, `app/admin/layout.tsx:12`, `app/admin/dashboard/[[...slug]]/page.tsx:59`, `app/dashboard/layout.tsx:25`, `dashboard/CVCheckRedirect.tsx:106`, `dashboard/OptimizedNavigation.tsx:237`, `dashboard/jobs/CommsPanel.tsx:220`, `CVCanvasEngine.tsx:528`, `usePromotionContext.ts:45` | Some also accept `type === 'admin'`, some do not. **Home:** `isAdminUser(user)` in `src/lib/auth/`. |

**Consolidation:** `src/lib/utils/format-utils.ts` for time, a new `lib/utils/format-salary.ts` for
salary, one currency map, and `isAdminUser()`. **Risk: low** for all four, except the currency maps —
reconcile the values deliberately, since one of them is wrong.

---

## Verified NOT problems — do not "fix" these

I checked these specifically because they *look* like duplication:

- **The four application surfaces genuinely share code.** `jobs/JobCard.tsx`,
  `dashboard/jobs/JobsListView.tsx`, `dashboard/jobs/JobKanbanCard.tsx` and `dashboard/jobs/JobSidebar.tsx`
  all import the shared `JobStatusActionChip`, `LiveProgressBar` and
  `getJourneyDocumentsForJob` / `getJourneyDocumentStateForJob`. Status badge, live progress and
  document-state derivation are **not** reimplemented across them. The only thing they duplicate is the
  CV/CL icon pair (B5).
- **`JobCard` is genuinely shared**, not two cards: mounted by the Discover feed
  (`JobsDashboard.tsx:1650`) and the Top-matches carousel (`TopJobMatchesSection.tsx:788`).
- **`commsListCacheKey`** is shared between `JobSidebar.tsx:194` and `CommsPanel.tsx:270` for
  `/api/communications` — cached reuse, no duplicate request.
- **`useApplicationProgress`** uses one shared key with adaptive polling — correct by design.
- **No inline-object `queryKey`s** exist, so there is no guaranteed refetch-loop bug.
- **`useDashboardPrefetch`** (defines an unused `['jobs','list']` key) has **zero call sites** — dead
  code, no runtime cost. Safe to delete.

---

## Recommended sequence

1. **A1** — status label map. One file, fixes a visible wrong label ("Saved" for a technical test).
2. **A4 + A2/A3 + SB-03** — one `detectAtsFromUrl()` + one support list. Fixes the `workday`→`workable`
   mis-mapping and the Workday contradiction in one change. Needs a product decision on Workday.
3. **A6** — delete the `?? 25` fallback. Two lines.
4. **C2** — the N+1 polling. Biggest request reduction; touches the live-progress path, so do it
   carefully and re-run the harness.
5. **C1, C3, C4, C5, C6** — the redundant fetches. All low risk, mechanical.
6. **A5** — document readiness. Three call sites, low risk.
7. **B5, B2, B4** — small extractions, low risk, good warm-up before B1.
8. **B1** — modals. Largest line-count payoff, highest review cost.
9. **A7, Tier 4** — score resolver, formatters, `isAdminUser()`.
10. **B8** — renames only.

---

## Verification

- Every location above was read, not inferred. Where two copies disagree, the divergence is shown with
  both sides quoted.
- **⚠️ This file is subject to `server_bugs.md` SB-15** — the repo's blanket `*.md` gitignore hides new
  documentation. `!refactor_audit.md` was added to `.gitignore` so it is trackable; confirm with
  `git check-ignore -v refactor_audit.md` (it must print a `!` rule, not `*.md`).
- Re-check any count with the commands used here:
  - modals: `grep -rl 'fixed inset-0' src/ | wc -l`
  - status maps: `grep -rn 'TRACKER_STAGE_META\|getStatusLabel\|STATUS_RULES' src/`
  - ATS lists: `grep -rn "greenhouse', 'lever'" src/`
