# Journey Document Integrity — Implementation Report

Implements the remediation plan from `docs/journey-document-generation-report.md`.

**Scope:** 33 files changed (+1966 / −504), 3 new files, 48 new tests.

**Override applied (per instruction):** the CV-reuse engine does **not** link one CV to multiple jobs.
Every job keeps its own freshly generated, tailored Journey CV. The reuse evaluation was repurposed
to *refine* the new CV's content for better JD keyword match and ATS score.

---

## Task 1 — Auto CV toggle (Normal | Standout)

**Problem:** The toggle wrote `JobSearchProfile.cvTailoringMode`; generation read
`User.settings.cvTailoringMode`. Nothing synced them, so the toggle was dead — every CV generated in
`standard` mode and "Standout" was unreachable from the UI.

**Fix:**
- Canonical store is now `User.settings.cvTailoringMode`.
- `PATCH /api/user/settings` mirrors to `JobSearchProfile`; `PATCH /api/jobs/preferences` mirrors back
  to `User.settings` (best-effort, non-fatal). Neither path can silently lose the setting.
- `JobsDashboard.tsx` reads the canonical store first, legacy second.
- **New:** `scripts/backfill-cv-tailoring-mode.ts` → `npm run backfill:cv-tailoring-mode`.
  Idempotent, non-destructive, `--dry-run` / `--force` / `--user-id=` / `--verbose`. Conflict policy is
  deterministic: the newer `updatedAt` wins.

## Task 2 — CV schema (root cause of several silent bugs)

Mongoose strict mode silently strips undeclared `metadata.*` subpaths on `$set` (verified with
Mongoose 8.24.4). Every previously-stripped field is now declared in `src/models/CV.ts`:
`atsScoreHash`, `atsScoreBreakdown`, `knockOutFactors`, `templateAtsSafety`, `templatePinnedFrom`,
`generationMode`, `generationReason`, `fallbackCreation`, `pinnedKeywords`, `refinementSeedFrom`,
`refinementSeedConfidence`, plus `seededData` / `seededAtsScore` on CV and CoverLetter.
Added index `{ userId, cvType, documentState }`.

## Task 3 — Deep freeze + cascade delete

**Problem:** The freeze path wrote `metadata.isFrozen`, which was being stripped — so the deep freeze
was a **complete no-op** and the free-tier Journey-CV cap was unenforced. `DELETE /api/journeys` also
orphaned the linked CV and cover letter.

**Fix:**
- `deep-freeze-service.ts` rewritten around root-level `documentState` / `frozenAt` / `frozenReason`.
  Sort by `updatedAt`. Added `thawAllFrozenCVs()` and a `FrozenReason` type
  (`plan_downgrade` | `manual` | `account_state`).
- `checkJourneyCVLimit` counts `documentState: { $ne: 'frozen' }` (active + monthly).
- `DELETE /api/journeys` cascade-deletes CV + CL, reading the IDs **before** deletion, with a guard that
  refuses to delete a document another journey still references. Opt out with `deleteDocuments: false`.
  Returns a `documents` report.

## Task 4 — ATS-safe template pinning

**Problem:** Journey CVs inherited the Master template, including multi-column/sidebar/creative layouts
that cap ATS parsability. Three conflicting "defaults" existed.

**Fix:** New ATS-safety module in `src/lib/templates/template-utils.ts`:

| Safety | Cap | Meaning |
|---|---|---|
| `safe` | 100 | single-column, standard section flow |
| `caution` | 85 | unclassified / minor risk |
| `risky` | 70 | multi-column or creative — breaks linear parsing |

- `getTemplateAtsProfile()`, `resolveAtsSafeTemplateId()`, `ATS_SAFE_DEFAULT_TEMPLATE_ID = 'modern-minimal-v2'`.
- Journey CVs pin to the ATS-safe default unless the Master template is already safe. The override is
  recorded as `templateAtsSafety` / `templatePinnedFrom` / `atsScoreCap` — auditable, not silent.
- When the template changes, the Master's `templateData`/styling is **not** inherited (it belongs to the
  old layout). `TemplateResolutionService.getDefaultTemplate()` returns the ATS-safe default.

## Task 5 — Template-aware scoring

`CentralScoreManager` now accepts a `TemplateAtsContext` and applies a layout formatting penalty and a
parsability multiplier, then honours the cap. A dark two-column CV no longer scores identically to a
clean single-column one.

## Task 6 — Single ATS writer

The ATS score was writable through **six** independent paths. All are now closed:

| Path | Before | After |
|---|---|---|
| `PUT /api/cvs/[id]` | accepted `cv_score_ats` / `cv_score_master` / `score_breakdown` | removed from `allowedFields`; forbidden metadata score keys are **restored** to the server value |
| `PUT /api/cvs/[id]` cvData sniffing | wrote scores found in the CV body | deleted entirely |
| `ResumeEnhancerContainer` | sent LLM `scoreReport.overall_score` as `cv_score_ats` | score fields stripped from payload |
| `Step3CV` autosave | sent score fields | content-only save |
| `surgeon-analysis` | propagated body `score` to CV + journey | caches the review only |
| `analysis-snapshot` | wrote journey scores | journey CVs excluded |
| `PUT /api/application-journey/[id]` | assigned raw body `atsScore` | **400** `'atsScore is read-only'` |
| `/api/seed-dashboard` | randomised scores, always reachable | 404 in prod unless `SEED_DASHBOARD_ENABLED=true` + `x-seed-secret`; rows marked `seededData` |

`POST /api/ats/calculate-score` is the sole writer. It now resolves the CV's template profile and passes
the cap through.

### Two real bugs found by the new tests

**1. Unknown templates were classified `safe` with a 100 cap.**
`getTemplateAtsProfile` fell through to `migrateLegacyTemplateId`, which maps *anything* unknown to
`tpl-1` (single-column). Fixed with `resolveLegacyTemplateId()` (returns `null` when unmapped) and:

```ts
const shape = directShape.layoutType !== 'unknown' || !alias
  ? directShape
  : resolveTemplateShape(alias);
```

**2. The ATS score was mathematically capped at ~63.75.**
Composition was `weightedScore * 100 / 40` while `weightedScore` summed *raw* component values whose
maxima total 100. A perfect CV could never exceed ~64 — almost certainly why client code had started
injecting friendlier numbers. Fixed by normalising each component to 0–1 before weighting:

```ts
export const ATS_COMPONENT_MAX = {
  keywordMatch: 40, formatting: 20, sectionAlignment: 15, recency: 15, contactability: 10,
} as const;
export const ATS_WEIGHTS = {
  keywordMatch: 0.4, formatting: 0.2, sectionAlignment: 0.15, recency: 0.15, contactability: 0.1,
} as const;
```

A perfect CV now genuinely reaches 100.

## Task 7 — Refinement seed (replaces CV reuse)

Per the override, one CV is never linked to multiple jobs. `cvReuseEngine.ts` was rewritten as
`evaluateCvRefinement`, returning a **keyword-only** `CVRefinementSeed`:

- Deliberately carries **no free text** — the previous engine's prose could carry unverified hand-edits
  into a brand-new document, violating the Master-CV-is-source-of-truth rule.
- `SEED_THRESHOLD = 0.25`. `canReuse` / `reuseCVId` are retained only for compile compatibility and
  documented as **forbidden** for linking.
- `extractAtsKeywords` is now frequency-weighted (`PHRASE_BONUS = 1.5`) with deterministic tie-breaks.
- `applyDeterministicAtsPass` returns `{ cvData, pinnedKeywords, skippedKeywords }` and tests evidence
  via `extractCvEvidenceText()` — which deliberately **excludes** `skills` and `basics`, since a skill
  listed under Skills is not evidence of that skill. Word-boundary matching, so `JavaScript` ≠ `java`.
- Journey `intelligence` records `refinementSeedFrom` / `refinementSeedConfidence` instead of `canReuse`.

## Task 8 — UI label honesty + the missing refresh endpoint

**`job.matchScore` is a job-fit metric, not an ATS score.** It was being displayed under ATS labels.
Removed from `JobKanbanCard`, `CreatedStageView` (now renders "Not measured"), and
`RedesignedDashboardView`. All three now use the shared `getJourneyAtsScore(journey, job)` helper, which
deliberately excludes `matchScore`.

**New:** `POST /api/application-journey/[id]/refresh-ats` — the endpoint the tracker's refresh button
had been calling since it was written, but which never existed (the button always 404'd). Two modes:

- default → re-sync the journey from the CV's already-persisted, server-authoritative score (no AI cost)
- `?recalculate=true` → quota-gated recompute via `KeywordGapAnalysisService` + `CentralScoreManager`,
  writing both the CV and the journey

Neither mode trusts a body-supplied score.

**Also fixed:** `JourneyTimelineCard` PUT `{ atsScore: cachedScore }` — `cachedScore` was an **undefined
identifier** (the real variable is `cachedCvScore`), so `JSON.stringify` dropped the key and the sync
silently never ran. Rerouted to `refresh-ats`, wrapped so a failure can't block the UI.

### Fabricated dashboard data removed

`RedesignedDashboardView`'s Profile Analytics panel was inventing an entire breakdown:

- `cvAtsScore(masterProfile) || 78` — a **fake 78** when no score existed
- component bars derived as `score + 4 / −4 / +9 / −13 / +1` — pure synthesis
- a hardcoded `75 / 68 / 84 / 65 / 80` set when the score was 0
- an unconditional **"ATS Verified"** badge

Now: real score only; the breakdown comes from `calculateCVScore(cvData)` (the same deterministic engine
the server uses) or the LLM review report, labelled **"ATS Measured"** vs **"AI Reviewed"**; and an
honest empty state with a CTA when nothing has been measured.

## Task 9 — Tests and verification

**48 tests across 3 suites, all passing:**

| Suite | Tests | Covers |
|---|---|---|
| `src/lib/cv-tailoring/tailoringMode.test.ts` | 22 | keyword ranking, determinism, seed prompt blocks, evidence rules, word boundaries, never-invent, mode pin counts (8 vs 14) |
| `src/lib/templates/template-utils.test.ts` | 16 | safety classification, caps, ordering, pinning, canonical-before-legacy resolution |
| `src/lib/pill-engine/centralScoreManagerTemplate.test.ts` | 10 | ceiling reachability, layout ordering, cap precedence, determinism, auditability |

**Verification results:**

- `npx tsc --noEmit` → **exit 0**, clean
- `npm run build` → **succeeded**; `refresh-ats` route present in `.next/server`
- Full suite → **287 passed, 6 failed**. All 6 confirmed **pre-existing** by running them against a
  clean tree (`git stash`): the e2e job-pipeline suite needs a live seeded MongoDB, one test file
  contains no test suite, and the docx/pdf service imports time out only under full-suite parallel load
  (they pass in isolation).
- eslint → only pre-existing errors remain (`@ts-nocheck` was already at HEAD in `template-utils.ts`
  and `JourneyTimelineCard.tsx`). The one error introduced during this work
  (`prefer-const` on `templateId`) was fixed.

---

## Follow-up sweep — additional sites found after the first pass

A verification pass over the whole `src/` tree (not just the files already touched) turned up four
more integrity gaps. All are fixed.

### 1. `ProfileAnalyticsSidebar` — the *same* fabrication as the dashboard panel

`RedesignedDashboardView`'s Profile Analytics panel opens this sidebar, and it contained an identical
copy of the fabricated breakdown — plus two more fabricated blocks the panel didn't have:

- `cvAtsScore(activeCv) || 78` — the same fake 78 fallback
- `buildMetrics` synthesising bars as `score + 4 / −4 / +9 / −13 / +1`, with a hardcoded
  `75 / 68 / 84 / 65 / 80` set when the score was 0
- **`strengths` and `gaps` hardcoded to canned arrays** — rendered under an "AI Diagnostics" heading,
  so generic advice ("Add 3-4 more specific framework / technical skill keywords") read as a finding
  about *this* CV

Now: real score only, real breakdown from `calculateCVScore(cvData)` or the LLM review, and
`null`-driven empty states for both the breakdown and the diagnostics. The score display also no
longer renders a `0` (reads as a measured zero) or a bogus "+100 pts potential" — it shows `—` and
suppresses the ring entirely.

### 2. `Job.atsScore` was client-writable

`PUT /api/jobs/[id]` built its update with `const updateData = { ...body, updatedAt }` — a blanket
spread of the request body. `EditJobSidebar.getFormData()` spread `formData`, which includes
`atsScore`, so **any client could write a job's ATS score directly**. Because `getJourneyAtsScore()`
falls back to `job.atsScore` when a journey has none, that number would then surface in the UI under
an ATS label having never passed through the scoring engine.

This was the same injection class as the six paths already closed — just on the `Job` model instead of
`CV`/`ApplicationJourney`. Verified that **nothing server-side writes `Job.atsScore`** before removing
it, so the strip is safe. The client no longer sends it either (autosave runs every 2 s, so leaving it
would spam the warning log). `POST /api/jobs` was already explicit field-by-field and unaffected.

### 3. `/api/jobs/match` was a second, non-template-aware ATS writer

This route is a legitimate ATS writer, but it called
`manager.calculateATSScore(cvData, keywordAnalysis, 100)` — a **hardcoded cap with no template
context**. So a multi-column CV got no layout penalty and a 100 ceiling here, while
`/api/ats/calculate-score` applied both. The same CV scored differently depending on which endpoint
ran last, which quietly undermined the single-source-of-truth guarantee.

It now resolves the CV's template (and any persisted `metadata.atsScoreCap`) and passes the same
`TemplateAtsContext` the other route uses.

Worth noting: this file's own header comment already documented the correct formula —
`(K×0.4 + F×0.2 + S×0.15 + R×0.15 + C×0.1) × P`. The implementation had simply never matched its
documented contract.

### 4. Label/source mismatches

- `RedesignedDashboardView` showed an **"Avg Match Score"** tile computed from `j.atsScore` — a real
  ATS score under a "Match" label. Renamed to **"Avg ATS Score"**; its trend line now reads
  "N documents ≥ 70%" rather than "N jobs".
- `ContinueJobCard` labelled its value "Match score" / "High match" and rendered `{atsScore}% match`,
  all sourced from an ATS score. Relabelled to ATS, and a linked-but-unmeasured CV now reads
  **"CV linked · ATS score not measured yet"** with a "Measure ATS Score" action instead of silently
  falling through to a generic state.
- `TailoredCVWidget` renders a bare `{doc.matchScore}%` with no label, which reads as an ATS score.
  Left as-is because the component is **dead code** (never imported anywhere), but flagged here — if
  it is ever wired up, that number needs an explicit label.

### Re-verification after the sweep

- `npx tsc --noEmit` → **exit 0**
- 3 targeted suites → **48/48 pass**
- `npm run build` → **succeeded**, `✓ Compiled successfully in 11.6s`, 325/325 static pages
- eslint on changed files → no new errors (one `prefer-const` and one unused-var warning introduced
  during this work were fixed)

---

## Migration notes

1. Run the backfill once after deploy:
   `npm run backfill:cv-tailoring-mode -- --dry-run` then without the flag.
2. Existing frozen CVs written under the old `metadata.isFrozen` scheme will **not** appear frozen
   (that field never persisted). If any are expected, they need a one-off pass to set root
   `documentState: 'frozen'`.
3. Existing CVs with `atsScore` below ~64 were capped by the composition bug. Scores will rise on the
   next recalculation; no backfill is required since scores are derived, not authored.
4. `/api/seed-dashboard` now requires `SEED_DASHBOARD_ENABLED=true` and an `x-seed-secret` header
   outside production. Any script depending on it needs updating.
