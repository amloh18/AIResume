# Journey Document Generation — Full Audit Report

**Scope:** CV / cover-letter creation for `ApplicationJourney` documents (the "Journey" pipeline), from the jobs explore page through to the persisted CV, cover letter, and ATS score.

**Repo:** `buildairesume_app` v0.9.9 · Mongoose 8.24.4 · Next.js App Router

**Date:** 2026-09-16

---

## 0. Pipeline map (the ground truth)

| Step | Entry point | File |
|---|---|---|
| 1 | User clicks "add to tracker" / apply on a job | `src/components/dashboard/JobsDashboard.tsx` |
| 2 | Journey created (`status: processing_documents`) | `src/app/api/application-journey/route.ts:315` (`POST`) |
| 3 | Documents fired asynchronously | `application-journey/route.ts:553-571` → `setImmediate(createJourneyDocuments)` |
| 4 | Entitlement + mode resolved | `src/lib/services/journeyDocumentService.ts:118-129` |
| 5 | Intelligence layer built (job target → evidence → gaps → keyword strategy → reuse check) | `journeyDocumentService.ts:164-208` → `src/lib/job-landing/orchestrator.ts:33` |
| 6 | Master CV located, `cvData` deep-copied | `journeyDocumentService.ts:233-273` |
| 7 | CV tailored by AI (only if `shouldTailorDocuments`) | `journeyDocumentService.ts:275-301` → `tailorCVContent` at `:760` |
| 8 | Deterministic keyword pinning pass | `src/lib/cv-tailoring/tailoringMode.ts:263` (`applyDeterministicAtsPass`) |
| 9 | CV document saved | `journeyDocumentService.ts:310-340` |
| 10 | Cover letter generated (header/footer + AI body) | `journeyDocumentService.ts:455-601` |
| 11 | Journey updated, steps marked, notification sent | `journeyDocumentService.ts:604-714` |
| 12 | ATS score computed **separately, later, on demand** | `src/app/api/ats/calculate-score/route.ts:88` |

Two entry points also create journeys without documents: `POST /api/journeys` (`src/app/api/journeys/route.ts:140`) and `POST /api/journey-documents/create` (`src/app/api/journey-documents/create/route.ts`). Retry is `POST /api/journey-documents/retry`.

---

## 1. Is the "Auto CV: Normal | Standout" toggle used during generation?

### Answer

**No — not as shipped.** The toggle is read at generation time, but from a *different database field* than the one the toggle writes to. There is no synchronisation between the two. The effective mode for every tailored generation is therefore the schema default, `'standard'` (Normal), permanently.

### Evidence

**Where the toggle writes** — `JobsDashboard.tsx:992-1008`:

```ts
const handleCvTailoringModeChange = async (mode: CvTailoringMode) => {
  const previous = cvTailoringMode;
  setCvTailoringMode(mode);
  const res = await fetch('/api/job-search-profile', {
    method: 'PATCH',
    body: JSON.stringify({ updates: { cvTailoringMode: mode } }),
  });
  ...
};
```

`PATCH /api/job-search-profile` (`src/app/api/job-search-profile/route.ts:74`) routes through `JobSearchProfileService.patchProfile` → writes **`JobSearchProfile.cvTailoringMode`** (`src/models/JobSearchProfile.ts:157`).

**Where generation reads** — `journeyDocumentService.ts:127-129`:

```ts
const tailoringMode = shouldTailorDocuments
  ? await getUserCvTailoringMode(userId)
  : 'standard';
```

`getUserCvTailoringMode` (`src/lib/cv-tailoring/getUserCvTailoringMode.ts:8`) reads **`User.settings.cvTailoringMode`**:

```ts
const user = await User.findById(userId).select('settings.cvTailoringMode').lean();
```

**The gap:** `User.settings.cvTailoringMode` is declared with `default: 'standard'` (`src/models/User.ts:808-812`) and the only writer is `PATCH /api/user/settings` (`src/app/api/user/settings/route.ts:166-168`) — which **no UI component calls with `cvTailoringMode`**. A full-repo grep for `cvTailoringMode` shows:

- writes → `JobSearchProfile` (via `/api/job-search-profile`, `/api/jobs/preferences`)
- reads at generation → `User.settings` (via `getUserCvTailoringMode`)

`JobSearchProfile.cvTailoringMode` is read in exactly one place — the legacy `GET /api/jobs/preferences` (`src/app/api/jobs/preferences/route.ts:67`) — and never by any document-generation code. No migration or sync script copies it across (`scripts/migrate-job-search-profiles.ts` does not touch it).

**Consequence:** the Standout branch is unreachable through the product UI. The three consumers of `getUserCvTailoringMode` — `journeyDocumentService`, `POST /api/ai/tailor-cv`, `POST /api/ai/tailor-cv-v3` — all read the same stuck field.

### Secondary gate: mode only matters if tailoring runs at all

`journeyDocumentService.ts:118-129` and `src/lib/utils/journey-generation.ts:157-203`:

```ts
const shouldTailorDocuments = generationEntitlement.mode === 'tailored';
const tailoringMode = shouldTailorDocuments ? await getUserCvTailoringMode(userId) : 'standard';
```

`mode: 'tailored'` requires either an unlimited plan (`focused_*`) with valid time access, **or** available `ai_generation` credits. Free / credit-exhausted users get `mode: 'fallback'` → the CV is a raw deep copy of the Master CV with **no AI call at all**, and the toggle is irrelevant even in principle.

### What the mode would change if it were wired

Source: `src/lib/cv-tailoring/tailoringMode.ts`.

| Aspect | Normal (`standard`) | Standout |
|---|---|---|
| Prompt rules | `STANDARD_CV_RULES` (`:199`) | `STAND_OUT_CV_RULES` (`:207`) |
| Job titles | Spelling/casing alignment only ("Sr." → "Senior") | **May retitle roles toward the JD title**, keeping employer + dates ("Support Lead" → "Customer Success Manager") |
| Skill additions | Only skills already evidenced in a bullet/project/tool list | Adjacent evidenced capabilities + functional synonyms; may surface implied tools ("SQL" from "wrote reporting queries") |
| Bullet rewriting | Light rewrite with JD language the candidate already earned | Aggressive reframing with JD nouns/verbs; reorder highlights for impact |
| Summary | Professional, accurate, not salesy | "Top-1% fit: years + target title + 2 JD problem/proof points" |
| Keyword pinning budget | 8 keywords (`applyDeterministicAtsPass`, `:274`) | 14 keywords |
| Cover letter tone | "Modest emphasis", connects real experience | "Position as the obvious hire", assertive, opens on the company challenge |
| Model params | `temperature: 0.4`, `maxTokens: 4000` — **identical in both modes** (`journeyDocumentService.ts:782-783`) |
| Persisted marker | `journey.intelligence.tailoringMode` (`journeyDocumentService.ts:196`) | same |

### Risks in the Standout rule set

1. **The retitle rule contradicts the project's own data-integrity principle.** `AGENTS.md` §6 states the Master CV is the source of truth and AI must not invent employment. Rewriting a held job title to a different job title — even with the same employer and dates — is a factual misrepresentation of the role on a document the user sends to employers. Recommend removing the retitle clause, or gating it behind explicit per-role user confirmation.
2. **"Surface implied tools"** (`SQL` from "wrote reporting queries") is a fabrication vector that depends entirely on model judgement, with no evidence link recorded. The `AGENTS.md` §7 Candidate Evidence Engine spec requires every claim to retain a `source`; nothing in this path records one.
3. **No mode is recorded on the CV document.** `metadata.generationMode` and `metadata.generationReason` are written at `journeyDocumentService.ts:331-335` but silently dropped (see §2, schema-stripping bug). So there is no way to audit which mode produced a given CV.

### Fix

Pick one canonical store. Lowest-risk option: keep `User.settings.cvTailoringMode` as the single source of truth and make the toggle write there.

```ts
// JobsDashboard.tsx — handleCvTailoringModeChange
const res = await fetch('/api/user/settings', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ settings: { cvTailoringMode: mode } }),
});
```

Then either backfill `User.settings.cvTailoringMode` from the existing `JobSearchProfile.cvTailoringMode` values, or drop the `JobSearchProfile` field once `/api/jobs/preferences` is retired (it already carries a `TODO: Remove this endpoint` header).

---

## 2. How to reduce the footprint of CVs generated for the same profile

### What is created per journey today

| Artifact | Size driver | Source |
|---|---|---|
| 1 × `CV` | full deep copy of `cvData`, **plus** legacy `data`, **plus** `templateData`, **plus** `styling` | `journeyDocumentService.ts:310-337` |
| 1 × `CoverLetter` | `content` (merged) **plus** `header` + `body` + `footer` — the same text twice | `journeyDocumentService.ts:572-595` |
| 1 × `ApplicationJourney` | includes `intelligence` blob | `journeyDocumentService.ts:195-202` |
| Thumbnail | `metadata.thumbnailUrl` per CV, generated when opened in Studio | `journeyDocumentService.ts:349` |
| PDF / DOCX | **not stored** — rendered on demand | `application-journey/[id]/download/route.ts` → `ZipDownloadService` |

Good news: no R2/PDF accumulation per journey. The footprint is MongoDB documents, dominated by the per-CV deep copy of the Master CV JSON plus `templateData`.

Bounded already: ATS history capped at 10 entries (`cvJourneyRelationshipService.ts:316-318`); journey list API limited to 50 with a projection (`journeys/route.ts:85-90`).

### Controls that exist

| Control | Implementation | Status |
|---|---|---|
| Active journey CV cap | `checkJourneyCVLimit` — `CV.countDocuments({ userId, cvType:'journey', 'metadata.isFrozen': {$ne:true} })` | Cap value correct (free 3, starter 10, focused unlimited — `subscription-helpers.ts:52-158`) |
| Monthly window (intended 50) | `checkJourneyCVLimit:572-596` | **Unreachable** — gated on `planKey === 'focused_monthly'`, but that plan has `activeJourneyCVs: -1` and returns early at `:559` |
| Deep freeze on downgrade | `applyDeepFreeze` (`src/lib/services/deep-freeze-service.ts:16`) | **Silently a no-op** — see below |
| CV reuse before creating a new one | `evaluateCVReuse` (`src/lib/job-landing/cvReuseEngine.ts:102`) | **Computed but never acted on** — see below |

### Defect A — the freeze flag is stripped by Mongoose (proven)

`applyDeepFreeze` writes:

```ts
$set: { 'metadata.isFrozen': true, 'metadata.frozenAt': ..., 'metadata.frozenReason': ... }
```

None of `isFrozen`, `frozenAt`, `frozenReason` are declared inside the `metadata` sub-schema in `src/models/CV.ts` (lines 192-234). The model *does* declare root-level `documentState: 'editable'|'frozen'|'read-only'`, `frozenAt`, `frozenReason` (`CV.ts:167-181`) — so the intended design was root-level `documentState`, and the freeze service targets the wrong location.

Mongoose 8.24.4 defaults to `strict: true`, and `CVRepository.updateById` uses `findByIdAndUpdate` (`src/lib/repositories/base-repository.ts:184`) with no `strict: false`. I verified the stripping empirically:

```
mongoose version: 8.24.4
top-level strict: true
Cast $set result: {"$set":{"metadata.atsScore":77}}
```

Input was `{ 'metadata.isFrozen': true, 'metadata.atsScoreHash': 'abc', 'metadata.atsScore': 77 }` — `isFrozen` and `atsScoreHash` were dropped, `atsScore` (declared) survived.

**Consequences:**
- A downgraded user keeps every journey CV editable; the free-tier 3-CV cap is enforced against a flag that never gets set, so it counts *lifetime* journey CVs and never frees space.
- `checkJourneyCVLimit` appears to work only because every document matches `$ne: true`.

### Defect B — the reuse engine is dead weight

`evaluateCVReuse` computes a weighted score (`roleSimilarity × 0.4 + keywordOverlap × 0.6`) over the user's last 20 journey/standalone CVs and returns `{ canReuse, reuseCVId, reuseConfidence }` when overlap ≥ 50%.

`journeyDocumentService.ts:195-202` stores only a boolean:

```ts
currentJourney.set('intelligence', { tailoringMode, ..., canReuse: generationContext.reuseEvaluation?.canReuse || false });
```

`reuseCVId` is never read. Execution then falls through to `journeyDocumentService.ts:257-340`, which **always creates a new CV**. This is the designed dedupe path, fully implemented, and simply not wired up.

### Same schema-stripping bug also drops three more fields

| Field written | Where | Effect of being dropped |
|---|---|---|
| `metadata.atsScoreHash` | `cv-repository.ts:226` | `isATSScoreStale` (`:240-246`) always returns `true` → the cached-score branch in `/api/ats/calculate-score:198-211` is dead code; every ATS call re-runs AI keyword analysis and consumes quota/credits |
| `metadata.atsScoreBreakdown` | `cv-repository.ts:231`, `cvs/[id]/route.ts:534` | `factorBreakdown` returned from the cache path is always `undefined` |
| `metadata.generationMode`, `metadata.generationReason` | `journeyDocumentService.ts:331-335` | Tailored-vs-fallback provenance is lost |
| `metadata.fallbackCreation` | `journeyDocumentService.ts:409` | Fallback-creation marker lost |

### Recommendations, ordered by impact

1. **Fix the freeze path.** Write root-level `documentState: 'frozen'` (+ `frozenAt` / `frozenReason`), or add the three fields to the `metadata` sub-schema. Then make `checkJourneyCVLimit` count `documentState: { $ne: 'frozen' }`. This is the single biggest lever — it makes the free-tier cap real and gives users a working "free up space" action.
2. **Wire up the reuse engine.** In `journeyDocumentService.ts`, before the create branch at `:233`, honour `generationContext.reuseEvaluation`:
   - `canReuse && reuseConfidence >= 0.75` → link the existing CV to the new journey (`cvId = reuseCVId`, set `journeyId`, `cvType: 'journey'`) instead of creating a new document. `ApplicationJourneyRelationshipService.linkCVToJourney` already exists for this.
   - `0.5 ≤ confidence < 0.75` → fork (copy) the existing journey CV and re-tailor, rather than starting from the Master CV.
   - Add a "one CV, many journeys" relationship if a CV must serve multiple applications — the current schema enforces a 1:1 via `cvSchema.index({ journeyId: 1, userId: 1 })` and `ApplicationJourney.cvId`.
3. **Stop deep-copying `templateData`, `styling`, and legacy `data` per journey CV.** `templateData` is a full template blob duplicated on every CV. The CV already stores `templateId` + `templateName`, and `TemplateResolutionService.resolveTemplate` (`src/lib/services/templateResolutionService.ts:86`) can resolve the template at read time. Dropping the per-document copy removes a large repeated blob; the same applies to `data` when `cvData` is present.
4. **De-duplicate the cover letter body.** `mergeCoverLetterContent(header, body, footer)` (`journeyDocumentService.ts:572`) stores the full text in `content` *and* in the three component fields. Pick one canonical representation.
5. **Add a cascade delete on `DELETE /api/journeys`.** `DELETE /api/application-journey` cascades correctly (deletes cover letter, then CV, then journey — `application-journey/route.ts:672-717`). `DELETE /api/journeys` (`journeys/route.ts:280-321`) deletes **only** the journey row, orphaning the CV and cover letter. Likewise `DELETE /api/cvs/[id]` (`cvs/[id]/route.ts:970`) leaves `ApplicationJourney.cvId` dangling. `cleanupOrphanedJourneyReferences` (`application-journey/route.ts:65`) only nulls stale pointers, and only when a client passes `?cleanup=true` — it never deletes orphaned documents.
6. **Decide and align the free-tier counting policy.** Either apply the monthly window to the plans that need it, or remove the unreachable `focused_monthly` branch so the intent is not misleading.
7. **Store a per-document size guard.** Nothing currently prevents a large `templateData` or an over-long `cvData` from being persisted per journey.

---

## 3. Which template do generated CVs use by default?

### Answer

**Not fixed — it inherits the Master CV's template.** The ATS-safe template is only a fallback.

`journeyDocumentService.ts:262-270`:

```ts
let templateId = masterCV.templateId;
let templateName = masterCV.templateName;
let templateData = masterCV.templateData;

if (!templateId) {
  templateId = 'modern-minimal-v2';
  templateName = 'Modern Minimal';
}
```

- **If the Master CV has a `templateId`** → the journey CV uses that template. If the Master CV is on a multi-column or dark-sidebar layout, every generated CV inherits it.
- **If it does not** → `modern-minimal-v2` ("Modern Minimal").

### Is `modern-minimal-v2` ATS-friendly?

Yes. `src/lib/templates/v2/template-definitions.ts:195-216`:

```ts
id: 'modern-minimal-v2',
layout: { type: 'single-column', columns: [{ id: 'main', width: '100%',
  slots: ['header','summary','experience','education','skills'] }] },
```

Single column, no sidebar, standard section order, standard margins (15/20mm, A4). It resolves to canvas template **`tpl-1` "Minimalist Single"** — `type: '1-col'`, `titleStyle: 'minimal'`, zones `header-minimal / summary-clean / experience-standard / education-standard / projects-standard / skills-category-inline` (`src/components/cv-builder-pro/registry.tsx:1314`). This is the right shape for ATS parsers.

The same fallback is used by `src/app/api/cv-draft/transfer/route.ts:133`.

### Which inherited templates are *not* ATS-safe

From `src/components/cv-builder-pro/registry.tsx:1314-1326`:

| tpl | Name | Layout | ATS risk |
|---|---|---|---|
| `tpl-1` | Minimalist Single | 1-col | Safe |
| `tpl-2` | Modern Split | 2-col | **High** — two columns confuse linear parsers |
| `tpl-3` | Professional Sidebar Left | sidebar-left | **High** |
| `tpl-4` | Executive Sidebar Right | sidebar-right | **High** |
| `tpl-5` | Two Column 50/50 | 2-col | **High** |
| `tpl-6` | Harvard Executive | 1-col | Safe |
| `tpl-7` | Designer Portfolio | 1-col | Medium (decorative) |
| `tpl-9` | Creative Sidebar Left | sidebar-left-**dark** | **High** |
| `tpl-10/11/12` | top-sidebar variants | top-sidebar-* | **High** |
| `tpl-13` | Dense One-Pager | hybrid-split | **High** |

A user whose Master CV sits on `tpl-9` (Creative Sidebar Left, dark) gets every auto-generated journey CV on the same layout, with no warning.

### Three additional template inconsistencies

1. **Two different "defaults".** `journeyDocumentService` hardcodes `modern-minimal-v2`, while `mapV2ToITemplate` marks `isDefault: v2.id === 'professional-extended-v2'` (`src/lib/templates/template-utils.ts:46`), and `TemplateResolutionService.getDefaultTemplate()` returns `getAllTemplates()[0]` (`templateResolutionService.ts:198-200`). Three code paths, three answers.
2. **A mapping contradiction.** `professional-extended-v2` is declared single-column in `v2/template-definitions.ts:186`, but `migrateLegacyTemplateId` maps it to `'tpl-3'` — "Professional Sidebar Left", a sidebar layout (`template-utils.ts:98`). The same template ID yields a different layout depending on which resolver runs.
3. **The prompt's "no columns" instruction is inert.** `tailoringMode.ts:177` tells the model *"Keep ATS-safe structure: standard section keys, reverse chronology, no tables, no columns"* — but that governs generated **content**, not the template, and the template is copied from the Master CV independently of the prompt. Nothing enforces it.

### Recommendation

1. Introduce an ATS-safety classification for templates (single-column + light background + standard section titles = safe) and store it on the template definition.
2. For **auto-generated** journey CVs, pin to the safe allow-list (`modern-minimal-v2` / `tpl-1`, `professional-extended-v2` resolved as single-column, `tpl-6`) rather than inheriting. Keep inheritance only when the Master CV's template is already on the allow-list.
3. Surface a warning in Studio when a journey CV is on a non-safe template, with a one-click "switch to ATS-safe layout".
4. Fix the `professional-extended-v2` → `tpl-3` mapping, and unify the three default-template definitions behind one constant.

---

## 4. Is the ATS score genuinely high — and are all other document scores real?

### What is genuinely sound

**The canonical engine is deterministic and honest.** `CentralScoreManager` (`src/lib/pill-engine/CentralScoreManager.ts`) is pure: no randomness, no AI, no clock dependence except recency. ATS composition (`:330-334`):

```
keywordMatch     0-40  × 40%
formatting       0-20  × 20%
sectionAlignment 0-15  × 15%
recency          0-15  × 15%
contactability   0-10  × 10%
rawTotal = round(weighted × 100 / 40)
total    = min(round(rawTotal × parsabilityMultiplier), atsScoreCap)
```

Real guards exist:
- word count < 100 → validity multiplier **0.2**; placeholder text (`lorem ipsum`, `[your name]`, `example.com`, `xxx`, `n/a`) → **0.2**; no summary and no work → **0.2** (`:385-405`)
- word count < 50 or no work → parsability multiplier **0.1**; > 20 skills with < 2 roles → **0.2** (`:498-506`)

**The ATS route refuses the LLM score.** `src/app/api/ats/calculate-score/route.ts:247-252`:

```ts
// The LLM review score (metadata.surgeonAnalysis.scoreReport.overall_score)
// is intentionally NOT used here - it must never overwrite the deterministic
// result returned by the shared scoring engine.
const finalScore = scoreResult.atsScore?.total ?? scoreResult.cvScore.total;
```

`/api/jobs/match` does the same and correctly keeps `atsScore` and `jobMatchScore` as separate fields (`route.ts:333-338`).

**Master CVs are blocked** from ATS scoring with a 403 (`calculate-score/route.ts:127-140`) — only job-specific CVs can be scored.

**The keyword prompt forbids hallucination** (`src/lib/prompts/keyword-gap-prompt.ts`): *"Only report gaps for keywords ACTUALLY mentioned in the job description"*, *"Do NOT hallucinate or invent keywords"*, *"Consider synonyms and related terms (e.g., 'JS' matches 'JavaScript')"*.

### Where it is **not** genuine — eight concrete holes

**Hole 1 — Client-supplied score overrides the computed one (most serious).**
`PUT /api/cvs/[id]` (`src/app/api/cvs/[id]/route.ts`) lists `cv_score_ats` in `allowedFields` (`:383-386`), accepts it straight from the request body with **no recomputation and no range validation**, mirrors it into `metadata.atsScore` (`:521-524`), then propagates it into `ApplicationJourney.atsScore`:

```ts
// cvs/[id]/route.ts:794-806
if (body.cv_score_ats !== undefined && typeof body.cv_score_ats === 'number' && effectiveJourneyId) {
  ... updateJourneyATSScore(effectiveJourneyId, body.cv_score_ats, ...)
}
```

`JourneyTimelineCard` reads `journey.atsScore` as the primary displayed value (`JourneyTimelineCard.tsx:1446-1449`, `:753-775`). Any client can set the journey ATS score to any number.

**Hole 2 — The Resume Enhancer sends an LLM score as the ATS score.**
`src/components/resume-enhancer/ResumeEnhancerContainer.tsx:2674-2692`:

```ts
let scoreVal = state.scoreReport?.overall_score !== undefined
  ? state.scoreReport.overall_score
  : (state.surgeonAnalysis?.score ?? 0);

if (state.cvType === 'journey') {
  scoreVal = Math.min(scoreVal, state.atsScoreCap || 100);
}

const payload = {
  ...
  cv_score_ats: state.cvType === 'journey' ? scoreVal : undefined,
  metadata: { ..., atsScore: state.cvType === 'journey' ? scoreVal : undefined },
};
```

`scoreReport.overall_score` is **exactly** the number the ATS route documents as forbidden. So saving a journey CV from the enhancer replaces the keyword-based ATS score with a subjective LLM score — and `PUT /api/cvs/[id]` writes it through.

**Hole 3 — A second injection path through `cvData`.**
`cvs/[id]/route.ts:398-424` scans incoming `cvData` for any of `analysis.score`, `analysis.overall_score`, `analysis.overallScore`, `analysisReport.overall_score`, `analysisReport.score`, `cvData.atsScore`, `cvData.score`, `cvData.scoreReport.overall_score`, `cvData.metadata.atsScore`, `cvData.metadata.surgeonAnalysis.scoreReport.overall_score` — and if `cv_score_ats` was not supplied, promotes that number to the ATS score.

**Hole 4 — Surgeon analysis trusts a client-computed score.**
`src/app/api/cvs/[id]/surgeon-analysis/route.ts:249-284`:

```ts
// Canonical score: the deterministic score computed by CentralScoreManager (client side)
const finalScore = typeof score === 'number' ? score : (scoreReport?.overall_score ?? 0);
cv.cv_score_ats = finalScore;
cv.metadata.atsScore = finalScore;
... updateJourneyATSScore(cv.journeyId, finalScore, ...)
```

`score` comes from the request body (`:193`). The comment calls it deterministic, but it is client-supplied.

**Hole 5 — Onboarding health index can become a journey ATS score.**
`src/app/api/cv/analysis-snapshot/route.ts:160-166` sets `cv_score_ats = snapshot.healthIndex` and `metadata.atsScore = finalScore` for journey CVs. `healthIndex` is an onboarding quality metric, not a keyword-match ATS score.

**Hole 6 — `PUT /api/application-journey/[id]` accepts an arbitrary score.**
`application-journey/[id]/route.ts:256-258`:

```ts
if (body.atsScore !== undefined) {
  journey.atsScore = body.atsScore;
}
```

No validation, no range check, no recomputation. Note this route also uses the `atsScore` field name directly, so it bypasses the `updateJourneyATSScore` helper (and its history capping) entirely.

**Hole 7 — Fabricated scores in the demo seeder.**
`src/app/api/seed-dashboard/route.ts:149`: `const atsScore = Math.floor(Math.random() * (98 - 65) + 65);` written onto journey CVs, plus `metadata: { wordCount: 200, atsScore: 85 }` on cover letters. It is hardcoded to `testuser@buildairesume.com`, but the route has **no auth guard and no environment gate** — any caller can POST it.

**Hole 8 — Breakdown fields are stripped, so clients fall back to other metrics.**
Because `metadata.atsScoreBreakdown` and `metadata.knockOutFactors` are not in the schema (§2, proven), the cached branch of `/api/ats/calculate-score:198-211` returns `factorBreakdown: cv.metadata.atsScoreBreakdown` → always `undefined`. Several components then substitute a *different* number labelled "ATS":

- `JobKanbanCard.tsx:135` — `primaryJourney?.atsScore || job.atsScore || job.matchScore`
- `RedesignedDashboardView.tsx:853` — `job?.atsScore || job?.matchScore || cvAtsScore(linkedCv) || ...`
- `CreatedStageView.tsx:61, 119` — same fallback chain

`job.matchScore` is a job-fit score, not an ATS score. Displaying it under an "ATS" label is misleading.

### Two further scoring concerns

**The score is layout-blind.** `CentralScoreManager` never receives the template, page settings, or rendered output. `calculateATSFormattingScore` (`:539-545`) only penalises bullets over 200 characters; `calculateParsabilityMultiplier` (`:498-506`) only inspects word count, role count, and skill count. A dark two-column sidebar CV and a clean single-column CV with identical text score **identically** — which is precisely the failure mode real ATS parsers punish. The 20%-weighted "formatting" factor cannot detect columns, tables, or graphics.

**`applyDeterministicAtsPass` shapes the score upward.** `tailoringMode.ts:263-301`:

```ts
const blob = cvTextBlob(next);                       // JSON.stringify(cvData).toLowerCase()
const keywordLimit = params.mode === 'standout' ? 14 : 8;
const evidenced = params.atsKeywords
  .filter((keyword) => blob.includes(keyword.toLowerCase()))
  .slice(0, keywordLimit);
...
group.skills.push(titleCaseKeyword(keyword));        // into skills[0].skills
...
next.basics.summary = `${jobTitle}. ${summary}`;     // job title prepended to summary
```

This is bounded and is **not** fabrication — keywords must already appear somewhere. But two caveats:

1. The evidence test is a substring match against the **whole JSON blob**, which includes the job title, location, category labels, and the summary itself. A JD keyword can therefore be promoted into Skills without appearing in any experience bullet. Since `keywordMatch` is the 40%-weighted factor, this directly lifts the headline score.
2. The job title is prepended to the summary unconditionally when absent, which also feeds `keywordMatch` and the section-alignment checks.

**`atsScoreCap` is read but never written.** Grep shows six read sites (`CentralScoreManager.ts:334`, `ResumeEnhancerContext.tsx:731, 741`, `ResumeEnhancerContainer.tsx:2681`, `Step5Review.tsx:544`) and zero writers — only `default: 100` in the schema (`CV.ts:208`). The documented convention "creative = 70" is unimplemented, so no template ever caps the score.

**The tracker's refresh button is broken.** `JourneyTimelineCard.tsx:1891` POSTs to `/api/application-journey/${journey.id}/refresh-ats`, which **does not exist** (only `complete/`, `undo-complete/`, `download/`, and `route.ts` are present). There is no working "recompute my real ATS score" action in the tracker UI.

### Recommendations

**Make one route the only writer of ATS scores.**

1. Remove `cv_score_ats` and `cv_score_master` from `allowedFields` in `PUT /api/cvs/[id]` (`cvs/[id]/route.ts:383-386`). Either ignore client values and recompute server-side via `CentralScoreManager`, or reject the request when they are present.
2. Delete the `cvData` score-sniffing block (`cvs/[id]/route.ts:398-424`).
3. In `ResumeEnhancerContainer.tsx:2674-2692`, stop sending `scoreReport.overall_score` as `cv_score_ats`. Keep the LLM review confined to `metadata.surgeonAnalysis.scoreReport`, as the surgeon-analysis comment already intends.
4. In `surgeon-analysis/route.ts`, stop deriving `cv_score_ats` from the body-supplied `score`; recompute server-side.
5. Remove `cv_score_ats` / `metadata.atsScore` writes from `analysis-snapshot/route.ts`, or gate them to non-journey CVs.
6. Validate or remove `atsScore` from `PUT /api/application-journey/[id]` (`:256-258`).
7. Gate `/api/seed-dashboard` behind `process.env.NODE_ENV !== 'production'` plus an admin check, and strip the fabricated score writes.
8. Restore `/api/application-journey/[id]/refresh-ats` (recompute via `CentralScoreManager` and persist through `updateJourneyATSScore`), or remove the button.

**Make the score trustworthy and auditable.**

9. Add the missing fields to the CV schema so hash-based invalidation and breakdown persistence work: `metadata.atsScoreHash`, `metadata.atsScoreBreakdown`, `metadata.knockOutFactors`, plus the freeze fields (root `documentState` is already declared — use it).
10. Make the formatting/parsability factors template-aware: pass the resolved template's `layout.type` and `pageSettings` into `CentralScoreManager.calculateATSScore`, penalise multi-column / dark-background / decorative layouts, and set `metadata.atsScoreCap` from the template's ATS-safety class (implementing the existing "creative = 70" convention).
11. Tighten `applyDeterministicAtsPass`: run the evidence check against `extractCVSearchText` (`src/lib/utils/cv-text-extractor.ts`) over work/projects only — excluding `skills`, `basics.label`, and the summary — and record pinned keywords in a separate `pinnedKeywords` field so the score stays auditable.
12. Remove `job.matchScore` from every "ATS score" fallback chain (`JobKanbanCard`, `RedesignedDashboardView`, `CreatedStageView`). If no ATS score exists, show "not calculated" and offer to calculate — never a different metric under the ATS label.
13. Add a server-side invariant test: for a given `cvData` + job description, `metadata.atsScore` must equal `CentralScoreManager.getScoreSync(...).atsScore.total`. Any divergence between the deterministic result and the persisted value is a bug.

---

## 5. Priority summary

| # | Finding | Impact | Fix location |
|---|---|---|---|
| 1 | Auto CV toggle writes `JobSearchProfile`, generation reads `User.settings` → Standout unreachable | Feature is dead; every CV is Normal | `JobsDashboard.tsx:996` |
| 2 | `cv_score_ats` accepted from client, written to CV + journey | **ATS score can be set to any value** | `cvs/[id]/route.ts:383, 521, 794` |
| 3 | Resume Enhancer sends LLM `overall_score` as the ATS score | Deterministic score silently replaced | `ResumeEnhancerContainer.tsx:2674` |
| 4 | `metadata.isFrozen` stripped by Mongoose → deep freeze is a no-op | Free-tier cap meaningless; no footprint control | `deep-freeze-service.ts:35` + `CV.ts` schema |
| 5 | `metadata.atsScoreHash` stripped → cache invalidation always stale | Dead cache branch; quota burned on every ATS call | `cv-repository.ts:226` + `CV.ts` schema |
| 6 | Journey CV inherits Master CV template; ATS-safe layout only a fallback | Non-parseable CVs generated silently | `journeyDocumentService.ts:262` |
| 7 | Reuse engine computed, never used → new CV every journey | Unbounded per-profile duplication | `journeyDocumentService.ts:233` |
| 8 | ATS score is layout-blind (no template input) | Score overstates real parseability | `CentralScoreManager.ts:301` |
| 9 | `PUT /api/application-journey/[id]` accepts arbitrary `atsScore` | Direct score injection | `application-journey/[id]/route.ts:256` |
| 10 | `metadata.generationMode` / `generationReason` stripped | No audit trail of tailored vs fallback | `journeyDocumentService.ts:331` |
| 11 | `/refresh-ats` endpoint missing | Tracker refresh always 404s | `JourneyTimelineCard.tsx:1891` |
| 12 | `DELETE /api/journeys` orphans CV + cover letter | Storage leak | `journeys/route.ts:280` |
| 13 | Standout retitle rule rewrites held job titles | Contradicts `AGENTS.md` §6 data integrity | `tailoringMode.ts:210` |
| 14 | `atsScoreCap` never written; "creative = 70" unimplemented | No template-based ceiling | `CV.ts:208` + resolvers |
| 15 | `professional-extended-v2` → `tpl-3` (sidebar) mapping vs declared single-column | Layout depends on resolver path | `template-utils.ts:98` |
