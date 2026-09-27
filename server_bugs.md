# server_bugs.md — server-side issues register

Opened 2026-09-26, from the live-application-progress work. **App-side fixes are already in the working
tree; everything below marked `OPEN` needs a decision or a server-side change.**

You cannot SSH to the VPS right now, so §1 exists to let you triage from a browser/terminal.

---

## 0. How to use this file

**Severity**

| | Meaning |
| --- | --- |
| **P0** | Product is broken for users right now. Nothing is being submitted. |
| **P1** | A whole class of applications silently never submits, or submits against the wrong target. |
| **P2** | Latent / correctness. Works today, breaks under a stated condition. |
| **P3** | Already fixed in the tree — listed so the history is not re-litigated. |

**Status** — `OPEN` · `OPEN (needs server access)` · `FIXED IN TREE (needs deploy)` · `FIXED IN TREE` ·
`WORKING AS INTENDED`

**Do not "fix" §5 without reading it.** Three things in this codebase look like bugs and are deliberate.

---

## 1. Diagnose without SSH

### 1.1 Is anything draining the queue? — `GET /api/health`

`src/app/api/health/route.ts:192` reports which background loops *this* process runs. It exists precisely
because the web and worker tiers are the same image and therefore indistinguishable from outside.

```bash
curl -s https://buildairesume.com/api/health | python3 -m json.tool | head -20
```

Look at `worker`:

```json
"worker": { "role": "all", "loops": ["email", "emailIngestion", "applicationQueue", "reconciliation"] }
```

| What you see | What it means |
| --- | --- |
| `loops` contains `applicationQueue` | This process drains the queue. Fine. |
| `loops: []` and `role: "web"` | **Correct for the web tier.** Check the *worker* service's own `/api/health`… which it does not serve. See §1.2. |
| `loops: []` on **both** tiers | **P0.** Nothing drains the queue. See SB-01. |
| `role: "all"` on the web tier | The loops run inside the web container → they die on every redeploy. See SB-01. |
| `warning` present | `WORKER_ROLE` is misspelled. It falls back to `all` (fail-open) — see SB-01. |

### 1.2 Are the cron endpoints even reachable?

Every `/api/cron/*` route fails **closed**. The status code tells you which failure you have:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://buildairesume.com/api/cron/auto-apply
```

| Code | Meaning |
| --- | --- |
| `503` | `CRON_SECRET` **and** `CRON_API_KEY` are both unset → **SB-02**. All scheduled work is dead. |
| `401` | Secret is set but the caller's header is wrong/missing → the host cron file is misconfigured. |
| `200` | Authorised — it actually drained a batch. |

With the secret to hand:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://buildairesume.com/api/cron/auto-apply?limit=1" | python3 -m json.tool
```

### 1.3 Is a specific application stuck, and why?

```bash
curl -s "https://buildairesume.com/api/applications/progress?ids=<applicationId>" | python3 -m json.tool
```

`progress.<id>.diagnostic` carries the operator-only diagnosis (the customer never sees it):

```json
"diagnostic": {
  "code": "queue_stalled",
  "waitedSeconds": 1240,
  "message": "Auto-Apply queue not draining: no agent claimed application … for 20 min. Check WORKER_ROLE / the auto-apply cron on the server."
}
```

`progress.<id>.phase` / `.liveText` tell you where the pipeline believes it is; `.stalled: true` is the
alarm. `GET /api/health` and this endpoint together cover most of what SSH would have told you.

---

## 2. P0 — nothing is being submitted

### SB-01 · The application queue has no drainer in production · `OPEN (needs server access)`

**Symptom.** Staging completes (documents are generated), then nothing: no form fill, no CV/CL attach, no
submit, no email. Rows sit at `internalStatus: 'queued'` forever.

**Why it is invisible.** Staging runs in the Next.js request path, so it always works. Submission runs in
a background loop. If no process runs the loop, *nothing errors* — the queue simply never advances.

**Two independent drain paths — both must be checked:**

| Path | Where | Cadence |
| --- | --- | --- |
| In-process poll loop | `src/workers/applicationWorker.ts:8` — `POLL_INTERVAL_MS = 10_000` | every 10 s |
| Cron endpoint | `src/app/api/cron/auto-apply/route.ts` | header recommends `*/5 * * * *` |

Both call the same primitives (`claimNextApplication` → `processApplication` → `completeQueueItem` /
`failQueueItem`), so there is exactly one queue and one set of transitions. Claiming is an atomic
`findOneAndUpdate`, so running both is wasteful but not corrupting.

**What gates them.** `src/workers/roles.ts:47-51`:

```ts
all:    { email: true,  emailIngestion: true,  applicationQueue: true,  reconciliation: true }
worker: { email: true,  emailIngestion: true,  applicationQueue: true,  reconciliation: true }
web:    { email: false, emailIngestion: false, applicationQueue: false, reconciliation: false }
```

- `WORKER_ROLE=web` on **both** services ⇒ nothing drains. This is the single most likely cause.
- `WORKER_ROLE` unset ⇒ `all` ⇒ the loops run **inside the web container** and are killed by every
  redeploy (`src/instrumentation.ts:49-54` warns about exactly this).
- A typo (`wroker`) fails **open** to `all` and logs a `warning` — deliberately, so a typo cannot silently
  stop queue processing.

**Fix direction.** Set `WORKER_ROLE=web` on the web service and run the worker service
(`docker build --target worker`, `npm run worker`) with `WORKER_ROLE=worker` or unset. *And* schedule the
cron as a belt-and-braces path. Then confirm via §1.1 / §1.2.

**Verify.** `curl /api/health` shows `applicationQueue` in `loops` for the process you intend, **and**
`/api/cron/auto-apply` returns 200, **and** a queued application's `phase` moves past `queued` within
5 minutes.

---

### SB-02 · Cron auth fails closed — unset secret kills all scheduled work · `OPEN (needs server access)`

**Evidence.** `src/lib/auth/cron-guard.ts:45-56`. When neither `CRON_SECRET` nor `CRON_API_KEY` is set,
every `/api/cron/*` request gets `503 CRON_NOT_CONFIGURED` and nothing runs.

This is **correct and deliberate** (`cron-guard.ts:9-25` documents the fail-open version it replaced), but
it is a silent-work-stopper if the secret was never set on the deployment: a fresh box has no scheduled
work at all and the only trace is a 503 in the scheduler log.

**Check.** §1.2. `503` = not configured; `401` = configured but the cron file sends the wrong header.

**Fix.** Set `CRON_SECRET` (or `CRON_API_KEY`) on the deployment **and** in the host crontab's header, then
re-check for `200`.

---

## 3. P1 — applications that can never submit

### SB-03 · `atsType` is the *discovery source*, not the apply target · `OPEN`

**This is the biggest functional gap in job discovery.**

`JobApplication.atsType` is written from where the job was **found**:

| Writer | Value |
| --- | --- |
| `src/lib/ingestion/engine.ts:1994` | `job.source.primary` |
| `src/lib/services/adzunaDiscoveryService.ts:121` | `'adzuna'` (via `as any`) |
| `src/lib/services/jobDiscoveryService.ts:281` | `'lever'` |
| `src/lib/services/jobDiscoveryService.ts:359` | `'ashby'` |
| `src/lib/services/jobDiscoveryService.ts:425` | `'workable'` |
| `src/lib/services/jobDiscoveryService.ts:656` | `'greenhouse'` |

But it is consumed as the **submission target**:

```ts
// src/lib/worker/processApplication.ts:98-99
const atsType = jobApplication.atsType || 'unknown';
const isAutomatable = ['greenhouse', 'lever', 'ashby', 'workable', 'workday'].includes(atsType);
if (!isAutomatable) { /* → review_required, manual */ }
```

and again at `src/lib/services/unifiedApplyService.ts:299` (`switch (context.atsType)`).

**Impact.** A job discovered through Adzuna / Remotive / RemoteOK / JobSpy gets `atsType: 'adzuna'`
(or similar) and is parked as *manual submission required* — **even when its `applyUrl` is an ordinary,
fully automatable Greenhouse or Lever board.** Aggregator-discovered jobs can therefore never auto-apply,
which is most of the feed.

**Fix direction.** Derive the ATS from the **apply URL host** at enqueue time (`detectAtsFromUrl()`),
falling back to the discovery source only when the URL is unrecognised. The host knowledge already exists
in `src/platforms/greenhouse/GreenhouseAdapter.ts:8-9` and
`src/lib/services/applicationDryRunService.ts:142` — it just is not used for routing.

**Verify.** An Adzuna-sourced job whose `applyUrl` is `boards.greenhouse.io/...` should reach
`phase: 'form_detection'`, not park at `review_required`.

---

### SB-04 · `workday` is declared automatable but has no handler · `OPEN`

```ts
// processApplication.ts:99 — workday PASSES the gate
['greenhouse', 'lever', 'ashby', 'workable', 'workday']
```

```ts
// unifiedApplyService.ts:299-324 — but there is no `case 'workday'`
switch (context.atsType) {
  case 'greenhouse': … case 'lever': … case 'ashby': … case 'workable': …
  case 'naukri': … case 'indeed': … case 'adzuna': …
  default: applyResult = await this.applyGeneric(…);   // ← workday lands here
}
```

`applyGeneric` (`unifiedApplyService.ts:1263`) returns `action_required` with
*"Review and submit on employer website"* and **never attempts a submission**.

**Impact.** A Workday job clears the automatable gate, then silently degrades to a manual park. The user
is told nothing specific — there is no "Workday is not supported yet" signal anywhere.

**Fix direction.** Either drop `'workday'` from `isAutomatable` so the gate parks it honestly (cheap), or
implement `applyToWorkday`. `ATSType` (`src/types/automation-schema.ts:10`) already includes it.

**Verify.** A Workday job should park with a reason that names Workday, not the generic message.

---

### SB-05 · Company-hosted ATS embeds fail form detection · `OPEN (needs a live page)`

**Example.** `https://careers.airbnb.com/positions/8232474?gh_jid=8232474`

The job is discovered via a Greenhouse board, so `atsType: 'greenhouse'` and the Greenhouse handler runs —
but the page is the company's own domain, not `boards.greenhouse.io`. The detector's host knowledge is
`src/platforms/greenhouse/GreenhouseAdapter.ts:8-9`:

```ts
url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')
```

The embed is served from a different origin, often inside an iframe.

**Impact.** Parks as *"no application form detected"*. **Safe** — it will not double-submit — but the
application is never submitted and the user must do it manually.

**Fix direction.** Handle the `gh_jid` / `lever-origin` / `ashby_jid` embed patterns: detect the ATS from
the *query parameter* (not just the host) and descend into the iframe. This needs a live page to develop
against, so it is not an app-side-only fix.

**Verify.** An `?gh_jid=` URL should reach `phase: 'field_fill'`.

---

## 4. P2 — latent / correctness

### SB-06 · `Mixed`-typed keys silently miss rows · `OPEN`

`Schema.Types.Mixed` disables Mongoose casting, so a query with one shape silently misses documents stored
in the other. A plain `find({ applicationId: id })` returns nothing and reports no error.

| Model | Field | Evidence |
| --- | --- | --- |
| `ApplicationQueue` | `applicationId`, `userId`, `jobId` | `src/models/ApplicationQueue.ts:47-49` |
| `JobApplication` | `userId` | `src/models/JobApplication.ts:222-224` |
| `UserSettings` | `userId` | `src/models/UserSettings.ts:174` |

**Rule.** Always query both shapes:

```ts
{ $in: [rawId, new mongoose.Types.ObjectId(rawId)] }
```

**Status.** Applied in `GET /api/applications/progress` (`src/app/api/applications/progress/route.ts`).
**The rest of the codebase has not been swept.** Grep every query on these paths.

**Verify.** `grep -rn "applicationId:" src/ | grep -v '\$in'` should return no bare equality query.

---

### SB-07 · Cron overlap lock is in-process only · `OPEN`

`src/lib/cron/runCron.ts` guards against overlapping runs with an in-process `Map`:

> The lock is an **in-process** `Map` … If the app is ever scaled to multiple replicas, this must become a
> Mongo `findOneAndUpdate` lease before these routes rely on it.

**Impact.** Correct on a single container. On ≥2 replicas, `daily-summary` can enqueue the same emails
twice and `process-campaigns` can clone the same recurring child twice. A skipped run returns `409
CRON_ALREADY_RUNNING`.

**Trigger to fix:** the moment you run more than one app replica.

---

### SB-08 · The server writes operator prose into `reviewReason` (a user-facing field) · `OPEN`

`reviewReason` is returned to the client and rendered. The producers write it for operators:

| Evidence | String |
| --- | --- |
| `processApplication.ts:45` | `Worker picked up application from queue` |
| `processApplication.ts:110` | `ATS type "${atsType}" is not automatable. Manual submission required.` |
| `processApplication.ts:129` | `ATS ${atsType} detected. Playwright automation ready.` |
| `processApplication.ts:234` | `Automation failed: ${applyResult.message}` |
| `processApplication.ts:255` | `Worker error: ${err.message}` |
| `unifiedApplyService.ts:1308` | `… Automated submission unavailable (${detail}). Please submit manually.` |

**App-side mitigation is shipped** (`sanitizeReason()` in `src/lib/applications/live-progress.ts` drops
anything with operator vocabulary, a snake_case token, a URL, >180 chars, or that is not a sentence — the
curated copy then wins). Two real leaks were found and closed on 2026-09-26:
`ATS type "adzuna" is not automatable…` and `Decision engine returned "skip"…`.

**The server-side fix is still worth doing:** do not put operator prose in a user-facing field. Either
write user-safe copy at the producer, or split the field (`reason` for users, `operatorReason` for us) —
the same channel split applied to the progress derivation. Until then the sanitiser is a filter, not a
fix, and every new reason is a new chance to leak.

---

### SB-09 · `applyToAdzuna` is unreachable dead code · `OPEN`

`unifiedApplyService.ts:1244` is a stub returning `action_required`, and it cannot be reached:
`'adzuna'` is not in `isAutomatable` (`processApplication.ts:99`), there is no adzuna auto-apply route
(`find src/app/api -ipath "*adzuna*"` → nothing), and the only caller is the switch case itself.

Low risk. Either delete it or make it reachable — do not leave it looking implemented.

---

### SB-15 · The blanket `*.md` gitignore silently drops new documentation · `OPEN`

Found while creating *this file* — it was invisible to `git status` the moment it was written.

`.gitignore:58-68` carries a comment that reads:

> The blanket `*.md` ignore previously swallowed the entire `docs/` tree — 54 documents were never
> committed because of it.

…followed by `*.md` and a single exception, `!AGENTS.md`. **The rule described as fixed was never actually
fixed.** Ignore rules do not affect already-tracked files, which is why this looked resolved: `docs/*.md`
were force-added or added before the rule, so 86 of them are tracked and nobody noticed the rule still
firing on anything *new*.

**Measured 2026-09-26:**

```
docs/*.md tracked: 86
docs/*.md on disk: 89          ← 3 silently untracked
```

The three currently invisible:

- `docs/application-automation/application-flow.md` — **`AGENTS.md` §53/54 requires maintaining
  `docs/application-automation/`.** A doc the repo mandates is not in version control.
- `docs/CVCircle Editor Deep Audit — Steps 1-5.md`
- `docs/auto-apply/task-rate-limits-paywall.md`

**Impact.** Every new `.md` a developer or agent writes is lost on the next clone. It fails silently in
both directions: no error when writing, no diff to notice. `CLAUDE.md` is tracked only by luck.

**Fix applied (narrow).** Added `!server_bugs.md` so this register is trackable, and annotated the rule
with the measurement and a pointer here. The blanket rule itself is left alone because changing it is a
repo-wide policy call — `!/docs/**` would surface the three files above.

**Decide.** Either invert the policy (`*.md` → ignore nothing, or an explicit allow-list) or keep adding
per-file exceptions. **Recommended:** `!/docs/**` plus named root-level docs, since the comment already
states the intent that docs are version-controlled.

**Verify.** `git check-ignore -v <new>.md` should print a `!` negation rule (or nothing), not `*.md`.
`comm -13 <(git ls-files docs/ | sort) <(find docs -name '*.md' | sort)` should print nothing.

---

## 5. Working as intended — do **not** "fix" these

**`naukri` / `indeed` are excluded from `isAutomatable` on purpose.**
`src/app/api/jobs/naukri/auto-apply/route.ts:15-28` and `src/app/api/jobs/indeed/auto-apply/route.ts:11-24`
document why. Both routes used to write `status: 'applied'`, tag the row `*-auto-applied`, bump
`…Integration.stats.totalApplied` and narrate *"Submitted via 1-Click … Auto-Apply"* in a `statusHistory`
field **that does not exist on `JobApplication`** — so Mongoose's strict mode dropped the narrative while
the `applied` status and the counter persisted. The lie that survived was the one that mattered: the
tracker said the user had applied. They now record a truthful `saved` row and return `submitted: false`.
The worker gate excluding them is what keeps `applyToNaukri` / `applyToIndeed` from being reached.

**Cron auth failing closed** (`cron-guard.ts`) — see SB-02. It replaced a fail-**open** guard that ran for
anyone when `CRON_SECRET` was unset, and one route that compared against the literal string
`"Bearer undefined"`.

**`releaseStuckItems` releasing after 30 minutes** — see SB-10. The behaviour is the fix.

---

## 6. P3 — fixed, for the record

### SB-10 · `releaseStuckItems` never checked `maxAttempts` · `FIXED IN TREE`

`src/lib/worker/claimNext.ts:111-147`. The 30-minute release cycle used to requeue unconditionally, so an
item that could never succeed looped forever — **observed at `attempts=55` against `maxAttempts=3`,
cycling for over a day**. Now the release path splits on remaining attempts (`$expr`) and dead-letters an
exhausted item instead of looping.

### SB-11 · Cron routes were fail-open · `FIXED IN TREE`

`src/lib/auth/cron-guard.ts:9-25`. Each route used to hand-roll
`if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`)`, which short-circuits when the secret is
unset and lets anyone in. One route fell back to a hard-coded `'dev-secret'`.

### SB-12 · Five `internalStatus` values were declared but never written · `FIXED IN TREE (needs deploy)`

`staging_cv_generating`, `staging_cover_letter_generating`, `staging_ready`, `submitting`,
`verification` — all in the enum, none written by any code. Staging was one opaque jump and the whole
Playwright run collapsed into a single `form_detected`, which is why the progress UI had nothing to show.

Fixed by `src/lib/applications/progress-reporter.ts`, called from
`src/lib/services/journeyDocumentService.ts` (3 staging substeps) and
`src/lib/services/unifiedApplyService.ts` (the Greenhouse / Lever / Ashby / Workable handlers).

**⚠️ Requires a worker rebuild + redeploy to take effect** — the submission side runs in the worker image.

### SB-13 · Stall threshold equalled the cron interval · `FIXED IN TREE`

`QUEUE_STALL_SECONDS` was 5 minutes while `src/app/api/cron/auto-apply/route.ts:26` recommends
`*/5 * * * *` — so on a cron-only deployment a **healthy** row could wait a full interval and be flagged
stalled. A false positive by construction. Now 15 minutes (three missed ticks); the signal is
operator-only, so reporting it later costs nothing. **If you change the cron cadence, change this with it.**

### SB-14 · Sanitiser word list too narrow · `FIXED IN TREE`

The first `sanitizeReason()` omitted `ats`, `automation`, `engine` and the ATS vendor names, so
`ATS type "adzuna" is not automatable. Manual submission required.` reached customers. Found by feeding the
sweep the **real** producer strings instead of invented ones — the guard regex was also narrower than the
sanitiser's, which is why it had passed. Both lists are now aligned and the guard is documented as
requiring a **superset** of the sanitiser's.

---

## 7. Open questions for you

1. **What is the cron cadence on the VPS?** It sets `QUEUE_STALL_SECONDS` (SB-13) and the batch size
   (`AUTO_APPLY_CRON_BATCH`, default 5, max 20 — browser automation is heavy).
2. **Is `WORKER_ROLE` set on the web service?** If not, the loops run in the web container and die on every
   redeploy (SB-01).
3. **Is `CRON_SECRET` set?** If not, *no* scheduled work runs anywhere (SB-02).
4. **Is Workday intended to be supported?** (SB-04)
5. **How many app replicas?** >1 turns SB-07 from a note into a bug.
6. **Should `docs/` be version-controlled?** The `.gitignore` comment says yes; the rule says no. 3 files
   are currently invisible, one of them mandated by `AGENTS.md` §53/54 (SB-15).

---

## 8. Change log

| Date | Change |
| --- | --- |
| 2026-09-26 | Register opened. SB-12 … SB-14 fixed app-side in the working tree. SB-03/04/05 identified. SB-01/02 documented as the P0 pair. SB-15 found while creating this file; narrow `.gitignore` exception added. |
