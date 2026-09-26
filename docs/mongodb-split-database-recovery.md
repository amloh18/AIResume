# Split-database incident: documents "disappeared" (CV not found)

**Date:** 2026-09-25
**Symptom:** While editing a CV (template switched to hybrid), navigating back to the docs page showed `CV not found`, the CV was missing from the docs list, and the account showed 0 resumes / 0 documents — even though the primary CV clearly exists in MongoDB.

---

## 1. Root cause (confirmed with live probes)

The Atlas cluster hosts **two databases** reachable with the same credentials:

| Database | Content |
|---|---|
| `airesume` | The real database (`MONGODB_DB=airesume` in `.env.local`): 83 users, full production history |
| `test` | The **driver-default** database — `MONGODB_URI` has no database path (`mongodb+srv://…mongodb.net/`), so any connection that does not pass `dbName` lands here |

A local dev-server process bound the shared mongoose default connection to `test` **before** the connection manager's `MONGODB_DB` override could apply. Everything the user did during the Sep 24 morning session (10:22–11:38 IST) was written to `test`:

- `test` account `6ab4aca84af87cd0adcc65ae` (amlowwh@gmail.com) created 2026-09-24 04:52 UTC
- master CV `6ab4b547d8c743eed8fff53a` — *"Mobile Product Manager | AI-Native Product Builder"* (created 05:29, last saved 06:08 = the template change)
- journey CV, cover letter and Databricks application (05:55–06:08 UTC)

After the dev server was restarted (Sep 24 19:13 IST), the new process correctly connected to `airesume`, where that account has **only one document** (a journey CV). The docs page therefore truthfully rendered 0 resumes / "No Documents", and any save/open of the master CV id returned 404 `CV not found` — the document exists, just in the *other* database. **The template change was correlation, not cause** — it simply triggered a save that 404'd.

### Why the connection-manager could not correct it

Verified live against the real driver (2026-09-25):

```
A. after raw connect (no dbName):                      test
A. after manager connect (dbName=airesume):            test   ← silent no-op, options dropped
B. after disconnect + connect with dbName:             airesume ← healed
C. query after reconnect:                              ok
```

`mongoose.connect()` on an already-open connection **with the same URI returns early and discards the new options** — including `dbName`. So whichever code path connects first decides the database for the entire process, silently.

### Poison paths found in app code (all fixed in this commit)

| Site | Problem |
|---|---|
| `src/app/api/jobs/fresh/route.ts` | raw `mongoose.connect(MONGODB_URI)` — fires from the dashboard's client fetch, can win the cold-start race |
| `src/app/api/cron/process-campaigns/route.ts` | raw connect in a cron route — can run first in a fresh worker process |
| `src/tests/intelligent-discovery/pipeline.manual.ts` | raw connect, ignored `MONGODB_DB` (reads only) |

Corroboration that `test` was being actively written to: `test.jobs` contains 4,206 jobs, and the Databricks job carries `source.lastSeenAt = 2026-09-24T07:10:29Z` — ingestion was still updating `test` the morning of the incident.

---

## 2. Code fixes (in commit on `fix/fe-be-integration`)

1. **Both runtime raw connects now go through `getConnection()`** (the unified connection manager); the manual pipeline test applies `MONGODB_DB` explicitly.
2. **Split-database guard in `src/lib/database/connection-manager.ts`:** after connecting, the manager verifies `connection.db.databaseName` against `MONGODB_DB`. On mismatch it logs `🛑 Split-database guard…`, disconnects and reconnects once with the correct `dbName`; if the reconnect still lands wrong it **throws** instead of serving queries against the wrong database.
3. **Regression tests:** `src/lib/database/connection-manager.test.ts` (4 tests — heal, healthy no-op, fail-loudly-on-loop, URI-default untouched when `MONGODB_DB` is unset).
4. Earlier in this batch: docs-list fetch retry + visible error panel, humanized save-error banners.

---

## 3. Recovery runbook (run locally, not on the VPS)

Script: `scripts/recover-split-db-documents.mjs` — dry-run by default, never touches the source database, idempotent, aborts on identity/duplicate conflicts.

```bash
# 1. Dry run — inspect the plan (nothing is written)
node scripts/recover-split-db-documents.mjs
node scripts/recover-split-db-documents.mjs --with-history

# 2. Apply — recommended: take the application history too
node scripts/recover-split-db-documents.mjs --apply --with-history
```

**What `--with-history` moves** (all `_id`s kept, so every reference resolves):

| Collection | Document |
|---|---|
| `cvs` | master CV `6ab4b547…` (**always**) |
| `cvs` | journey CV `6ab4bba9…` (Databricks AI Engineer - FDE, tailored) |
| `coverletters` | `6ab4bbba…` |
| `jobapplications` | `6ab4bb48…` (stage `staging`, needs review) |
| `applicationjourneys` | `6ab4bb76…` (step 4/5) |
| `jobs` | `6aaa61fe…` (global posting, required by the application) |
| `applicationevents` | 3 history events (discovered via `applicationId`) |

Ownership fields pointing at the duplicate account are rewritten to `6a100dfb36a569b9cb5c254b` (amlowwh@gmail.com). The script asserts both accounts' emails before doing anything, checks for a pre-existing master CV or duplicate Databricks application in the target, and writes a JSON backup (`split-db-recovery-backup-<ts>.json`, repo root — do **not** commit it) before inserting.

**Intentionally not migrated:** `activitylogs` (120), `loginsessions` (8), `notifications` (3), `jobsearchprofiles` (target already has one), `autoapplyreservations`, `applicationqueues` (queue entry is `status: completed` — closed record).

**Rollback:** the source database is never modified; to undo, delete the ids the script verified from `airesume`.

### Verify after applying

1. Restart the dev server (see §4).
2. Open the docs page → the master CV *"Mobile Product Manager | AI-Native Product Builder"* must be listed (Resumes: 1).
3. Open it, switch template, save → no `CV not found`.

---

## 4. Follow-ups

- [ ] **Restart the local dev server** — the running process (PID at time of writing, started Sep 24 19:13 IST) is wedged at 100% CPU in a Next/Turbopack uncaught-exception reporting loop and stops answering requests (that is what produced the plain `Failed to save CV` banner). Check the dev terminal output when restarting; if it wedges again on reload, capture that output.
- [ ] **Run the recovery script** (§3) and verify the docs page.
- [ ] **Job ingestion writing to `test`** — 4,206 jobs + ingestion bookkeeping landed in `test`. The two app-code poison paths are fixed, but confirm which service was ingesting: check `buildairesume-job-ingestion` env (`MONGODB_DATABASE` must be set — it does `client.db(env.MONGODB_DATABASE)`, which falls back to the driver default when unset).
- [ ] **One-off `scripts/*.ts`** — many older scripts call `mongoose.connect(MONGODB_URI)` without `dbName` and will operate on `test`. Pass `dbName: process.env.MONGODB_DB` when running any of them.
- [ ] **VPS/prod check (SSH, see `docs/application-automation/vps-worker-fixes.md`)** — confirm the Dokploy env sets `MONGODB_DB=airesume` (evidence says prod is healthy: the account's Sep 22–23 applications are correctly in `airesume`), and confirm no other service connects without it.
- [ ] Push `fix/fe-be-integration` and merge to `refactor/simple` per convention.

---

## 5. Execution outcome (2026-09-25, during the Atlas → VPS migration)

The script ran **against the local replica set** (SSH tunnel to the VPS, temporary `.env.local` swap — Atlas itself was write-blocked by the M0 quota, so `--apply` there fails by design). See `docs/mongodb-local-vps-migration.md` §4/§12.

- **9/9 planned documents verified** in `airesume` (master CV `status=published`, tailored CV, cover letter, application, journey, 3 events, job).
- The one ✅-failing item — `jobs/6aaa61fe…` — was **already present** in `airesume` under its canonical `_id` `6a8ef7b2b7001f8d4a9be97a` (same `canonicalId`; the unique index correctly refused the duplicate). Fix: `jobapplications.jobId` + the 3 `applicationevents.jobId` were re-pointed at that canonical job (same posting — title/company match exactly); post-check **0 dangling references**. Original ids remain in the script's backup JSON.
- `counts.sh` deltas after recovery were exactly the +8 copied docs and nothing else.
- **Docs-page verification (Resumes: 1, template save)** still needs a logged-in session — listed as a user follow-up in the migration runbook §11.
