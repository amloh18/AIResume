# Job-Landing Document Engine — Existing Architecture Audit

## Executive Summary

The current journey engine creates a CV + Cover Letter pair for each job application. The system works but has fundamental architectural gaps that prevent it from producing true job-landing documents:

1. **Mode is ephemeral** — `standard`/`standout` is read from User settings at generation time, never persisted on the journey or documents
2. **No Job Target Profile** — The AI receives raw JD text with no structured analysis of requirements, keywords, or gaps
3. **No Evidence Provenance** — Generated bullets have no link back to the Master CV fact that supports them
4. **No CV Reuse** — Every journey creates a new CV from scratch, even if an existing journey CV is suitable
5. **Keyword strategy is flat** — No tiered priority system (mandatory vs preferred vs contextual)
6. **Cover letters are generic** — Limited structured analysis of why this candidate fits this specific role

---

## 1. Execution Flow Trace

### Entry Points (3 paths, all converge on same service)

| Entry | File | Trigger |
|-------|------|---------|
| A | `POST /api/application-journey` (line 315) | User clicks "Create Journey" in UI |
| B | `PUT /api/jobs/[id]` (line 674) | Job status transitions `saved → created` |
| C | `POST /api/journey-documents/create` (line 1) | Retry/fix broken journeys |

All three call `createJourneyDocuments()` in `journeyDocumentService.ts:66`.

### Core Pipeline: `createJourneyDocuments()`

```
1. VALIDATION & IDEMPOTENCY (lines 71-109)
   ├── Load journey, verify ownership
   └── Early return if cvId AND coverLetterId both exist

2. ENTITLEMENT & MODE (lines 113-127)
   ├── getJourneyGenerationEntitlement(userId)
   │   └── Returns { mode: 'tailored' | 'fallback', isTailoredEligible }
   ├── getUserCvTailoringMode(userId)
   │   └── Reads User.settings.cvTailoringMode → 'standard' | 'standout'
   └── [spend AI credit if metered]

3. JOB DATA LOAD (lines 130-148)
   └── Load JobApplication by journey.jobId

4. CV CREATION (lines 150-349)
   ├── Race-condition guard #1: re-check journey (line 158)
   ├── Race-condition guard #2: check existing CV (line 167)
   ├── Find Master CV (line 180)
   ├── Deep copy Master CV cvData (line 218)
   ├── IF shouldTailorDocuments:
   │   └── tailorCVContent(cvData, job, tailoringMode) (line 223)
   │       ├── buildCvTailoringPrompt() → sends ENTIRE Master CV JSON to AI
   │       ├── callAIWithFallback() → Gemini
   │       └── applyDeterministicAtsPass() → pins keywords
   ├── Race-condition guard #3: final check (line 194)
   └── CV.create({ cvType: 'journey', journeyId, metadata.generationMode })

5. COVER LETTER CREATION (lines 352-511)
   ├── Race-condition guards (same pattern)
   ├── Requires CV first (hard dependency)
   ├── formatCoverLetterHeader() + formatCoverLetterFooter()
   ├── IF shouldTailorDocuments:
   │   ├── buildCoverLetterTailoringPrompt(mode)
   │   └── aiCoverLetterService.generateModularCoverLetter() → Gemini
   └── CoverLetter.create({ journeyId, metadata.generationMode })

6. FINALIZATION (lines 514-576)
   ├── journey.cvId = cvId
   ├── journey.coverLetterId = coverLetterId
   ├── journey.status = 'ready'
   ├── Mark steps 2+4 completed
   └── Send notification
```

---

## 2. Where Mode Is Stored vs Lost

### Stored

| Location | Field | Values | Scope |
|----------|-------|--------|-------|
| User model | `User.settings.cvTailoringMode` | `'standard' \| 'standout'` | User preference |
| CV metadata | `CV.metadata.generationMode` | `'tailored' \| 'fallback'` | Per-document |
| CL metadata | `CoverLetter.metadata.generationMode` | `'tailored' \| 'fallback'` | Per-document |
| Journey state | `ApplicationJourney.generationState.mode` | `'tailored' \| 'fallback'` | Per-generation |

### NOT Stored (Lost)

| What | Where it should be | Current state |
|------|-------------------|---------------|
| `standard`/`standout` choice | `ApplicationJourney.tailoringMode` | **Missing** — ephemeral local variable |
| Job Target Profile | `ApplicationJourney.jobTargetProfile` | **Missing** — no structured JD analysis |
| Evidence Profile | `ApplicationJourney.evidenceProfile` | **Missing** — no structured candidate facts |
| Gap Analysis | `ApplicationJourney.gapAnalysis` | **Missing** — no matched/missing/partial tracking |
| Keyword Strategy | `ApplicationJourney.keywordStrategy` | **Missing** — flat extraction only |
| Generation Prompt Hash | `ApplicationJourney.generationPromptHash` | **Missing** — can't track what was sent to AI |

---

## 3. CV Generation Details

### How CVs Are Generated

1. Master CV `cvData` is deep-copied via `JSON.parse(JSON.stringify(...))`
2. If tailoring is eligible, the **entire** Master CV JSON is sent to Gemini with the JD
3. AI returns a modified `UnifiedCVDataStructure` matching input keys 1:1
4. A deterministic ATS pass pins exact JD tokens into skills/summary
5. New CV is created with `cvType: 'journey'`, linked to journey

### Problems

- **Entire Master CV is sent** — no selective evidence extraction
- **No gap analysis before generation** — AI doesn't know what's matched vs missing
- **No keyword tiering** — all keywords treated equally
- **No reuse check** — always creates new CV even if suitable existing one exists
- **Deterministic ATS pass is post-hoc** — pins keywords after generation rather than guiding it

### Master CV Query Pattern

The Master CV is found via a multi-signal query (inconsistent across codebase):
```typescript
CV.findOne({ userId, $or: [
  { 'metadata.isMaster': true },
  { 'metadata.isMaster': 'true' },
  { isMaster: true },
  { isMaster: 'true' }
]})
```

Some routes also check `cvType: 'master'` or `metadata.createdVia: 'ai-career-report'`.

---

## 4. Cover Letter Generation Details

### How Cover Letters Are Generated

1. Requires CV to exist first (hard dependency)
2. Header generated from CV basics + job data
3. Footer generated from CV candidate name
4. If tailoring eligible: builds prompt with mode instructions, calls Gemini
5. AI returns structured JSON with sections (introduction, experience bridges, motivation, closing)
6. Sections merged into flat body string

### Problems

- **No structured analysis of WHY this candidate fits** — generic prompt
- **Mode affects tone only** — standard=conservative, standout=assertive
- **No evidence linking** — cover letter bullets not linked to Master CV facts
- **Limited personalization** — doesn't reference specific company research or culture fit

---

## 5. Application & Document Linking

### Current Relationship Graph

```
ApplicationJourney.cvId ---------> CV._id
ApplicationJourney.coverLetterId -> CoverLetter._id
CoverLetter.cvId ----------------> CV._id
CoverLetter.journeyId ------------> ApplicationJourney._id
CV.journeyId --------------------- > ApplicationJourney._id
```

### What Links to What

| Model | Has cvId? | Has coverLetterId? | Notes |
|-------|----------|-------------------|-------|
| ApplicationJourney | ✅ String | ✅ String | **Single source of truth** |
| CV | ❌ (has journeyId) | ❌ | Linked via journeyId |
| CoverLetter | ✅ Mixed | ❌ (has journeyId) | Back-link to CV |
| JobApplication | ❌ Removed | ❌ | Was removed; uses journey |
| Application (automation) | ✅ Mixed | ✅ Mixed | Separate model for automation |

---

## 6. Document Immutability & Versioning

### Current State

- **No versioning** — CVs are mutated in place via the editor
- **No immutability** — journey CVs can be edited after creation
- **No staleness detection** — if Master CV changes, journey CVs are not flagged
- **metadata.version** exists on CoverLetter (default 1) but is never incremented
- **metadata.lastModified** is updated on every CV save (pre-save hook)

### What Should Exist

- Journey CVs should be **immutable snapshots** at generation time
- If Master CV changes, linked journey CVs should be flagged as potentially stale
- Version tracking should link journey CV version to Master CV version at generation time

---

## 7. Existing CVs & Reuse

### Current State

- **No reuse logic** — every `createJourneyDocuments()` call creates new CV + CL
- **Race-condition guards** prevent duplicate creation within the same journey
- **No cross-journey reuse** — even identical roles at the same company get new CVs
- **The convert-to-journey path** does check for existing standalone CVs before creating from Master

### What Should Exist

Before creating a new CV, evaluate:
1. Does the user already have a journey CV for a similar role?
2. Is that CV sufficiently suitable for this job?
3. Can it be reused as-is, or does it need minor tailoring?

---

## 8. AI Generation Pipeline

### Provider

Google Gemini via `@google/genai` package.

### Key Resolution Chain

`gemini_api_key` → `GEMINI_API_KEY` → `gemini_api_key1` → `GEMINI_API_KEY1` → `NEXT_PUBLIC_GEMINI_API_KEY`

### Models

- Primary: `gemini-2.5-flash-lite`
- Fallback: `gemini-2.5-flash`

### Prompt Templates

| Template | File | Purpose |
|----------|------|---------|
| `CV_TAILOR_AGENT_PROMPT` | `promptTemplates.ts:5` | CV tailoring |
| `ANALYSIS_AGENT_PROMPT` | `promptTemplates.ts:3` | CV analysis |
| `COVER_LETTER_AGENT_PROMPT` | `promptTemplates.ts:7` | Cover letter generation |
| `buildCvTailoringPrompt()` | `tailoringMode.ts:156` | Builds tailoring prompt with JD keywords |
| `buildCoverLetterTailoringPrompt()` | `tailoringMode.ts:216` | Builds cover letter prompt |

### ATS Keyword Extraction (Deterministic)

`extractAtsKeywords()` in `tailoringMode.ts:127`:
- Checks against 30+ `KNOWN_ATS_PHRASES`
- Tokenizes JD, filters stop words
- Ranks by frequency
- Returns top 28 keywords

### Deterministic ATS Pass (Post-AI)

`applyDeterministicAtsPass()` in `tailoringMode.ts:263`:
- Pins exact JD tokens into skills section (only if evidenced in CV blob)
- Ensures job title appears in summary
- Limits keyword insertion: 8 for standard, 14 for standout

---

## 9. ATS Scoring

### CentralScoreManager (`pill-engine/CentralScoreManager.ts`)

**CV Score** = (C + I + Q + F + R) × V
- C (Completeness): 25pts
- I (Impact Verbs): 20pts
- Q (Quantification): 20pts
- F (Formatting): 15pts
- R (Readability): 20pts
- V (Validity Multiplier): 0.2 if <100 words

**ATS Score** = (K×0.4) + (F×0.2) + (S×0.15) + (R×0.15) + (C×0.1) × P
- K (Keywords): 40pts
- F (Formatting): 20pts
- S (Section Alignment): 15pts
- R (Recency): 15pts
- C (Contactability): 10pts
- P (Parsability Multiplier): 0.1 if <50 words

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/services/journeyDocumentService.ts` | Core document creation engine |
| `src/lib/cv-tailoring/tailoringMode.ts` | Tailoring modes + prompt builders |
| `src/lib/cv-tailoring/getUserCvTailoringMode.ts` | Reads user preference |
| `src/lib/services/aiCoverLetterService.ts` | Cover letter AI generation |
| `src/lib/utils/journey-generation.ts` | Entitlement + state builders |
| `src/lib/utils/coverLetterUtils.ts` | Header/footer/merge utilities |
| `src/models/ApplicationJourney.ts` | Journey model |
| `src/models/CV.ts` | CV model |
| `src/models/CoverLetter.ts` | Cover letter model |
| `src/models/JobApplication.ts` | Job tracker model |
| `src/types/unified-cv-schema.ts` | CV data structure |
| `src/lib/prompts/promptTemplates.ts` | AI prompt templates |
| `src/lib/pill-engine/CentralScoreManager.ts` | ATS scoring |
| `src/lib/services/cv-surgeon-service.ts` | CV analysis/fix system |
| `src/lib/services/keyword-gap-analysis-service.ts` | Keyword gap analysis |
| `src/app/api/application-journey/route.ts` | Primary journey API |
| `src/app/api/journey-documents/create/route.ts` | Document creation API |
| `src/app/api/cvs/[id]/convert-to-journey/route.ts` | Standalone-to-journey |

---

## 11. Identified Gaps (Prioritized)

### Critical Gaps

1. **No structured Job Target Profile** — AI receives raw JD text, no structured requirement analysis
2. **No evidence provenance** — Generated content not linked to Master CV facts
3. **Mode not persisted** — `standard`/`standout` is ephemeral, can't be audited or reproduced
4. **No CV reuse** — Every journey creates new CV from scratch
5. **No gap analysis before generation** — AI doesn't know what's matched vs missing

### Important Gaps

6. **Keyword strategy is flat** — No tiered priority (mandatory/preferred/contextual)
7. **Cover letters lack structured personalization** — Generic prompts, no company research
8. **No document versioning** — Journey CVs can be mutated, no staleness detection
9. **Master CV query is inconsistent** — Different routes use different query patterns

### Minor Gaps

10. **Deterministic ATS pass is post-hoc** — Should guide generation, not patch after
11. **Cover letter templates exist but aren't used in journey flow**
12. **No generation prompt hash** — Can't reproduce or audit what was sent to AI
