# server_bugs.md — server-side issues register

Opened 2026-09-26, from the live-application-progress work.

**2026-09-27 (later) — the register was worked end to end, with SSH restored.** SB-06, SB-07, SB-08, SB-09
and SB-15 are **fixed in the working tree**; SB-02 is *verified* rather than assumed; and two new items
(**SB-18**, **SB-19**) were found while fixing SB-06 and SB-08. **Nothing below is committed or deployed
yet** — the tree is dirty on purpose, and §8 records what each item needs to go live.

**Read §2 before trusting this file's own framing.** The register was opened on the assumption that the P0
was *"the queue has no drainer."* That assumption was wrong, and it cost a day. §2 states the correction.

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
| `role: "all"` on the web tier | The loops run inside the web container → they die on every redeploy. See SB-01b. |
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

## 2. The "nothing is being submitted" investigation — closed 2026-09-27

> **Correction, and it matters.** This section used to be titled *"P0 — nothing is being submitted"* and
> opened with SB-01, *"the application queue has no drainer in production."* **That diagnosis was wrong.**
> It was also repeated in `MEMORY.md`, which is how it survived unchallenged.
>
> Measured instead: the queue **is** drained (`completed: 48`, `queued: 0`, `processing: 0`). Applications
> were parking **after** the drain, for four independent reasons — SB-03, SB-04, SB-05 and SB-16. The real
> failure was the *combination*: the fixes were in the repo while the process actually draining the queue
> ran a **45-hour-stale image** (SB-01b). The bug and the fix coexisted, which is why "the code looks
> right" and "the user sees Apply manually" were both true.
>
> **For the next reader:** "nothing is being submitted" had five candidate causes and this register named
> the one that was not it. Measure the queue (and the *image digest* behind it) before believing the
> register.

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
  `/var/log/buildairesume/auto-apply.log` holds **264 runs, every one of them `processedCount: 0`** — it
  has never claimed anything, because the loop has already taken it. (`skipped: "items remaining are
  handled by the next run"` is a constant in the response, not a rate-limit signal.) Verified again
  2026-09-27 (later), and the count is now *more* conclusive: **not a single non-zero run in the file's
  whole history**, so the cron path is an unexercised backstop — see §7 item 4.
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

**⚠️ The two tiers agreeing on a digest is NOT evidence the problem is fixed.** They match only because
this investigation ran `docker service update --force` by hand. Verified again 2026-09-27 (later): both
services report `buildairesume-app-vmvp35:latest` and their tasks were recreated 1 min apart
(`21:01:45` / `21:02:49` IST) — but that is my force-update, not the pipeline. Dokploy still has **no row**
for `buildairesume-worker-daemon` (empty Swarm labels, no `applicationId`), so **the next deploy will
re-create the app and leave the worker on the previous image.** Until SB-01b is converted to a managed
application, every deploy needs the manual step below.

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

**⚠️ Consequence 1 was unverifiable from the admin panel — fixed 2026-09-27.** Every check above needs
SSH. The panel could report that the worker was *reachable* but never whether it was *current*, because the
worker's `/health` payload had no build identity at all — so a worker 45 h stale (exactly the state
described above) rendered identically to a fresh one.

**The first attempt at this was itself a bug of the same class.** I added a `commit` field mirroring
`/api/health` — and then measured what `/api/health` actually reports:

```
$ docker exec <app> node -e "fetch('http://127.0.0.1:3000/api/health')…"
{ "commit": "unknown" }
```

**`/api/health`'s `commit` has been `"unknown"` on every deploy it has ever served.** Nothing supplies
`GIT_COMMIT`: Dokploy's `buildArgs` column holds a static value, `.dockerignore:33` excludes `.git` so it
cannot be derived in-build, and no commit-ish variable exists among the 128 env names on the app service.
An identity field that always reads `"unknown"` **looks like a working feature** — the same "a declared
value is not a written one" defect this register keeps finding.

**What actually works — a build stamp that needs nothing passed in:**

- `Dockerfile` — `RUN date -u +%Y-%m-%dT%H:%M:%SZ > /app/.build-time`, late in both target chains so it
  does not invalidate the `npm ci` layer;
- `src/workers/health.ts` — `WorkerHealthPayload.buildTime` + `resolveBuildTime()`. `commit` is kept and
  documented as always-unknown plumbing;
- `src/app/api/health/route.ts` — reports `buildTime` beside `commit`;
- `src/app/api/admin/vps-setup/route.ts` — `workerLoop` carries `buildTime` and `buildStale`, comparing the
  worker's stamp against the **web container's own**. `VpsSetupPanel.tsx` renders a `Stale image` chip on a
  strict `true`.

`buildStale` is a **one-hour threshold, not an equality test** (the two images are built by separate
applications minutes apart), and **tri-state**: `null`, never `false`, when a stamp is missing — so "we
don't know" is not shown as "it's fine". Full reasoning: `docs/deployment/dokploy-worker-migration-plan.md`
§11.6; the check that uses it: §6 step 6.

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

### SB-02 · Cron auth fails closed — unset secret kills all scheduled work · `VERIFIED SET 2026-09-27 — closed`

**Evidence.** `src/lib/auth/cron-guard.ts:45-56`. When neither `CRON_SECRET` nor `CRON_API_KEY` is set,
every `/api/cron/*` request gets `503 CRON_NOT_CONFIGURED` and nothing runs.

This is **correct and deliberate** (`cron-guard.ts:9-25` documents the fail-open version it replaced), but
it is a silent-work-stopper if the secret was never set on the deployment: a fresh box has no scheduled
work at all and the only trace is a 503 in the scheduler log.

**Verified, not assumed (2026-09-27).** Probed with a **deliberately non-matching** bearer so no cron job
was actually run:

| Probe | Result | Reading |
| --- | --- | --- |
| no `Authorization` header | `401` | guard is armed |
| wrong bearer | `401` | secret **is** set (a `503` would mean unset) |

`/var/log/buildairesume/auto-apply.log` also holds `{"success":true,…}` 200 bodies, so the host cron file's
header matches. The header secret is 64 chars.

**⚠️ Follow-ups that are still open:**
- **The `auto-apply` cron log has gone quiet.** Its last entries are `2026-09-26T19:10`; the file has been
  silent since ~`13:40 UTC on 09-27`, while the in-process worker keeps draining (queue shows `queued: 0`).
  Consistent with SB-01b — the loop wins every race so the cron has nothing to claim — but "the log
  stopped" and "the log has nothing to report" look identical from outside. Worth confirming the cron is
  still *firing* (not just finding nothing). See §7.
- **The secret is stored in cleartext** in `/etc/cron.d/buildairesume` as `Authorization: Bearer <secret>`
  on every line, and it was surfaced in a shell transcript on 2026-09-27. **Rotate it**, and prefer
  `CRON_SECRET` read from a root-owned env file over an inline literal in a world-readable
  (`-rw-r--r--`) cron file.

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

### SB-06 · `Mixed`-typed keys silently miss rows · `FIXED IN TREE 2026-09-27`

`Schema.Types.Mixed` disables Mongoose casting, so a query with one shape silently misses documents stored
in the other. A plain `find({ applicationId: id })` returns nothing and reports no error.

**This was filed as latent — "works today, breaks under a stated condition." Measurement says it was
live, and worse than described.** Two corrections to the original framing:

1. It is not only *split* paths that break. A path where **every** stored value is a string, queried with
   an `ObjectId`, misses **every** row — and vice versa. No split is required for a total miss.
2. On an `upsert`, a wrong-shape filter is worse than a miss. `"abc"` and `ObjectId("abc")` are distinct
   keys to a `unique` index, so the upsert does not collide with the existing row — it **inserts a second
   document**.

Measured against production 2026-09-27 with `.verify/probe-mixed-types.js` (reads the app's own
`MONGODB_URI` from the running container; no credential handling):

| Collection path | Stored shapes | Verdict |
| --- | --- | --- |
| `jobapplications.userId` | objectId 84 / string 15 | **live miss** |
| `applicationqueues.userId` | string 52 / objectId 1 | **live miss** (an `ObjectId` query misses 52) |
| `coverletters.jobId` | string 56 / objectId 53 | **live miss** |
| `coverletters.journeyId` | string 56 / objectId 26 | **live miss** |
| `coverletters.cvId` | objectId 45 / string 3 | **live miss** |
| `invoices.userId` | objectId 5 / string 1 | live miss |
| `communications.jobId` / `.applicationId` | objectId 25 / string 1 | live miss |
| `applicationjourneys.userId` | string 194 / objectId 1 | `String`-typed → Mongoose casts; 1 row unreachable |
| `applicationqueues.applicationId` | objectId 53 | uniform, still **uncast** |
| `applicationqueues.jobId`, `applicationevents.jobId` | string | uniform, uncast |
| `autoapplyreservations.*` | objectId / string | uniform |
| `usersettings.userId`, `morichats.userId`, `morichats.cvId` | string | uniform |
| `paymentmethods.userId`, `portaljobsynctasks.portalConnectionId` | objectId | uniform |
| `portalconnections.userId`, `portaljobsynctasks.userId` | string | uniform |

**Rule.** Always query both shapes:

```ts
{ $in: [rawId, new mongoose.Types.ObjectId(rawId)] }
```

The canonical helper is **`src/lib/utils/mixed-id.ts`** — `mixedIdFilter(id)` for a filter, `idShapes(id)`
for the list, `hasUsableId(id)` for a guard. It is a no-op `{ $in: [raw] }` for a non-ObjectId-shaped
string (so it cannot over-match), never returns `[]` for a valid id, and is safe on an ordinary cast path
too, because Mongoose casts each `$in` element to the schema type. It is also required inside
`aggregate([{ $match }])`, where Mongoose does **not** cast at all.

**Status — swept, and the sweep was much bigger than the first pass thought.** Pre-fix, against a clean
`HEAD` checkout:

| Scanner version | Result |
| --- | --- |
| path-only discovery (first version) | `44 sites / 26 files` |
| barrel-aware discovery (current) | **`86 sites / 46 files`** |

The first version discovered files with `grep -rl '@/models/<Model>'`. A file that imports from the
**`@/models` barrel** (`import { JobApplication, User } from '@/models'`) contains no such string and was
**never opened** — 42 sites in 20 files were invisible, including `dailySummaryEmailService.ts` (11 sites),
which was a confirmed live bug. **The tool's blind spot and the bug were the same file**, which is how the
first pass "verified clean" and was wrong.

Post-fix: **`0 bare-equality query site(s) on a Mixed id path, in 0 file(s)`**.

Highest-blast-radius fixes, worth knowing about even if you never read the rest:

- `applicationAutomationActionService.ts` — three filters where a miss means a **double submission**, or a
  submission the user had just chosen to handle themselves.
- `admin/users/[id]/route.ts` — the admin "delete all user data" path used a bare `ObjectId` for
  `JobApplication.deleteMany`. **A miss leaves rows behind**, i.e. a failed deletion that reports success.
- `interview/**` (9 files) — `ObjectId.isValid(x) ? new ObjectId(x) : x` picks one shape, so a user whose
  applications were stored as strings got an **empty interview dashboard** and could not open interview prep.
- `journeyDocumentService.ts` / `stateRecoveryService.ts` — queried `CoverLetter.journeyId` and
  `Invoice.userId` with a **`.toString()`** string, missing the objectId-stored rows.
- `dailySummaryEmailService.ts` — 11 sites, on a cron that walks the whole user table (see SB-18).

**Verify.**

```bash
node .verify/scan-mixed-id-queries.mjs
```

**Do not use the old `grep -rn "applicationId:" src/ | grep -v '\$in'`.** It only looked at one field name,
only under `src/`, and could not see a filter built into a `query` variable or an id held in a variable —
it reported clean while 86 sites were live. The scanner enumerates every `Mixed` path, attributes each
bare-equality **query** to the receiver of its enclosing call (resolved through the file's own imports, so
`CV.findOne({ userId })` in a file that also imports `JobApplication` is not misreported), and excludes
tests, projections, `NextResponse.json()` bodies and already-guarded lines. **Add every new `Mixed` path to
its `MIXED_PATHS` table when you add a model.** Its remaining limits are documented at the top of the file
(namespace imports are still missed) — a `0` from it is necessary, not sufficient.

**The real fix is the data, not the guard.** Every string value measured above is a genuine 24-hex
`ObjectId`, so normalising the stores (`$toObjectId` / a one-shot migration per collection) would make the
`$in` unnecessary and the whole class impossible to reintroduce. That is a production write and needs
sign-off — see §7.

---

### SB-07 · Cron overlap lock is in-process only · `FIXED IN TREE 2026-09-27`

`src/lib/cron/runCron.ts` used to guard against overlapping runs with an in-process `Map` only:

> The lock is an **in-process** `Map` … If the app is ever scaled to multiple replicas, this must become a
> Mongo `findOneAndUpdate` lease before these routes rely on it.

**Impact when unfixed.** Correct on a single container. On ≥2 replicas, `daily-summary` can enqueue the
same emails twice and `process-campaigns` can clone the same recurring child twice. A skipped run returns
`409 CRON_ALREADY_RUNNING`.

**Fix.** The in-process `Map` stays as the fast path; a Mongo lease (`src/models/CronLock.ts`) is now the
cross-process authority. `findOneAndUpdate({ name, expiresAt: { $lte: now } }, …)` with `upsert: true` — Mongo
evaluates the filter against **pre-update** document state, so a racing loser's filter no longer matches and
its upsert hits the unique index on `name`. That `11000` collision *is* the "someone else holds it" signal,
which is why the code treats it as `held` rather than as an error.

Three deliberate properties, each of which a reviewer should not "simplify" away:

1. **The in-process slot is taken first and synchronously — before the first `await`.** That keeps the guard
   cheap for the common case and preserves the existing observable property that a caller can see the run
   as in-flight immediately after invoking it.
2. **`held` and `unavailable` are distinct outcomes.** A genuine overlap is refused (`409`); a store that
   cannot be reached is **tolerated** (the job runs). This is deliberate fail-**open** on infrastructure
   failure: a guard that cannot reach its store must not stop every scheduled job, and trading a rare
   double-send (a one-person billing system, <2 concurrent runs) for a possible total outage is the worse
   bargain. `runCron.test.ts` pins it — the unreachable case asserts `200`.
3. **`releaseLease` is scoped to `owner`,** so a run whose lease already lapsed cannot delete a successor's.

**Known limitation.** The lease is not renewed, so `CRON_LEASE_TTL_MS` (15 min) is a ceiling on a stuck
job's outage window. The `expiresAt` TTL index on `CronLock` is a *tidiness* net, not the correctness
mechanism — Mongo's TTL monitor sweeps only about once a minute, so expiry is enforced by the acquire filter.

---

### SB-08 · The server writes operator prose into `reviewReason` (a user-facing field) · `FIXED IN TREE 2026-09-27`

`reviewReason` is returned to the client and rendered. The producers wrote it for operators:

| Evidence | String |
| --- | --- |
| `processApplication.ts:45` | `Worker picked up application from queue` |
| `processApplication.ts:110` | `ATS type "${atsType}" is not automatable. Manual submission required.` |
| `processApplication.ts:129` | `ATS ${atsType} detected. Playwright automation ready.` |
| `processApplication.ts:234` | `Automation failed: ${applyResult.message}` |
| `processApplication.ts:255` | `Worker error: ${err.message}` |
| `unifiedApplyService.ts:1308` | `… Automated submission unavailable (${detail}). Please submit manually.` |

**App-side mitigation was already shipped** (`sanitizeReason()` in `src/lib/applications/live-progress.ts`
drops anything with operator vocabulary, a snake_case token, a URL, >180 chars, or that is not a sentence —
the curated copy then wins). Two real leaks were found and closed on 2026-09-26:
`ATS type "adzuna" is not automatable…` and `Decision engine returned "skip"…`.

**The live leak was worse than the six rows above.** Reading the producers turned up two more the register
had missed, and one of them was the actual user-visible defect:

- `unifiedApplyService.ts`'s `automationUnavailable()` interpolated a **raw Playwright error** into
  user-facing copy — the exact strings `sanitizeReason()` had to catch after the fact.
- `applicationWorker.ts:76` put a raw `err.message` in the **notification body**.
- `processApplication.ts`'s returned `message` becomes that notification body, and carried `err.message`.
- Four CAPTCHA branches (greenhouse / lever / ashby / workable) wrote vendor detail into the user message.

**Fix — the channel split, not more filtering.** `reason` is customer-facing; `operatorReason` is
ops-only. The state machine now writes both (`stageHistory[].operatorReason`,
`ApplicationEvent.metadata.operatorReason`), and every producer was split:

| Site | `reason` (customer) | `operatorReason` |
| --- | --- | --- |
| processing transition | `'Your AI agent picked this up and started preparing your application.'` | `'Worker picked up application from queue'` |
| `manual` mode | `'This application is set to be applied for manually, so we have not submitted it. …'` | `'Execution mode is "manual": automation is not permitted for this application.'` |
| `skip` mode | `'We have not submitted this application. Apply on the employer's site to finish it.'` | `'Decision engine returned "skip": this application must not be automated.'` |
| form found | `'We found the application form and are filling in your details.'` | `` `ATS ${atsType} detected. Playwright automation ready.` `` |
| submitted | `'Your application was submitted successfully.'` | `` `Successfully submitted via ${atsType}` `` |
| `action_required` | `applyResult.message` | `applyResult.operatorDetail` |
| failed | `'We could not submit this application automatically. Please apply on the employer's site.'` | `applyResult.operatorDetail \|\| applyResult.message` |
| catch | `'Something went wrong while preparing this application. …'` | `` `Worker error: ${err.message}` `` |

`operatorReason` had to be **declared on the `JobApplication` schema**, not just written — Mongoose's
`strict` mode strips unknown paths from an update silently, which is precisely the SB-17 defect. Adding it
to the state machine without adding it to the model would have reproduced SB-17 exactly: the split would
look implemented and record nothing.

**Result:** `sanitizeReason()` is now a filter with nothing left to catch. Three tests that encoded the old
behaviour were rewritten to assert the **split** instead of the old string (`applicationWorker.test.ts`,
`processApplication.test.ts`, `applicationAutomationActionService.test.ts`) — see the note in §8 about tests
encoding defects.

---

### SB-09 · `applyToAdzuna` is unreachable dead code · `FIXED IN TREE 2026-09-27`

`unifiedApplyService.ts:1244` was a stub returning `action_required`, and it could not be reached:
`'adzuna'` is not in `isAutomatable` (`processApplication.ts:99`), there is no adzuna auto-apply route
(`find src/app/api -ipath "*adzuna*"` → nothing), and the only caller was the switch case itself.

**Fixed** by deleting the stub and replacing `case 'adzuna':` with a comment that falls through to
`default:`. Leaving it in place made the ATS support surface look larger than it is.

---

### SB-15 · The blanket `*.md` gitignore silently drops new documentation · `FIXED IN TREE 2026-09-27`

Found while creating *this file* — it was invisible to `git status` the moment it was written.

`.gitignore` carried a comment that read:

> The blanket `*.md` ignore previously swallowed the entire `docs/` tree — 54 documents were never
> committed because of it.

…followed by `*.md` and a single exception, `!AGENTS.md`. **The rule described as fixed was never actually
fixed.** Ignore rules do not affect already-tracked files, which is why this looked resolved: `docs/*.md`
were force-added or added before the rule, so most of them are tracked and nobody noticed the rule still
firing on anything *new*.

**Fix applied (policy inverted, as the comment always intended).**

```gitignore
# Policy: `*.md` guards against stray scratch notes at the repo root; `docs/` is tracked in
# full; the repo-mandated root documents are named explicitly. Note that ignore rules do not
# apply to already-tracked files, which is exactly why the old rule looked harmless.
*.md
!AGENTS.md
!server_bugs.md
!refactor_audit.md
!/docs/**
# The `!/docs/**` negation above re-includes *everything* under docs/, including the OS metadata
# the earlier `.DS_Store` rule would otherwise have caught. Later rules win, so re-assert it here.
**/.DS_Store
```

**Measured 2026-09-27:** `docs/*.md` tracked **87**, on disk **89** — **2** files were being silently
dropped:

- `docs/application-automation/application-flow.md` — **`AGENTS.md` §53/54 requires maintaining
  `docs/application-automation/`.** A doc the repo mandates was not in version control.
- `docs/auto-apply/task-rate-limits-paywall.md`

Both now resolve to the `!/docs/**` negation (`git check-ignore -v` → `.gitignore:75:!/docs/**`) and appear
as ordinary untracked files, i.e. they are *visible* to git and await a `git add`.

**⚠️ Two corrections to this item's own history.**
1. The original report said **3** files were invisible. The third,
   `docs/CVCircle Editor Deep Audit — Steps 1-5.md`, **is tracked** — the count was wrong. The `comm`
   command below reported it as untracked because `git ls-files` octal-escapes non-ASCII paths by default
   (the em-dash), so its output never string-matched `find`'s. Use `git -c core.quotePath=false ls-files`.
2. The original verify command was therefore unreliable for any filename with a non-ASCII character.

**Verify.**

```bash
git check-ignore -v <new>.md                       # → a `!` negation rule, or nothing. Never `*.md`.
git -c core.quotePath=false ls-files docs/ | wc -l # compare against: find docs -name '*.md' | wc -l
```

---

### SB-18 · The daily-summary "jobs applied today" count was measuring the wrong field · `FIXED IN TREE 2026-09-27`

Found while fixing SB-06 in `dailySummaryEmailService.ts` — the SB-06 sweep led into this, and it is the
more user-visible of the two.

The count was built from `statusHistory`, which is the **SB-17 non-existent path**:

```ts
$or: [
  { statusHistory: { $elemMatch: { status: 'applied', changedAt: { $gte, $lte } } } },  // dead
  { status: 'applied', statusHistory: { $exists: false }, updatedAt: { $gte, $lte } },  // tautology
]
```

Two independent defects, one masking the other:

- **The first branch was dead.** `statusHistory` never exists on any document, so `$elemMatch` over it
  matches nothing.
- **The second branch was a tautology.** `statusHistory: { $exists: false }` excludes nothing — the field
  never exists — so the branch reduced to `status === 'applied' && updatedAt in today`.

So the number silently degraded to *"applications that are `applied` and were last touched today"*, which
is a different quantity: an application applied for today but edited tomorrow leaves the count, and one
applied for last week but edited today enters it.

Measured against production, which is what identified the correct field:

| Fact | Value |
| --- | --- |
| `applied` rows carrying `appliedAt` | 9 of 11 |
| rows carrying `appliedAt` **without** `status === 'applied'` | 8 |
| rows where `stageHistory` records `applied` | **0** — it only ever holds processing / review_required / saved / form_detected / automation_failed / queued |

**Fix.** Count on `appliedAt`, which is authoritative — it is written by both terminal paths
(`processApplication.ts:225`, `unifiedApplyService.ts:479`) and is already the field `streak` and
`entitlement-service` treat as the source of truth. The dead branch was deleted, and a `stageHistory`
`$elemMatch` plus a small no-`appliedAt` legacy fallback were added for rows that predate the field.

**Verify.** For a user with a known `appliedAt` timestamp, the summary's `jobsApplied` changes when the
`appliedAt` date moves, and does **not** change when only `updatedAt` moves.

---

### SB-19 · Six `countDocuments` per user, computed and discarded · `FIXED IN TREE 2026-09-27`

Same function as SB-18. `getUserDailySummary()` ran six `countDocuments` — one per tracker status
(`saved`, `created`, `applied`, `interview`, `offer`, `rejected`) — assembled them into a `jobsByStatus`
object, and **returned it to nobody**: no caller read the field.

It ran on the daily-summary cron, which walks the **whole user table**, so the cost scaled with the user
base while the value was exactly zero.

**Fix.** The interface field and the six queries were deleted. If a status breakdown is wanted later, it
belongs in an aggregation, not six round-trips per user per day.

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

**The cron lease failing open when its store is unreachable** — see SB-07. Deliberate.

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
requiring a **superset** of the sanitiser's. (Superseded in practice by SB-08: with the channel split there
is nothing left for the sanitiser to catch.)

---

### SB-20 · The apply URL never reaches the detector — 42,338 jobs carry it in a field nothing reads · `FIXED IN TREE 2026-09-27`

**The largest single cause of "most jobs come in as manual apply", and it is not an ATS problem.**

SB-03 established that the **apply URL** — not the discovery source — decides routing, and
`detectAtsFromUrl()` was written to be the authority. It is correct, and it already resolves `workday`.
It is simply **never given the URL** for 87 % of the corpus.

Measured on production:

| Probe | Value |
| --- | --- |
| `jobs` total | 48,812 |
| `jobs` from `source.primary: 'feashliaa'` | **42,338 (86.7 %)** |
| …with `source.applicationUrl` populated | **42,338 (100 %)** |
| …with `jobs.applyUrl` populated | **0 (0 %)** |

The chain, with the line that breaks it:

```
feashliaa job   jobs.applyUrl = ""                                    ← always empty
                jobs.source.applicationUrl = "https://saxobank.wd3.myworkdayjobs.com/…"

GET /api/jobs/discover
    discover/route.ts:680,802   applyUrl: candidate.applyUrl          ← forwards the EMPTY field
    discover/route.ts:923,933   applyUrl || source.applicationUrl     ← the fallback EXISTS, but only
                                                                        inside the saved-jobs filter,
                                                                        so it is computed then discarded

client posts back
    JobsDashboard.tsx:937          jobUrl: job.applyUrl
    TopJobMatchesSection.tsx:483   jobUrl: targetJob.applyUrl
    JobSidebar.tsx:1625            jobUrl: job.jobUrl || ''

POST /api/jobs/auto-apply
    route.ts:78   detectAtsFromUrl('') → null
                  → falls back to the client's aggregator `atsType` → not in `validAtsTypes` → 'unknown'

JobApplication.atsType = 'unknown' → isPlaywrightAutomatable('unknown') → false
    → parked: "ATS type \"unknown\" is not automatable. Manual submission required."
```

**Corroborated by the data:** `jobapplications.atsType` is greenhouse 57, **`unknown` 27**, ashby 7,
null 5, lever 1, workable 1, naukri 1. `unknown` is the **second-largest bucket**, and **no `workday`
row has ever existed** — even though 25,584 Workday jobs are sitting in `jobs`.

**What the same field reveals about the ATS mix** (all of it currently invisible to routing):

| ATS in `source.applicationUrl` | jobs | today |
| --- | --- | --- |
| **workday** | **25,584** | detected, gated off, no handler |
| **icims** | **4,442** | not detected, no handler |
| **paylocity** | **2,524** | not detected, no handler |
| **bamboohr** | **1,733** | not detected, no handler |
| greenhouse | 5,406 | **already automatable** |
| lever | 1,652 | **already automatable** |
| ashby | 997 | **already automatable** |
| | **42,338** | 16,754 + 25,584 — the arithmetic closes |

**Fix direction.** Resolve the URL **server-side** in `POST /api/jobs/auto-apply` from `jobId`, rather
than trusting a client-supplied string — a client cannot be the authority on a security-relevant
routing decision, and this is the third appearance of this class. Minimum fix: one expression in
`discover/route.ts`'s response mapping (`applyUrl || source?.applicationUrl || ''`), which the same
file already computes 250 lines earlier.

**Effect of the fix alone, with no new adapter: 8,055 jobs become auto-appliable**
(greenhouse 5,406 + lever 1,652 + ashby 997).

**Full analysis, per-platform difficulty and the recommended sequence:**
`docs/ats-coverage-and-adapter-scoping.md`.

**Fix (in tree 2026-09-27).**

1. **One resolver, one home.** `resolveApplyUrl(job)` in `lib/jobs/autoApplySupport.ts` returns
   `applyUrl || source.applicationUrl`, trimmed. It replaces four hand-written copies: two identical
   response mappings in `discover/route.ts` (`:682`, `:806`), the saved-jobs filter (`:927`, `:937`) —
   which was the *only* place the fallback existed — and the enqueue route.
2. **Resolved server-side.** `POST /api/jobs/auto-apply` no longer trusts the client's `jobUrl`. It loads
   the listing by `jobId` (`findListingForApply`, native driver via `Job.findById(...).lean()`) and
   resolves from that. The client value survives only as a fallback for jobs with no listing — manual and
   browser-extension entries. **A client cannot be the authority on a routing decision**, and this is the
   third appearance of that class.
3. **Persisted, not just resolved.** The worker navigates to the *stored* `jobApplication.jobUrl`
   (`processApplication.ts:176`), so the resolved URL is written on create. An existing application whose
   `jobUrl` is empty and whose `atsType` is `'unknown'` is **repaired in place** on the next enqueue —
   fill-in only, never overwriting a URL or downgrading a resolved ATS, so the 27 already-parked rows can
   recover instead of staying parked forever.

**Verified against the real corpus, with the real functions** (`.verify/check-apply-url-resolution.ts`,
bundled with esbuild and run inside the app container against `MONGODB_URI`; read-only):

| | |
| --- | --- |
| jobs iterated | **48,812** (all of them) |
| resolved to `(none)` **before** | 44,313 |
| resolved to `(none)` **after** | **9,182** |
| documents whose answer changed | 35,131 |
| **newly auto-applyable (the unlock)** | **9,481** — greenhouse 6,598 · lever 1,703 · ashby 1,099 · workable 81 |
| **regressions** (already resolved, now different) | **0** |

After the fix the distribution is workday 25,584 · greenhouse 10,869 · lever 1,825 · ashby 1,168 · indeed
103 · workable 81. The unlock is **higher than the 8,055 arithmetic estimate** in the scoping doc, because
the same empty-`applyUrl` defect also affected greenhouse/lever/ashby jobs from sources other than
`feashliaa`.

### SB-21 · `isAutoApplySupported()` threw on the object-shaped `source` · `FIXED IN TREE 2026-09-27`

Found while fixing SB-20, in the same filter, and caused by the same field confusion.

`isAutoApplySupported` / `isPlaywrightAutomatable` were typed `string | undefined | null` and did
`value.trim()` with no runtime guard. But `discover/route.ts:919` calls them as
`isAutoApplySupported(job.atsType || (job as any).source || '')` — and for a `feashliaa` job `atsType` is
`null` while `source` is an **object**, so the object went into `.trim()` and threw a `TypeError`.

**Why it was reachable:** `discover/route.ts` has two paths. The Mongo-filter path applies `easyApplyOnly`
at the database level (`:611`), but the `retrieveCandidates` path (`:756`) has **no** such filter — its only
`easyApplyOnly` handling is the in-memory filter at `:917`. A `feashliaa` job (`atsType: null`, `source`
object) reaching that filter therefore threw, turning
`GET /api/jobs/discover?easyApplyOnly=true` into a 500.

**Fix.** Both predicates now take `unknown` and normalise through `normalizeAtsInput()`: a string is
trimmed and lowercased; an object contributes its `primary` field — the same field the DB-level filter
already matches on (`'source.primary': { $in: … }` at `:614`), so the two filters now agree; anything else
is `''`. A yes/no predicate must not be able to fail an endpoint because a caller passed the wrong shape.

**Root cause worth naming:** `Job.ts:301` declares `source` as `String` with a five-value enum, but the
ingestion service stores an **object** there for 42,338 documents. That schema drift is what let both
SB-20 and SB-21 hide — every consumer that trusted the declared type was wrong about the data.

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
3. **`CRON_SECRET` is set** (64 chars) — SB-02 is closed. But it is stored in cleartext in
   `/etc/cron.d/buildairesume` and was surfaced in a shell transcript on 2026-09-27. **Rotate it.**
4. ~~**NEW — why has the `auto-apply` cron log gone quiet?**~~ **ANSWERED 2026-09-27 — it never went
   quiet, and my own report of it was wrong.** The file has **no newline characters** (`wc -l` → `0`), so
   `head -1` and `tail -1` both return the *entire* file — I read the **first** timestamp in it
   (`2026-09-26T19:10`) and mistook it for the last. Measured properly: the cron is firing every 5 min,
   most recently `2026-09-27T17:05:01Z`, 33 s before the check.
   **What *is* true, and is now stronger evidence for SB-01b:** the log holds **264 runs, all
   `processedCount: 0` — not one has ever processed anything.** So the cron is a **backstop that has never
   once been exercised.** The worker's 10 s loop wins every race, which is fine until it doesn't: if the
   loop ever dies, the cron path becomes the only drainer and it has zero production history. Worth a
   deliberate test rather than a discovery during an incident.
   **Gotcha to remember:** a single-line log file makes `head`/`tail` meaningless. Count entries with
   `grep -oE '"timestamp":"[^"]+"' | tail -1`.
5. ~~**Should the `Mixed` id stores be normalised?**~~ **ANSWERED 2026-09-27 — no, and the proposal was
   wrong.** Every string value measured in SB-06 *is* a genuine 24-hex `ObjectId`, which is why a bulk
   rewrite looked safe — but the shapes are **per-path consistent with the writers**, not corruption.
   `ApplicationQueue.create()` passes `userId`/`jobId` as **string** and `applicationId` as **ObjectId**;
   `JobApplication.create()` passes `userId: userObjId` (**ObjectId**) everywhere except the naukri and
   indeed routes (**string** — which are exactly the 15 string rows of 99). A bulk rewrite to `objectId`
   therefore **fights the writers** and the drift returns on the next submission. `ApplicationQueue.jobId`
   is the *external* job id and is not always a 24-hex ObjectId, so canonicalising it is not merely
   useless but wrong. **The correct fix is at the writer** (make the two minority routes pass an ObjectId)
   **and keep `mixedIdFilter` on reads permanently.** Secondary reason it cannot precede a deploy: the
   worker still runs pre-`47d46c30` code, whose raw-equality reads would go from partial to *total* misses
   (e.g. `journeyDocumentService` querying `CoverLetter.journeyId` with `.toString()`). See
   `docs/deployment/dokploy-worker-migration-plan.md` §10.
6. ~~**Is Workday intended to be supported?**~~ **ANSWERED 2026-09-27 — there are 25,584 Workday jobs
   already in the corpus** (52 % of all `jobs`), all invisible to routing because of SB-20. This is no
   longer a 3-application edge case. The blocker is a **product decision**, not code: most Workday tenants
   require account creation with email verification before the form is reachable, which unattended
   automation cannot complete. Decide that before any Workday handler is written.
7. ~~**Which ATSes are actually in the user's funnel?**~~ **ANSWERED 2026-09-27 — measured.** Paylocity
   **2,524** and BambooHR **1,733** are real and both lack a detector and a handler. **iCIMS is 4,442 —
   larger than the two of them combined and was never mentioned.** In total **34,283 jobs (70 % of the
   corpus)** need a new adapter or a gate change. Sequence and difficulty in
   `docs/ats-coverage-and-adapter-scoping.md`.
8. **How many app replicas?** >1 is now *handled* (SB-07), but the lease is worth knowing about when you
   size the deployment.
9. ~~**Should `docs/` be version-controlled?**~~ **Answered 2026-09-27: yes** — the policy is inverted
   (SB-15). `docs/` is tracked in full; the 2 remaining files need a `git add`.

---

## 8. Change log

| Date | Change |
| --- | --- |
| 2026-09-26 | Register opened. SB-12 … SB-14 fixed app-side in the working tree. SB-03/04/05 identified. SB-01/02 documented as the P0 pair. SB-15 found while creating this file; narrow `.gitignore` exception added. |
| 2026-09-27 | SSH restored; register re-triage from the live box. **SB-01 closed as not-the-cause** (queue drains: 48 completed, 0 queued) and replaced by **SB-01b** — the worker service runs the *web* image and Dokploy does not manage it. SB-03/04/05 fixed and deployed (`08f5af33`). **SB-16** (submissions sent with no CV attached) and **SB-17** (`stageHistory` written to a non-existent `statusHistory`) found and fixed (`a8398319`, `aa1ce364`). |
| 2026-09-27 (later) | **Second deploy `3EL11R6lODg6YMZd6LP73` finished `15:31:41Z`** → image `029e44d7f146` from `aa1ce364`; app task recreated `15:31:46Z`. **SB-01b resolved for this release**: the worker-daemon was identified as the *primary* drainer (cron log: 245 runs, all `processedCount: 0`) and force-updated `15:32:52Z` onto the same digest, so it no longer runs 09-25 code. Root-cause tally confirmed against `applicationevents` — the 58 park reasons are exactly the four fixed bugs. SB-05 gained the event-level evidence + a regression test. |
| 2026-09-27 (final pass) | **Register worked end to end; nothing committed or deployed.** **SB-09** (dead `applyToAdzuna` deleted) and **SB-15** (`.gitignore` policy inverted; the "3 untracked" count corrected to 2) closed. **SB-08** fixed by the `reason`/`operatorReason` channel split across the state machine, `processApplication`, `applicationWorker` and `unifiedApplyService` — the live leak was `automationUnavailable()` interpolating a raw Playwright error, which the register had missed. **SB-07** fixed with a Mongo lease (`CronLock`) plus a documented fail-open path. **SB-06** swept: **86 sites / 46 files → 0**, after fixing the scanner's barrel-import blind spot (the first pass reported 44 and was wrong — the tool could not open the very file that was the known bug). **SB-02** verified by probe (401, not 503) rather than assumed. **SB-18** (daily-summary counted `statusHistory`, a path that never exists — now `appliedAt`) and **SB-19** (six discarded `countDocuments` per user, deleted) found and fixed along the way. Full suite: `670 passed | 5 failed`, exactly the documented pre-existing set. `tsc -p tsconfig.pipeline.json` clean. |
| 2026-09-27 (shipped) | Committed `47d46c30` (66 files) and deployed by the operator. **§7 item 4 resolved — and this register's own earlier claim about it was wrong**: the `auto-apply` cron log was never quiet; it is a single-line file (no newlines), so `head`/`tail` both returned the whole file and the *first* timestamp was misread as the last. The cron fires every 5 min (last `17:05:01Z`), and **all 264 runs have `processedCount: 0`** — it is an unexercised backstop, which is the real risk. |
| 2026-09-27 (coverage pass) | **SB-20 opened** — the apply URL never reaches `detectAtsFromUrl` for 42,338 jobs (87 % of the corpus), which is the largest single cause of manual-apply parking and is **not** an ATS problem. Measured the real ATS mix behind `source.applicationUrl`: workday 25,584 · icims 4,442 · paylocity 2,524 · bamboohr 1,733 · greenhouse 5,406 · lever 1,652 · ashby 997. **§7 items 5–7 answered**: the `Mixed` normalisation is **withdrawn** (it fights the writers — see the migration plan §10), Workday is a **product decision** at 52 % of the corpus, and iCIMS turns out to be the biggest unmentioned platform. Full scoping in `docs/ats-coverage-and-adapter-scoping.md`. Also confirmed SB-01b on the running container: the worker still executes `029e44d7f146` (started `15:32:52Z`) with **no `/app/dist/worker.mjs`**, while the app image is `36ace7eb4437` (22:47 IST). |
| 2026-09-27 (SB-20 fixed) | **SB-20 and SB-21 fixed in tree.** `resolveApplyUrl()` added as the single resolver (`lib/jobs/autoApplySupport.ts`), replacing four hand-written copies; `POST /api/jobs/auto-apply` now resolves from the listing server-side instead of trusting the client, persists the URL (the worker navigates to `jobApplication.jobUrl`), and **repairs** existing rows still parked as `unknown`. Verified against all 48,812 production documents with the real functions: **9,481 jobs newly auto-applyable, 0 regressions.** **SB-21 found in the same filter** — `isAutoApplySupported()` called `.trim()` on the object-shaped `source` and threw a `TypeError`, making `GET /api/jobs/discover?easyApplyOnly=true` a 500 on the `retrieveCandidates` path (which has no DB-level `easyApplyOnly` filter). Both predicates are now total. Root cause named: **`Job.ts:301` declares `source` as `String` while 42,338 documents store an object.** |
| 2026-09-27 (Dokploy prep) | **Dockerfile split into `source → {builder, worker-bundle}`**, so `--target worker` no longer runs the Next.js build and discards it. Required before a second Dokploy application can exist: Dokploy runs `cleanCache = t`, so two applications share no layers and the worker target would otherwise pay for the 4 GB-heap build a second time on a 4-core / 7 GB box. Verified with `.next` moved aside — `npm run build:worker` still emits `dist/worker.mjs` (945 KB, externals verified), and the only `next` specifiers in the bundle are four `next-auth/providers/*` imports, no Next.js runtime. **Worker build identity added** — and the first attempt (`commit`, mirroring `/api/health`) was **inert**: `/api/health` has reported `"commit":"unknown"` on every deploy, because nothing supplies `GIT_COMMIT` (static `buildArgs`, `.git` excluded, no runtime variable). Replaced with a `date`-stamped `/app/.build-time`, surfaced as `workerLoop.buildTime` + `buildStale` (one-hour threshold, tri-state). See SB-01b. **`src/workers/**`, the `vps-setup` route, the `health` route and `VpsSetupPanel.tsx` added to `tsconfig.pipeline.json`**, closing the coverage caveat below. Verified: `tsc -p tsconfig.pipeline.json` exit 0 with all 13 files confirmed as config roots via `--listFiles`; `docker buildx build --check` against the real VPS build context = **"Check complete, no warnings found"** for both the `worker` and default targets; `date -u +%Y-%m-%dT%H:%M:%SZ` confirmed working in `node:22-bookworm-slim`; `vitest run` = `681 passed | 5 failed` — the same documented pre-existing set, no new failures. |

---

## Appendix — verification state at the end of the 2026-09-27 final pass

| Check | Result |
| --- | --- |
| `node .verify/scan-mixed-id-queries.mjs` | `0` sites / `0` files (was `86` / `46`) |
| `npx tsc -p tsconfig.pipeline.json --noEmit` | exit 0, no output |
| `npx vitest run` | `670 passed | 5 failed | 31 skipped` — the 5 are the documented pre-existing set (`applicationWorker` correlation ×2, `pdfService`/`docxService` import ×3) |
| Committed | yes — `47d46c30` |
| Deployed | **in progress 2026-09-27 22:34 IST** (Dokploy deployment `MNlCTbzlugu1shoWHfhP6`). **SB-01b applies: this deploy updates the app tier only.** The worker keeps the previous image until someone runs the manual `service update --force` — verified after the deploy that both services were still on the *pre-`47d46c30`* image `029e44d7f146`. |

**Coverage caveat — partially closed 2026-09-27 (Dokploy prep).** `tsconfig.pipeline.json` does not include
`src/app/api/interview/**` or most of the swept route files, so many of the files changed in the SB-06 pass
were **not** type-checked by the targeted config, and the repo-wide `tsconfig.json` run dies at exit 137 in
this environment. Several of the swept route files also carry `// @ts-nocheck`. Those edits are mechanical
(`{ id }` → `{ id: mixedIdFilter(id) }`), which limits the risk, but this remains the honest state of the
verification.

The gap that mattered most is now closed: **`src/workers/**` was in no tsconfig at all** — the worker bundle
is produced by esbuild, which does not type-check, so `src/workers/health.ts` could break the worker's
`/health` contract with nothing failing in CI. `tsconfig.pipeline.json` now includes `src/workers/**/*.ts`,
`src/app/api/admin/vps-setup/route.ts`, `src/app/api/health/route.ts` and
`src/components/admin/job-intelligence/VpsSetupPanel.tsx`. Confirmed as genuine roots rather than incidental
imports: `tsc -p tsconfig.pipeline.json --listFiles` lists all 11 worker files plus the two admin files and
the health route, and the run exits 0.

---

## Appendix — verification state after the SB-20 / SB-21 fix

| Check | Result |
| --- | --- |
| `npx vitest run src/lib/jobs/autoApplySupport.test.ts` | `10 passed` (6 new: the object-`source` guard, the resolver's precedence/fallback/degenerate cases) |
| `npx vitest run` (full) | `676 passed | 5 failed | 31 skipped` — 6 more passing than the previous run, failures exactly the documented pre-existing set (`applicationWorker` correlation ×2, `pdfService`/`docxService` import ×3) |
| `npx tsc -p tsconfig.pipeline.json --noEmit` | exit 0, no output — and **all four changed files are covered by that config** (`src/app/api/jobs/**/*.ts`, `src/lib/jobs/autoApplySupport.ts`) |
| `.verify/check-apply-url-resolution.ts` vs production | **48,812 jobs iterated · 9,481 newly auto-applyable · 0 regressions** |
| `.verify/probe-worker-network.mjs` (inside the worker container) | `172.19.0.1:4001` → 200 · `172.17.0.1:4001` → 200 · **`10.0.1.1:4001` → FAIL** |
| Committed | `2a32380c` (analysis) + this pass |
| Deployed | **not yet** — app tier is still `36ace7eb4437` (`47d46c30`); the worker is still `029e44d7f146` |
