# Agent hand-off — job application pipeline (out-of-repo work order)

**Date:** 2026-09-23
**App repo:** `cvcircle_app` (BuildAIResume.com — Next.js 16 App Router, MongoDB, Dokploy/VPS)
**Scope of this brief:** everything that **cannot** be done inside the application repository.

> **Read §1 before anything else.** It is a breaking change that will silently stop all scheduled work
> until one environment variable is set.

---

## 0. Context you need

The product journey is `BUILD → MATCH → TAILOR → APPLY → TRACK → LEARN`. An in-repo audit on 2026-09-23
found the pipeline was largely theatre: several stages rendered as functional in the UI while fabricating
their results. The in-repo half of that repair is **already merged into the working tree** (see §10 for
what was fixed and what was deliberately left).

This brief covers the other half: the environment, the workers, the scheduler, the storage, and the
browser extension. None of it can be fixed from inside the repo, and none of the in-repo fixes will
actually take effect in production until §1–§5 are done.

**Do not change application code as part of this brief** unless a step below explicitly says to. The
in-repo work is done and verified (`tsc` clean, 0 route-contract mismatches, `next build` succeeds).

---

## 1. ⚠️ CRITICAL — set `CRON_SECRET` (or `CRON_API_KEY`)

### What changed

Every route under `/api/cron/*` now authenticates through a single fail-closed guard
(`src/lib/auth/cron-guard.ts`). Previously each route carried its own check, and most read:

```ts
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { /* 401 */ }
```

That guard is **fail-open**: with `CRON_SECRET` unset the condition short-circuits on the first term and
the route runs for anyone who asks. Two other variants were as bad — comparing against the literal string
`"Bearer undefined"`, and one route falling back to a hard-coded `'dev-secret'`.

The guard now **fails closed**. With no secret configured, every cron endpoint returns:

```
HTTP 503  { "error": "Cron authentication is not configured on this deployment",
            "code": "CRON_NOT_CONFIGURED" }
```

### Action required

1. Generate a strong secret: `openssl rand -hex 32`
2. Set it in the production environment (Dokploy → app → Environment) as **`CRON_SECRET`**.
3. Update every scheduler, cron entry, and manual trigger to send:
   `Authorization: Bearer <CRON_SECRET>`
4. Confirm: `curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/ingestion` → expect `200`.
   Then repeat **without** the header → expect `401`. Then temporarily unset the secret → expect `503`.

`CRON_API_KEY` is accepted as an alias. `CRON_SECRET` is preferred.

**Until this is done, all scheduled ingestion, auto-apply, notification, credit-reset and registry work
is stopped.** That is intentional — it is better than the alternative, which was every one of those
endpoints being publicly callable.

---

## 2. Environment variables the app requires

`env.example` in the repo is **stale** and cannot be used as the source of truth. This table is the
source of truth for what production must define.

| Variable | Why it matters | Failure mode if missing |
|---|---|---|
| `CRON_SECRET` | See §1 | All cron routes return 503 |
| `NEXTAUTH_SECRET` | JWT signing for sessions **and** extension tokens | `proxy.ts` denies every request with 500 |
| `NEXTAUTH_URL` | OAuth callback base | OAuth sign-in breaks |
| `MONGODB_URI` | Primary database | Nothing works |
| `INGESTION_WORKER_URL` | Points `engine.ts` at the worker gateway | `jobspy` + `linkedin` sources return `[]` (the in-process `spawn()` is refused in production by `mustRefuseLocalWorkerSpawn()`) |
| `INGESTION_SERVICE_URL` | Serves the six sources with no local fetcher | `smartrecruiters`, `workable`, `recruitee`, `personio`, `bamboohr`, `feashliaa` all report `not_configured` |
| `PLAYWRIGHT_REMOTE_URL` | Remote CDP browser for apply | `browserService` returns `unavailable`; every apply becomes `action_required` — **no application can be submitted** |
| `STALWART_JMAP_URL` | Inbound email for the tracker | Connect timeouts; see §8 |
| `STALWART_USER_ID` | **Owner of the Stalwart mailbox** — the user id that ingested mail is attributed to | Ingestion is *skipped by design* (§10) and nothing reaches the Tracker. It previously fell back to a hardcoded id belonging to no user, which filed all mail under a stranger while the log still reported success |
| `AWS_S3_BUCKET_NAME`, `AWS_S3_REGION` | File storage | Every upload fails; see §7 |
| `POLAR_ACCESS_TOKEN` | Billing | Polar config errors |
| `APPLE_KEY_PATH` **or** `APPLE_KEY_CONTENT` | Apple sign-in | Signing errors; see §8 |

`SOURCE_FETCHERS` in `src/lib/ingestion/engine.ts` implements exactly nine sources
(`greenhouse`, `lever`, `ashby`, `remotive`, `remoteok`, `workday`, `adzuna`, `jobspy`, `linkedin`).
`SOURCE_REGISTRY` declares fifteen. The gap is served over HTTP by `INGESTION_SERVICE_URL`.

---

## 3. Cron scheduling — nothing currently runs the notification crons

`vercel.json` was deleted (see `docs/dead-code-removal-2026-09-21.md`), and `workers/entry.ts` starts only
the email, email-ingestion, application-queue and reconciliation loops. **No scheduler references the
three notification routes.** They are implemented and correct but unreachable.

Schedule these on the host (systemd timers, the platform scheduler, or a cron container). Prefer
`/api/cron/unified` where it covers the job — it already consolidates several daily tasks.

| Route | Suggested cadence | Notes |
|---|---|---|
| `/api/cron/ingestion` | `*/5 * * * *` | Demand-driven segments + baseline refresh |
| `/api/cron/auto-apply` | `*/5 * * * *` | Drains `ApplicationQueue`; also runs in-process via `instrumentation.ts` when `plan.applicationQueue` is on |
| `/api/cron/notifications/process-queue` | `*/5 * * * *` | Sends queued notifications |
| `/api/cron/notifications/followup-check` | `0 9 * * *` | **Currently unscheduled** |
| `/api/cron/notifications/job-status-check` | `0 9 * * *` | **Currently unscheduled** |
| `/api/cron/notifications/deadline-check` | `0 9 * * *` | **Currently unscheduled** |
| `/api/cron/notifications/membership-check` | `0 9 * * *` | |
| `/api/cron/credits/reset` | `0 0 * * *` | |
| `/api/cron/webhook-retry` | `*/15 * * * *` | |
| `/api/cron/state-recovery` | `*/30 * * * *` | |
| `/api/cron/deep-freeze` | `0 2 * * *` | Nightly |
| `/api/cron/process-triggers` | `0 * * * *` | |
| `/api/cron/process-campaigns` | `0 * * * *` | |
| `/api/cron/unified` | `0 8 * * *` | Daily summary + guest cleanup + weekly UK / monthly US registry |
| `/api/cron/sponsorship/update-uk-registry` | `0 3 * * 1` | Only if not using `/unified` |
| `/api/cron/sponsorship/update-us-registry` | `0 3 1 * *` | Only if not using `/unified` |

**Known weaknesses to fix while you are here** (in-repo, but they only bite once something actually
schedules them):

- `followUpNotificationService` has **no duplicate guard** — the duplicate check is explicitly deferred in
  the source, so every run re-enqueues the same follow-ups.
- `jobStatusNotificationService` keys its windows on `updatedAt`, which moves on any edit, so the same
  notification re-fires after an unrelated change.
- `deadlineNotificationService` uses **exact-day equality** (`daysUntilDeadline === 3`), so a scheduler
  that misses a day silently skips that notification forever.

---

## 4. Job ingestion — deploy and verify the worker gateway

The gateway serves the Python workers over HTTP for the VPS. The asymmetry is the rollback:
**`INGESTION_WORKER_URL` set ⇒ `engine.ts` POSTs to the gateway; unset ⇒ the original in-process `spawn()`
runs unchanged.**

1. Run `scripts/vps-install-worker-gateway.sh` on the worker host.
2. Install and enable `scripts/buildairesume-worker-gateway.service`.
3. Set `INGESTION_WORKER_URL` in the **app** environment to the gateway's internal address.
4. Verify transport: `python3 scripts/tests/test_worker_gateway.py`
5. Verify end-to-end: `node scripts/tests/engine-gateway.e2e.mjs` (it bundles the real `engine.ts` and
   drives it against a live gateway, then cleans up after itself).
6. Rollback is immediate: unset `INGESTION_WORKER_URL` and the in-process path returns.

**Do not remove Python Playwright / JobSpy from the `runner` stage of the Dockerfile until step 5 passes
in production.** Those are Stage 2 removals, gated on the gateway being verified. Chromium cannot leave
the image at all until ATS auto-apply stops launching it directly (`unifiedApplyService.ts`).

Full runbook: `docs/deployment/vps-automation-workers.md`.

---

## 5. Real application submission — a remote Playwright browser

**Today no application can be submitted in production.** `browserService` returns `unavailable` unless
`PLAYWRIGHT_REMOTE_URL` is configured, `acquirePlaywrightBrowser()` throws `BrowserUnavailableError`, and
every apply resolves to `action_required`.

When it *is* configured, real submission works for exactly four ATS form types: **greenhouse, lever,
ashby, workable**. Specifically:

- `unifiedApplyService.applyToIndeed` is a **stub** returning `action_required`.
- `applyToAdzuna` and `applyGeneric` are **stubs**.
- `applyToNaukri` is a real `fetch` to `naukri.com/jobapi/v3/apply` — but the worker's `isAutomatable`
  gate in `processApplication.ts` **excludes naukri and indeed**, routing them to `review_required` before
  `UnifiedApplyService.apply` is ever reached. So that path is unreachable.
- `workday` is listed as automatable but has **no handler**, so it falls through to `applyGeneric`.
- CAPTCHAs and auth walls are **never solved** — they become `action_required` (safe-halt). Keep it that
  way; do not add a CAPTCHA-solving path.

**Action:** provision a remote browser, set `PLAYWRIGHT_REMOTE_URL`, and verify one greenhouse
submission end to end before enabling auto-apply for any user. Then decide the product question of
whether `isAutomatable` should include naukri (the implementation exists but is gated off).

---

## 6. MongoDB index maintenance

**MongoDB will not upgrade an existing index with the same key pattern to `unique`.** The build silently
fails and duplicates persist. Drop the stale non-unique index first, then rebuild.

- `workersettings.namespace` — drop the non-unique variant so the unique one can build.
- `portalconnections.{userId, provider}` — the app now declares this **unique**. Run the migration that
  ships with the repo **before** deploying that change:
  ```bash
  node scripts/migrate-portal-connections-dedupe.mjs --dry-run   # read the plan
  node scripts/migrate-portal-connections-dedupe.mjs --apply
  ```
  It refuses to run with neither flag. It normalises `userId`, collapses duplicate `{userId, provider}`
  groups, clears synthetic identifiers, backfills `connectedAt`, drops the stale non-unique index and
  builds the unique one.
- ⚠️ `loginsessions.jti` is **already unique in production** — an `E11000 … index: jti_1` on that
  collection proves it. Do not "fix" it.
- `jobs.canonicalId` should be unique (`scripts/create-job-indexes.ts` builds it). Note that
  `jobDiscoveryService` upserts on an **unindexed** `externalId` instead — see §10.

---

## 7. Object storage

Every file upload currently fails. `AWS_S3_BUCKET_NAME=cvcircle` **does not exist** in `eu-north-1` of
account `912935854507` (`HeadBucket` → 404). The credentials are valid — `ListBuckets` returns
`AccessDenied`, i.e. they authenticated but lack `s3:ListAllMyBuckets` — which is why the app reports
`NoSuchBucket` rather than `InvalidAccessKeyId`.

The only bucket in that account is `airesume` in `eu-central-1`, and `PutObject` there is **also**
`AccessDenied`.

Pick one:

- **(a)** Create `cvcircle` in `eu-north-1` **and** grant `s3:PutObject` on `arn:aws:s3:::cvcircle/*`, or
- **(b)** Point `AWS_S3_BUCKET_NAME` at `airesume`, set `AWS_S3_REGION=eu-central-1`, **and** grant
  `s3:PutObject` on it.

Probe with `HeadBucket` then `PutObject` before touching env vars. Until one is done, thumbnails, CV
uploads and PDF exports have no storage.

---

## 8. Email ingestion and Apple sign-in

### Stalwart (tracker email)

`[EmailIngestion] … Connect Timeout Error (attempted address: mail.morigrid.com:443)` fires on every poll.
`UND_ERR_CONNECT_TIMEOUT` means the **TCP connect never completed** — not DNS (`ENOTFOUND`), not TLS
(`CERT_*`), not HTTP (4xx/5xx). `jmapService.ts` reads `STALWART_JMAP_URL` (default
`http://localhost:8085/jmap`), so the app is trying to reach Stalwart over a **public hostname from
inside the container**.

Point it at an internal address — the Stalwart container name on the shared Docker network, or the host
gateway `172.17.0.1`. **Verify before changing anything:**

```bash
curl -sv --max-time 10 http://<internal-address>:8085/jmap
```

The exponential backoff (30s → 5min, one log per streak) is confirmed working; leave it alone.

### Apple

The log shows the *signing* error, not the "not fully configured" warning — which proves `APPLE_ID`,
`APPLE_TEAM_ID`, `APPLE_KEY_ID` and the key material are all present, but the key is unparseable. The
code side is already fixed (an inverted un-escaping guard meant single-line PEMs pasted from a Docker env
var were never un-escaped). After deploying that fix, re-check. If it still fails, the value itself is
wrong — prefer **`APPLE_KEY_PATH`** (a mounted file) over `APPLE_KEY_CONTENT`, because files cannot be
mangled by env-var handling.

### Known unresolved mismatch

`api/admin/vps-setup/route.ts` invokes `scripts/vps-setup.sh`, which is a **host-level** provisioner
(`apt`, `useradd`, `/etc/systemd/system/*.service`, `systemctl daemon-reload`) targeting
`/opt/buildairesume`. But it is invoked **from inside the container**, where there is no systemd and
`PROJECT_DIR` resolves to `/app`. The admin "VPS Setup" panel therefore cannot work under Dokploy as
written. Either move that provisioning to the host or remove the panel.

---

## 9. Chrome extension — INTERFACE CONTRACT

The extension is built by another workstream. This section is the contract it must satisfy; **do not
change the app side of it.**

### 9.1 Authentication

1. `POST /api/auth/extension-token` with the user's NextAuth session cookie (and optionally
   `{ refreshToken }`).
   Returns `{ token, refreshToken, expiresAt, expiresInDays }`.
   - `token`: JWT `{ userId, email, type: 'extension' }`, **30 days**, signed with `NEXTAUTH_SECRET`.
   - `refreshToken`: JWT `{ userId, email, type: 'extension_refresh' }`, **60 days**.
2. Send `Authorization: Bearer <token>` on every subsequent call.
3. `POST /api/auth/extension-verify` verifies a token.

### 9.2 Session upload — use the canonical endpoint

```
POST /api/portal-connections/complete
Authorization: Bearer <extension token>
Content-Type: application/json

{
  "provider": "indeed" | "naukri" | "linkedin",
  "accountEmail": "<the account the session belongs to>",   // optional
  "displayName": "<label shown in the UI>",                  // optional
  "preferences": { ... },                                    // optional
  "sessionPayload": { ... }                                  // optional, opaque
}
```

`sessionPayload` is **opaque** to the app: the extension decides its shape. It must contain the session
material needed to replay requests — cookies (name / value / domain / path / expiry) and any CSRF token —
and nothing else. The app encrypts it with AES-256-GCM (`encryptToken`) into
`PortalConnection.encryptedSessionState`. **It is never returned to any browser.**

`provider` is validated against the adapter registry; only `naukri`, `indeed` and `linkedin` are valid.

### 9.3 ⛔ What the extension must NEVER send

The endpoint performs a **depth-bounded (6 levels) search of the entire payload** for these keys, at any
nesting depth, and rejects with `HTTP 400` if it finds one:

```
password, passwd, pwd, pass, secret, clientsecret, passwordhash,
credentials, pin, otp, totp, cvv
```

On rejection it logs the provider and the offending **key name only** — never the value, never the
payload. The response is:

```
400 { "error": "This request included a credential. BuildAIResume never asks for or stores your job-site password." }
```

**The extension must never capture, transmit or store a job-site password.** Session cookies only.

### 9.4 ⛔ Endpoints the extension must NOT use

| Endpoint | Status | Why |
|---|---|---|
| `POST /api/integrations/indeed/login` | **Retired — returns 501** | Never contacted Indeed; minted `indeed_auth_<base64(email:timestamp)>` for any input and marked the session `active` |
| `POST /api/integrations/naukri/login` | **Retired — returns 501** | Fabricated a token on *failure* and still marked the session `active`; also collected a password |
| `POST /api/integrations/{indeed,naukri}/session` | **Legacy — do not use** | Writes `User.*Integration`, which the UI **no longer reads**. The canonical store is `PortalConnection`. A session uploaded here will not appear as connected in Settings or onboarding. |

> **⚠️ This is the single most important integration note in this brief.** If the extension currently
> pushes a captured session to `/api/integrations/{indeed,naukri}/session`, the connection will be
> stored where nothing reads it and the user will see "Not connected" forever, with no error. Migrate to
> `POST /api/portal-connections/complete` (§9.2).

### 9.5 What the app does with a connected source

- One `PortalConnection` row per `{userId, provider}` (unique index — see §6).
- Status is projected to one of five UI states by `src/lib/portals/connection-state.ts`:
  `NOT_CONNECTED`, `CONNECTING`, `CONNECTED`, `ATTENTION_REQUIRED`, `DISCONNECTED`.
- Settings and onboarding read the **same** record through one react-query cache
  (`JOB_SOURCES_QUERY_KEY`), so a connection made in one appears in the other with no extra work.
- **Connection and ingestion are decoupled.** A successful connection must not depend on a successful
  ingestion run, and vice versa. Do not make the connect flow wait on a scrape.

---

## 10. What the in-repo pass already fixed — and what it deliberately did not

### Fixed in-repo (do not redo)

- **Cron authentication** — one fail-closed guard; all 16 cron routes and the admin seed route migrated.
- **`x-user-id` identity spoofing removed from 8 call sites / 6 routes** (`automation/settings` GET+POST,
  `jobs/list`, `jobs/metrics`, `jobs/portal` GET+POST, `applications/quota`, `applications/auto`). The
  header was trusted as identity, so any signed-in user could read — and on `automation/settings` **write**
  — another user's data by naming them. Identity now comes from the session only.
- **`applications/quota` and `jobs/portal` no longer invent a `demo-user-<timestamp>` identity** (which
  made them return a brand-new empty user's data on every call).
- **Indeed/Naukri "auto-apply" no longer fabricates an applied state.** Both wrote `status: 'applied'`,
  tagged the row `*-auto-applied`, incremented `stats.totalApplied` and returned "Application submitted
  successfully" while doing nothing but generating screening answers. They now record a `saved` row and
  return `submitted: false`.
- **`/api/applications/auto`** no longer accepts `x-user-id`, no longer fabricates `'Software Engineer'` /
  `'Company'` / `matchScore: 85`, and says "recorded" rather than "submitted".
- **The three status-discriminator consumers** (`JobSidebar`, `JobsDashboard`, `TopJobMatchesSection`) now
  branch explicitly on `skipped | already_queued | queued | applied`. `JobSidebar` previously PUT
  `status: 'applied'` and toasted "Applied successfully!" for a job that was merely *queued* or *skipped*.
  Note `skipped` arrives as **HTTP 200 with `success: false`**.
- **`DirectAtsAdapter`** no longer reports `jobDiscovery/jobDetails/jobSave/application: true` while
  `fetchJobs` returns `[]`, and no longer stamps a false `sync.lastSuccessAt`.
- **`recommendedJobsService`** — the saved flag was hard-coded `false` and the applied lookup queried a
  non-existent `applications` collection (the model is `jobapplications`). Every recommended job rendered
  as unsaved and unapplied.
- **`applications/dry-run`** now declares itself `simulated: true`. It never loads the URL; it maps a
  hard-coded field list per ATS type.
- **TRACK — email → application matching now works at all.** `matchToApplication` in
  `src/services/emailIngestionService.ts` had two *independent* faults, both of which alone produced
  `unmatched` on every message:
  (a) it joined through the `Job` catalog collection via `JobApplication.jobId` — a field no create path
  in the app ever writes, so the `$in` was always empty; and since `JobApplication.userId` is declared
  `Schema.Types.Mixed`, Mongoose applies no casting, so querying it with a session **string** never
  matched a document that stored an `ObjectId` (every create path does) — the application list came back
  empty regardless;
  (b) the scoring then read `job.title`, `job.company.name` and `job.contactDetails.email`, none of which
  exist on `Job` (which has `jobTitle: string`, `company: string`, `contacts[]`), so every term scored 0
  even when a row did match.
  It now scores against the application's own fields (`company`, `jobTitle`,
  `contactDetails.email`/`contacts[].email`) using whole-token matching (plain `includes` matched "Meta"
  against "metadata"), and adds In-Reply-To/References **thread continuity** as the highest-precision
  signal — the only one that survives a recruiter replying from an unrelated domain. Scores below 30 are
  discarded, so the invariant `jobId === null` ⇔ `confidence === 'unmatched'` holds.
- **TRACK — `Communication.jobId` is now a single key space.** Throughout the app `jobId` denotes the
  **`JobApplication._id`**: `EmailMessage.jobId` and `StageChangeLog.jobId` are `ref: 'JobApplication'`,
  `ApplicationJourney.jobId = jobApp._id`, `/api/jobs` lists `JobApplication`, and
  `/api/tracker/emails` resolves `JobApplication.findOne({_id: jobId})`. Ingestion wrote a **`Job`
  catalog `_id`** instead, so ingested mail could never be located. It now writes the application `_id`
  into both `jobId` and `applicationId` — which is exactly what `CommsPanel` →
  `/api/communications?jobId=` already filters on. `/api/tracker/emails` needed **no** change: it was
  correct and simply never received matching data.
- **TRACK — ingestion no longer invents an owner.** `pollInbox` attributed every message to
  `process.env.STALWART_USER_ID || '000000000000000000000001'` — an id belonging to no user, so the rows
  were invisible to every real user while the log still reported a successful ingest. A missing
  `STALWART_USER_ID` now skips ingestion, logs once, and is reported through
  `getIngestionStatus().configurationError` instead of engaging the failure backoff (retrying cannot fix
  a missing configuration). **This makes `STALWART_USER_ID` required — see §2.**

### Deliberately NOT fixed — remaining known defects

These are real and documented. They are **not** part of this brief; treat them as the next workstream.

| Area | Defect |
|---|---|
| TRACK | `JobApplication.cvId` / `coverLetterId` exist on the schema but **nothing ever writes them**. (`ApplicationJourney.cvId`/`coverLetterId` are a different pair and *are* written — see §10.) |
| TRACK | `matchToApplication` loads up to 200 applications and scores in JS. With a large history this is O(200) per inbound message; if it ever becomes hot, index `jobapplications` on `{userId, updatedAt}`. |
| LEARN | **The loop is open.** `ApplicationOutcome` is written and never read — `getSuccessRates` has **zero call sites**. Nothing feeds outcomes back into matching or tailoring. |
| DISCOVER | `JobDiscoveryService.fetchAndStore` has **zero callers outside tests** — the entire app-side Adzuna / Indeed / Naukri / Greenhouse / Workable discovery path is dead code. |
| DISCOVER | `portal-fetcher-service` writes its own `ExternalJob` collection that nothing in the discover read path reads. |
| DISCOVER | **Two dedup key spaces for one collection**: `engine.batchUpsert` upserts on `{canonicalId}` (indexed, unique), while `jobDiscoveryService` upserts on `{externalId}` — a field ingestion never writes and which is **not indexed**. The two writers can create duplicate catalog rows. |
| DISCOVER | `JobDemand.recordSearch` only `$inc`s `demandCount`; it never sets `priority` (stays 50) or `uniqueUsers` (stays 1), so `calculatePriority` is never persisted and demand-based scheduling sorts on a constant. |
| APPLY | **Three parallel application stores**: `JobApplication`, a raw `applications` collection written by `applicationService.ts` via `getDb()`, and the legacy `AutoApplyQueue`. |
| APPLY | `autoapply-processor.ts` is **orphaned** (imported nowhere) and writes the legacy `AutoApplyQueue`. Inert, but a landmine if re-imported. |
| APPLY | `processApplication.ts` `isAutomatable` excludes naukri/indeed, making Naukri's real apply implementation unreachable; `workday` is listed automatable with no handler. |
| ANALYTICS | `jobs/analytics` counts conversion from `status === 'applied'` only (excluding screening/interview), and reports `updatedAt - createdAt` as "time in stage". |
| SCHEMA | `JobApplication.internalStatus` has **no schema enum** (free String); the `status` interface omits `draft`, which the schema allows. |
| UI | `useApplyProgress.ts` maps `stepByOutcome.skipped = 'queued'`, so a skipped job renders in the card pipeline as *queued*. The honest value would be `'idle'`, but `'idle'` is not handled by the progress UI — changing it needs a visual check first. |
| UI | `src/components/dashboard/JobsDashboard/{Indeed,Naukri}ConnectCard.tsx` are **imported but never rendered** and carry claims that were never true ("1-click apply", "Auto-fills employer assessment questions"). |
| NOTIFICATIONS | The three notification services lack duplicate guards and use brittle triggers (§3). |

---

## 11. Verification checklist

Run in order. Do not mark a step done without its evidence.

- [ ] **§1** `CRON_SECRET` set; `curl` returns 200 with the header, 401 without, 503 when unset.
- [ ] **§2** Every variable in the table present in the production environment.
- [ ] **§3** All notification crons scheduled and observed firing once.
- [ ] **§4** `python3 scripts/tests/test_worker_gateway.py` and `node scripts/tests/engine-gateway.e2e.mjs` pass.
- [ ] **§5** One real greenhouse submission succeeds end to end.
- [ ] **§6** `node scripts/migrate-portal-connections-dedupe.mjs --dry-run` reviewed, then `--apply`.
- [ ] **§7** `HeadBucket` + `PutObject` both succeed on the chosen bucket.
- [ ] **§8** `curl -sv --max-time 10 http://<internal>:8085/jmap` succeeds from inside the app container.
- [ ] **§9** Extension authenticates via `/api/auth/extension-token` and uploads to
      `/api/portal-connections/complete`; the connection appears in **both** Settings and onboarding.
- [ ] **§9.4** No call remains to `/api/integrations/{indeed,naukri}/login`.
- [ ] **§10 TRACK** Send a real acknowledgement email to the Stalwart mailbox, then confirm the stored
      `Communication` row has a **non-null** `jobId` and `applicationId` (both equal to the matching
      `JobApplication._id`) with `matchConfidence !== 'unmatched'`, and that it renders in the Comms panel
      under that job. Rows with `jobId: null` mean matching is still failing — check that
      `STALWART_USER_ID` is set (§2) and that the company name or a known contact address appears in the
      message.
- [ ] Confirm a `503 CRON_NOT_CONFIGURED` is **alerting**, not silent — it means scheduled work has stopped.

---

## Appendix — repo conventions worth knowing

- **Read `AGENTS.md` before non-trivial work.** Preserve before replacing; do not create parallel auth,
  workspace or permission systems; do not migrate MongoDB to Postgres.
- **Verification recipes** live in `.workbuddy-ai/memory/OPS-NOTES.md` §"How to verify a change". Summary:
  `npx vitest run` dies in this sandbox (exit 137) — use a scoped `npx vitest run <test.ts>`;
  `npx tsc -p tsconfig.pipeline.json` for a scoped typecheck (repo-wide `tsc --noEmit` OOMs);
  `python3 scripts/audit-api-routes.py .` for route contracts.
- **Migration scripts** live in `scripts/migrate-*.mjs` and take `--dry-run` / `--apply`; they refuse to
  run with neither.
- **New markdown is gitignored** (`.gitignore:52` is a blanket `*.md`) — `git add -f` is required for
  this file and any other new doc.
