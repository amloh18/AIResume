# ATS coverage: what we can auto-apply to today, and what it would take to add the rest

**Status: analysis only — nothing implemented.** Written 2026-09-27 from a read-only probe of the
production `jobs` collection plus a read of the submission code path.

You asked for **Workday, Paylocity and BambooHR**. The measurement below says the request is
well-founded — and that the *reason* those jobs are manual is not primarily a missing adapter. It is
that **we never give the detector the URL**.

---

## 1. The corpus, measured

`jobs` holds **48,812** documents. 86.7 % of them come from one source:

| `source.primary` | jobs |
| --- | --- |
| **`feashliaa`** (pre-aggregated multi-ATS sync) | **42,338** |
| greenhouse | 4,914 |
| discovery | 549 |
| remoteok | 315 |
| jobspy | 205 |
| lever / ashby | 173 / 171 |
| workable | 81 |
| remotive / recruitee / bamboohr / smartrecruiters / personio | 29 / 18 / 8 / 1 / 1 |

**Every one of the 42,338 `feashliaa` jobs stores its apply URL at `source.applicationUrl`.**
**None of them populates `applyUrl`.**

| Probe | Result |
| --- | --- |
| `feashliaa` jobs | 42,338 |
| …with `source.applicationUrl` populated | **42,338 (100 %)** |
| …with `jobs.applyUrl` populated | **0 (0 %)** |

Broken down by the ATS that actually hosts the form:

| ATS in `source.applicationUrl` | jobs | status today |
| --- | --- | --- |
| **workday** | **25,584** | detected, **gated off**, no handler |
| **icims** | **4,442** | not detected, no handler |
| **paylocity** | **2,524** | not detected, no handler |
| **bamboohr** | **1,733** | not detected, no handler |
| greenhouse | 5,406 | **already automatable** |
| lever | 1,652 | **already automatable** |
| ashby | 997 | **already automatable** |
| | **42,338** | (16,754 + 25,584 — the arithmetic closes) |

---

## 2. Why these jobs are manual — the URL never reaches the detector

`detectAtsFromUrl()` is correct and already knows `workday`. It is simply never given the URL. The
chain, with the exact line that breaks it:

```
feashliaa job  ──►  jobs.applyUrl = ""            ← always empty for this source
                    jobs.source.applicationUrl = "https://saxobank.wd3.myworkdayjobs.com/…"

GET /api/jobs/discover
    discover/route.ts:680,802   applyUrl: candidate.applyUrl      ← returns the EMPTY field
    (the same file, at :923/:933, DOES fall back to source.applicationUrl — but only inside the
     saved-jobs filter, so the correct value is computed and then thrown away)

client posts back
    JobsDashboard.tsx:937          jobUrl: job.applyUrl
    TopJobMatchesSection.tsx:483   jobUrl: targetJob.applyUrl
    JobSidebar.tsx:1625            jobUrl: job.jobUrl || ''

POST /api/jobs/auto-apply
    route.ts:78   detectAtsFromUrl('')  →  null
                  → falls back to the client's `atsType` (an aggregator name)
                  → not in validAtsTypes  →  'unknown'

JobApplication.atsType = 'unknown'
    processApplication → isPlaywrightAutomatable('unknown') → false
    → parked: "ATS type \"unknown\" is not automatable. Manual submission required."
```

This is the same defect `SB-03` described — *the URL is the only evidence of the submission
target* — but it survives because **two of the three call sites never had a URL to send.**

The database agrees: `jobapplications.atsType` is greenhouse 57, **unknown 27**, ashby 7, null 5,
lever 1, workable 1, naukri 1. **`unknown` is the second-largest bucket and no `workday` row has ever
existed.**

### 2.1 The fix is not an adapter — it is URL resolution

If the resolved URL reaches the detector, **8,055 jobs immediately become auto-appliable with zero
new adapter code** (greenhouse 5,406 + lever 1,652 + ashby 997). That is the highest-value change in
this document and it is small.

**Preferred fix — resolve server-side.** `POST /api/jobs/auto-apply` receives `jobId`. It should load
the listing and derive the URL itself (`applyUrl || source.applicationUrl`), rather than trusting a
client-supplied string. A client cannot be the authority on a security-relevant routing decision, and
this is the third time this class of bug has appeared.

**Minimum fix — one expression, in the response mapping.** Make `discover/route.ts` return the same
value it already computes in its filter:

```ts
applyUrl: candidate.applyUrl || candidate.source?.applicationUrl || '',
```

**Either way, the fallback expression must live in ONE place.** It currently exists twice in
`discover/route.ts` (in the filter) and is absent from the two places that build the response.

---

## 3. What genuinely needs a new adapter

After URL resolution is fixed, these remain un-automatable — **34,283 jobs, 70 % of the corpus**:

| ATS | jobs | detected? | gate? | handler? |
| --- | --- | --- | --- | --- |
| **workday** | 25,584 | ✅ | ❌ | ❌ |
| **icims** | 4,442 | ❌ | ❌ | ❌ |
| **paylocity** | 2,524 | ❌ | ❌ | ❌ |
| **bamboohr** | 1,733 | ❌ | ❌ | ❌ |

**iCIMS is bigger than Paylocity and BambooHR combined and was not on your list.** It is worth
deciding on deliberately rather than by omission.

### 3.1 Three independent blockers per ATS

`PLAYWRIGHT_AUTOMATABLE_ATS`, the `switch` in `UnifiedApplyService.apply`, and the helpers in
`atsPlaywrightService.ts` must all agree. Adding a name to the gate **without** a handler is exactly
`SB-04`: the job clears the gate and silently degrades to `applyGeneric`, which returns *"Review and
submit on employer website"* and never submits.

So each new ATS needs **four** edits, not one:

1. `detectAtsFromUrl()` — host patterns (`src/lib/jobs/autoApplySupport.ts`).
2. `PLAYWRIGHT_AUTOMATABLE_ATS` — the gate.
3. `case '<ats>'` in `UnifiedApplyService.apply`.
4. `detect<Ats>Fields` / `fill<Ats>Fields` / `submit<Ats>Form` in `atsPlaywrightService.ts` — the
   real work. The existing four are ~250 lines each.

---

## 4. Difficulty per platform

> ⚠️ **These assessments come from the shape of each product, not from driving live forms** — I had
> no browser in this session. Treat them as a triage order to be verified, not as findings. The
> 25,584 real Workday URLs in `source.applicationUrl` make step 1 cheap: they are a ready-made test
> corpus.

**BambooHR — easiest, do this first.** Single-page form: name, email, phone, résumé upload, cover
letter, a few custom questions. **No account creation** on a standard board. Closest in shape to the
Greenhouse/Ashby handlers already written, so it is the cheapest way to prove the four-edit recipe
end-to-end.

**Paylocity — medium.** Modern boards (`recruiting.paylocity.com/Recruiting/Jobs/Details/<id>`) are a
single form with résumé upload; some tenants interpose a "create profile" step. The interposed step
is the only real risk.

**Workday — hardest, and the one that matters most (52 % of the corpus).** It is a multi-step wizard
(*My Information → My Experience → Application Questions → Voluntary Disclosures → Self Identify →
Review*) and **most tenants require creating an account with email verification before the form is
reachable.** That is a genuine design decision, not an implementation detail:

- unattended automation cannot complete an email-verification loop;
- storing per-tenant credentials for third-party ATS accounts is a security and consent question;
- some tenants offer a guest/autofill path — those are automatable, the rest are not.

There is one real asset: **`buildairesume-job-ingestion/src/ats/WorkdayAdapter.ts` (12 KB) already
targets Workday's `data-automation-id` attributes**, which are the stable hooks. It is dead code
(nothing imports it) and written against a different base class, but it is a usable selector
reference.

**iCIMS — hard.** Multi-step and registration-gated, similar in shape to Workday.

**Recommendation: BambooHR → Paylocity → (design decision on Workday) → iCIMS.** Do not start with
Workday even though it is the biggest; it is the one most likely to stall on a product decision
rather than an engineering one.

---

## 5. Two structural problems worth fixing while we are here

**There are six copies of the "automatable ATS" list.** Any of them can drift:

| Location | Note |
| --- | --- |
| `lib/jobs/autoApplySupport.ts` | the canonical pair |
| `app/api/jobs/auto-apply/route.ts:76` | `validAtsTypes` — a hand-written duplicate of `ATSType` |
| `lib/decision/hardFilters.ts:102` | includes `workday` **and** `unknown`; **the `if` body is empty**, so it is a no-op that reads as a check |
| `lib/services/unifiedApplyService.ts:1573` | `atsTypesWithCaptcha` |
| `lib/services/applicationDryRunService.ts:139` | a **fourth detector** — knows `icims`/`smartrecruiters`, lacks `naukri`/`indeed`/`adzuna`, and has no embed-awareness (`gh_jid`) |
| model enums (`JobApplication`, `ApplicationJourney`, `CompanyWatchlist`) | `ApplicationJourney` already admits `icims` and `smartrecruiters` |

`hardFilters.ts:102` is the one to fix first: it is harmless today only because someone left the body
empty, and the next person to fill it in will re-create `SB-04` in the decision engine.

**The ingestion-side adapter layer is dead code.**
`buildairesume-job-ingestion/src/ats/` holds a proper `BaseATSAdapter` plus Greenhouse, Lever, Ashby
and Workday adapters (~58 KB). **Nothing imports it** — `playwrightAutomationService.ts` imports it,
and nothing imports that. The live submission path is the in-app `atsPlaywrightService.ts`. Decide
explicitly: revive it as the shared adapter layer, or delete it so it stops reading as coverage.

---

## 6. Recommended sequence

| # | Change | Effect | Risk |
| --- | --- | --- | --- |
| 1 | Resolve the apply URL server-side in `POST /api/jobs/auto-apply` | **8,055 jobs become auto-appliable**; `unknown` stops being the second-largest park reason | low |
| 2 | One fallback expression in `discover/route.ts`'s response mapping | same, plus correct display URLs | low |
| 3 | Extend `detectAtsFromUrl` with `bamboohr`, `paylocity`, `icims` hosts | correct **labels** even before handlers exist | low |
| 4 | Fix `hardFilters.ts:102` and collapse the six lists to the canonical one | removes the next `SB-04` | low |
| 5 | Build the **BambooHR** handler (4 edits, §3.1) | 1,733 jobs | medium |
| 6 | Build the **Paylocity** handler | 2,524 jobs | medium |
| 7 | Decide the **Workday** account-creation question, then implement | 25,584 jobs | high — product decision |
| 8 | Decide on **iCIMS** | 4,442 jobs | high |

Steps 1–4 are small, independent, and need no new automation code. They are worth doing on their own
regardless of what happens with 5–8.

---

## 7. What I need from you

1. **Go-ahead for steps 1–4** — they are small and they unlock the most jobs per line changed. I
   would verify step 1 against the real corpus (the `unknown` park count should fall and greenhouse /
   lever / ashby counts should rise).
2. **A decision on Workday's account-creation flow** (§4) before any Workday code is written. This is
   the blocker, not the automation.
3. **Confirmation of the adapter order** — I recommend BambooHR first as the proof of the recipe.
4. **A live test URL per ATS** if you want the handlers verified end-to-end; otherwise I can only
   verify detection and gating, not submission.
