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

### SB-01 · The application queue has no drainer in production · `NOT THE CAUSE — closed 2026-09-27`

**Closed by measurement, not by a fix.** SSH access was restored and the queue *is* being drained:

| Evidence | Value |
| --- | --- |
| `ApplicationQueue` by status | `completed: 48`, `dead_letter: 4`, `failed: 1`, **`queued: 0`, `processing: 0`** |
| Newest completion | `2026-09-27T14:21:11Z` — the row behind the user's "Apply manually" screenshot |
| `buildairesume-worker-daemon` `/api/health` | `{"role":"all","loops":["email","emailIngestion","applicationQueue","reconciliation"]}` |

So the drainer runs. The applications were parking **after** the drain, not before it — see SB-03, SB-04,
SB-05 and SB-16 below. `WORKER_ROLE=web` **is** correctly set on the web service, and the worker runs the
loops with `WORKER_ROLE` unset (→ `all`), which is the documented single-container behaviour.

**What is still wrong here — SB-01b below.** The drainer works but it is the *wrong image*.

---

### SB-01b · The worker service runs the **web** image, and Dokploy does not manage it · `FIXED FOR THIS DEPLOY 2026-09-27 — still needs a decision`

**Which process actually drains the queue — measured, not inferred.** Two candidates run the drain path, and
the answer decides what "deployed" has to mean:

| Process | Role | `applicationQueue` loop | Cron endpoint |
| --- | --- | --- | --- |
| `buildairesume-worker-daemon` | `all` (`WORKER_ROLE` unset) | **yes** — 10 s poll | not published |
| `buildairesume-app-vmvp35` | `web` (`WORKER_ROLE=web`) | no | **yes** — `*:3001->3000`, cron every 5 min |

Evidence that the **worker-daemon's poll loop** is the one doing the work, not the cron:

- `POST /api/cron/auto-apply` fires every 5 min (`/etc/cron.d/buildairesume` job #2) and
  `/var/log/buildairesume/auto-apply.log` holds **245 consecutive runs with `processedCount: 0`** — it never
  claims anything, because the loop has already taken it. (`skipped: "items remaining are handled by the
  next run"` is a constant in the response, not a rate-limit signal.)
- The newest queue item was created `14:21:08.421Z` and completed `14:21:11.729Z` — **3.3 s later**, landing
  *between* cron ticks (`14:20:03` → `14:25:01`). Only a 10 s poll loop explains that.
- `/api/jobs/auto-apply` does **not** process inline — it only writes `status: 'queued'`.
- The ~40 items that completed at `09-26 09:33–09:34` likewise appear nowhere in the cron log.

So the worker-daemon is not a redundant bystander: **it is the primary drainer.** Before this deploy it was
running **09-25 code with all four auto-apply bugs live** — the direct cause of the user-visible
"Apply manually" rows.

**Deployed 2026-09-27.** Both tiers were force-recreated onto image `029e44d7f146` (built from `aa1ce364`):

```
buildairesume-app-vmvp35     task started 2026-09-27T15:31:46Z   img=029e44d7f146
buildairesume-worker-daemon  task started 2026-09-27T15:32:52Z   img=029e44d7f146
worker /api/health -> {"role":"all","loops":["email","emailIngestion","applicationQueue","reconciliation"]}
app    /api/health -> {"role":"web","loops":[]}
```

The worker had been pinned to `40688b8ab49e` since **09-25** — 45 h stale — and its stdout held only **22
lines** for that whole period, last activity `09-26T09:19:29Z`. A silent success path (the structured logger
does not write these to stdout) is why it *looked* idle while it was in fact the only thing submitting.

`buildairesume-worker-daemon` and `buildairesume-app-vmvp35` are two Swarm services pointing at the **same
tag** (`buildairesume-app-vmvp35:latest`), but Dokploy only knows about the second one.

```
NAME                          MODE        REPLICAS  IMAGE
buildairesume-app-vmvp35      replicated  1/1       buildairesume-app-vmvp35:latest   *:3001->3000/tcp
buildairesume-worker-daemon   replicated  1/1       buildairesume-app-vmvp35:latest   (no ports)
```

The Dokploy build never passes `--target`, and `runner` is the Dockerfile default, so the tag holds the
**web** image. Verified inside the running worker container: `ls /app/dist` → *No such file or directory* —
the `dist/worker.mjs` bundle that `--target worker` produces is not there. The service therefore runs
`npm run start` (`next start`, `PORT=3009`) with `WORKER_ROLE` unset, i.e. **a second Next.js server whose
only purpose is to host the background loops.**

Consequences:

1. **It goes stale silently.** The service has empty Swarm labels, no `applicationId`, and no Dokploy row
   (`command: null`, `args: null`). Dokploy updates the *app* service on deploy and never touches this one,
   so the worker keeps running whatever image was current when it was created. Measured 2026-09-27: the
   app was on `52e2d00188c6` (09-26) while the worker was still on `40688b8ab49e` (**09-25, 44 h old**) —
   which is why the worker's logs still showed the pre-fix Greenhouse failures.
2. **Every deploy must be followed by a manual `docker service update --force`** or the worker runs the
   previous release. Nothing in the pipeline enforces this.

**Fix direction (preferred).** Dokploy's `application` table has a `dockerBuildStage` column, so the worker
should be its own Dokploy application over the same repo with `dockerBuildStage: worker` and
`WORKER_ROLE: worker` — then it builds from the worker target, deploys with the app, and drops the
redundant Next.js server. Until then the stop-gap is:

```bash
ssh amloh@192.168.1.8 'docker service update --force --image buildairesume-app-vmvp35:latest buildairesume-worker-daemon'
```

**Do not "fix" this by setting `WORKER_ROLE=worker` on the existing daemon** — with the *web* image that
flips `instrumentation.ts` to "loops run in the worker service" and stops every loop in the process that
is actually running them. That would turn SB-01b into a real P0.

**Verify (done 2026-09-27).** `docker service ps buildairesume-worker-daemon` shows a task created *after*
the newest `docker images … buildairesume-app-vmvp35:latest` timestamp, and its `/api/health` still lists
`applicationQueue` in `loops`. Both hold: task `15:32:52Z` vs image `15:28:32Z`, loops intact. The worker
container's `/app/.next` also greps clean for `resolveResumeAttachment`, `stageEntry` and
`resolveGreenhouseNavigationUrl`, so it is genuinely the new build and not a re-tagged old one.

**Reference — the two drain paths, and what gates them.** `src/workers/roles.ts:47-51`:

```ts
all:    { email: true,  emailIngestion: true,  applicationQueue: true,  reconciliation: true }
worker: { email: true,  emailIngestion: true,  applicationQueue: true,  reconciliation: true }
web:    { email: false, emailIngestion: false, applicationQueue: false, reconciliation: false }
```

| Path | Where | Cadence |
| --- | --- | --- |
| In-process poll loop | `src/workers/applicationWorker.ts:8` — `POLL_INTERVAL_MS = 10_000` | every 10 s |
| Cron endpoint | `src/app/api/cron/auto-apply/route.ts` | header recommends `*/5 * * * *` |

Both call the same primitives (`claimNextApplication` → `processApplication` → `completeQueueItem` /
`failQueueItem`), so there is exactly one queue and one set of transitions. Claiming is an atomic
`findOneAndUpdate`, so running both is wasteful but not corrupting.

- `WORKER_ROLE=web` on **both** services ⇒ nothing drains.
- `WORKER_ROLE` unset ⇒ `all` ⇒ the loops run in whatever process started.
- A typo (`wroker`) fails **open** to `all` and logs a `warning` — deliberately, so a typo cannot silently
  stop queue processing.

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

### SB-03 · `atsType` is the *discovery source*, not the apply target · `FIXED IN TREE + DEPLOYED 2026-09-27`

**Fixed** in `08f5af33`. `detectAtsFromUrl()` now lives in the canonical `lib/jobs/autoApplySupport.ts`
alongside `isPlaywrightAutomatable()` and is used at enqueue, falling back to the client value:

```ts
const resolvedAtsType: ATSType =
  detectAtsFromUrl(jobUrl) ?? (validAtsTypes.includes(atsType) ? atsType : 'unknown');
```

It matches host-based boards (`greenhouse.io`, `grnh.se`, `lever.co`, `ashbyhq.com`, `workable.com`,
`myworkdayjobs.com`, `myworkdaysite.com`, `naukri.com`, `indeed.`, `adzuna.`) **and** the embed parameters
employers put on their own domains (`?gh_jid=`, `?ashby_jid=`, `?lever-origins=`). Verified with
`.verify/check-ats-routing.ts` — 34 assertions over real production `applyUrl`s, 34 pass.

Measured before the fix: 42,372 of 47,054 `jobs` carry `atsType: null`, and the single most common park
reason in production was `ATS type "unknown" is not automatable. Manual submission required.`

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

### SB-04 · `workday` is declared automatable but has no handler · `FIXED IN TREE + DEPLOYED 2026-09-27`

**Fixed** in `08f5af33`. The gate in `processApplication.ts` now reads the canonical
`PLAYWRIGHT_AUTOMATABLE_ATS` (`greenhouse`, `lever`, `ashby`, `workable` — deliberately **no** `workday`)
instead of its own inline list, so the gate and the `switch` in `UnifiedApplyService.apply` can no longer
disagree. A Workday job now parks with a reason that names Workday, not the generic message.

**Original report.**

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

### SB-05 · Company-hosted ATS embeds fail form detection · `FIXED IN TREE + DEPLOYED 2026-09-27`

**Fixed** in `08f5af33` by `resolveGreenhouseNavigationUrl()` in `unifiedApplyService.ts`. The `gh_jid`
value *is* the Greenhouse job id and Greenhouse resolves the board from it, so `?gh_jid=<id>` is rewritten
to `https://boards.greenhouse.io/embed/job_app?token=<id>`, which serves the same form directly instead of
behind a cross-origin iframe.

Verified live: `boards.greenhouse.io/embed/job_app?token=8194604` → HTTP 200 → redirects to
`job-boards.greenhouse.io/embed/job_app?for=stripe&token=8194604`, 117 KB, rendering `#first_name`,
`#last_name`, `#email`, `#phone`, `#resume`, `#cover_letter` and `<button type="submit">`.

**Live confirmation of the original bug** — captured from the stale worker's logs on 2026-09-27, exactly
the two failure shapes this fix removes:

```
[greenhouse] Playwright automation unavailable: Automation error: page.goto: net::ERR_TOO_MANY_REDIRECTS
  at https://jobs.elastic.co/jobs?gh_jid=8121805&gh_jid=8121805
[greenhouse] Playwright automation unavailable: Automation error: page.goto: Timeout 30000ms exceeded.
  - navigating to "https://stripe.com/jobs/search?gh_jid=8190046", waiting until "domcontentloaded"
```

**And at the application level**, from `applicationevents` (58 `APPLICATION_REQUIRES_REVIEW` documents) — the
`reason` strings the user actually saw rendered as "Apply manually":

```
No application form detected at https://careers.airbnb.com/positions/8232474?gh_jid=8232474.
  The job may have been filled or the URL may be incorrect.
Tailored documents ready for Stripe. Automated submission unavailable
  (Automation error: page.goto: Timeout 30000ms exceeded. …)
```

Airbnb hit this twice in sequence: first `Documents prepared for Airbnb. Awaiting your approval before
submission.` (the SB-03/04 veto), then after approval the navigation failure above.

**Regression test.** `unifiedApplyService.test.ts` → *"UnifiedApplyService.apply — Greenhouse navigation URL
(SB-05)"* asserts the rewrite for the four real failing URLs (Stripe, Airbnb, the duplicated-`gh_jid` Elastic
URL, and a `&`-separated Databricks URL) **and** the two pass-through cases (a real `boards.greenhouse.io`
board, and a URL with no token). 10/10 in that file pass.

**Original report.**

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

### SB-16 · Automated submissions were sent with **no CV attached** · `FIXED IN TREE + DEPLOYED 2026-09-27`

**This is the reason the pipeline could not be trusted to submit, and the reason the guard in `08f5af33`
existed.**

All four ATS fillers accept a resume and upload it correctly —
`atsPlaywrightService.ts:236, 568, 856, 1139`:

```ts
if (resumeInput && candidateData.resumePdf && candidateData.resumeFileName) {
  const tmpFile = path.join(os.tmpdir(), candidateData.resumeFileName);
  fs.writeFileSync(tmpFile, candidateData.resumePdf);
  await resumeInput.setInputFiles(tmpFile);
}
```

But **no caller ever passed `resumePdf` or `resumeFileName`**, and `JobApplication.attachments` is written
by no code path in the repo. Measured 2026-09-27: 0 of 99 `jobapplications` have a non-empty `attachments`
array. A run that reached the submit button therefore filled the candidate's name, email and phone, clicked
submit, and delivered an application with **no resume**.

**Impact.** Worse than a park. The user believes they applied, the employer receives an empty application,
and nothing surfaces the problem — the tracker says `applied`.

**Fix** (`aa1ce364`). `resolveResumeAttachment()` resolves the tailored CV for the application
(`ApplicationJourney.jobId` holds the `JobApplication._id`, so the application id is the lookup; falls back
to the user's Master CV) and renders it through the same `PDFService` + `resolveTemplate` pair the download
route uses — so the attachment is the same PDF the user gets from "Download PDF", custom template renderer
included. Deliberately **no HTML fallback**: an HTML file is not a resume. Wired into all four handlers.

**Verify.** A completed Greenhouse run logs no `Refusing to submit without a resume attachment`, and the
submitted form's `#resume` input has a file attached (`fillAudit.totalFields` includes `resume`).

---

### SB-17 · The stage audit trail was written to a field that does not exist · `FIXED IN TREE + DEPLOYED 2026-09-27`

`JobApplication` declares `stageHistory` (`{ stage, internalStatus, changedAt, reason, source }`) and has
**no `statusHistory` path**. Mongoose's strict mode strips unknown paths from an update **silently**, so
all seven `$push: { statusHistory: … }` sites in `unifiedApplyService.ts` were no-ops — including the one
that recorded *why* an application was parked.

Measured 2026-09-27: **0 of 99** `jobapplications` carry a `statusHistory` field; 63 carry `stageHistory`,
and **49 of those have an empty array**.

**Impact.** The user sees "Apply manually" and has no way to find out which of the six park reasons fired.
It is also the same defect class as the confirmed-submission push fixed in `08f5af33` — there it lost the
reason an application was marked applied, here it loses the reason one was held.

**Fix** (`a8398319`). All seven sites now go through one `stageEntry()` helper that owns the field name,
the entry shape and the `currentStage`/`internalStatus` vocabulary. Park reasons map to real state-machine
values — `staging_ready`, `review_required`, `automation_failed` — rather than the legacy tracker-column
value `'created'`, which is not a stage.

**Verify.** `db.jobapplications.countDocuments({statusHistory:{$exists:true}})` stays 0 and the next parked
application gains a `stageHistory` entry whose `reason` names the park.

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
2. ~~**Is `WORKER_ROLE` set on the web service?**~~ **Answered 2026-09-27: yes, `WORKER_ROLE=web`.** The
   in-process loops run in `buildairesume-worker-daemon` (`role: all`) — and it, not the cron, is the
   *primary* drainer (SB-01b). But that service is the *web* image and is not Dokploy-managed.
   **Do you want it converted to a second Dokploy application with `dockerBuildStage: worker`?** Until
   that happens, every deploy needs a manual `docker service update --force` on the worker or it keeps
   running the previous release — which is exactly what happened here.
3. **Is `CRON_SECRET` set?** If not, *no* scheduled work runs anywhere (SB-02). It **is** set (64 chars) —
   but note the value is stored in cleartext in `/etc/cron.d/buildairesume` as
   `Authorization: Bearer <secret>` on every line, and it was surfaced in a shell transcript on
   2026-09-27. **Rotate it**, and prefer `CRON_SECRET` read from a root-owned env file over an inline
   literal in a world-readable cron file (`-rw-r--r--`).
4. **Is Workday intended to be supported?** (SB-04) — currently 3 of the 12 parked applications
   (syneoshealth, tiketdotcom ×2) are Workday, i.e. correctly manual.
5. **Which ATSes are actually in the user's funnel?** Paylocity and BambooHR also appeared in the parked
   set (SB-03) and have no adapter. If those boards matter, they are new-adapter work, not a bug.
6. **How many app replicas?** >1 turns SB-07 from a note into a bug.
7. **Should `docs/` be version-controlled?** The `.gitignore` comment says yes; the rule says no. 3 files
   are currently invisible, one of them mandated by `AGENTS.md` §53/54 (SB-15).

---

## 8. Change log

| Date | Change |
| --- | --- |
| 2026-09-26 | Register opened. SB-12 … SB-14 fixed app-side in the working tree. SB-03/04/05 identified. SB-01/02 documented as the P0 pair. SB-15 found while creating this file; narrow `.gitignore` exception added. |
| 2026-09-27 | SSH restored; register re-triage from the live box. **SB-01 closed as not-the-cause** (queue drains: 48 completed, 0 queued) and replaced by **SB-01b** — the worker service runs the *web* image and Dokploy does not manage it. SB-03/04/05 fixed and deployed (`08f5af33`). **SB-16** (submissions sent with no CV attached) and **SB-17** (`stageHistory` written to a non-existent `statusHistory`) found and fixed (`a8398319`, `aa1ce364`). |
| 2026-09-27 (later) | **Second deploy `3EL11R6lODg6YMZd6LP73` finished `15:31:41Z`** → image `029e44d7f146` from `aa1ce364`; app task recreated `15:31:46Z`. **SB-01b resolved for this release**: the worker-daemon was identified as the *primary* drainer (cron log: 245 runs, all `processedCount: 0`) and force-updated `15:32:52Z` onto the same digest, so it no longer runs 09-25 code. Root-cause tally confirmed against `applicationevents` — the 58 park reasons are exactly the four fixed bugs. SB-05 gained the event-level evidence + a regression test. |
