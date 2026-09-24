# Runtime log triage — 2026-09-20

**Question this answers:** "why still failing the deployment?" → **the deployment is not failing.**

The container built, is serving pages, and both background workers are ticking. The log even contains
`[EmailIngestion] Next poll in 240s` / `300s` — that is the exponential backoff added in the previous
session, running correctly in production. Everything below is a **runtime** error, not a build failure.

| # | Log line | Root cause | Status |
|---|---|---|---|
| 1 | `stageHistory.1.source: 'automation_worker' is not a valid enum value` | enum drift — see §1 | ✅ fixed in code |
| 2 | `Failed to track system email: createdByEmail / createdBy is required` | two bugs — see §2 | ✅ fixed in code |
| 3 | `🍎 Failed to generate Apple client secret … ES256` | inverted guard — see §3 | ✅ fixed in code + VPS check |
| 4 | `[MONGOOSE] Duplicate schema index on {"jti":1}` / `{"namespace":1}` | see §4 | ✅ fixed in code + VPS step |
| 5 | `internal image response is empty for /images/…png` | wrong extension — see §5 | ✅ fixed in code |
| 6 | `[EmailIngestion] … mail.morigrid.com:443 … UND_ERR_CONNECT_TIMEOUT` | networking | ⚠️ **VPS only** |
| 7 | `⚠️ Session jti … is invalid/revoked — forcing re-auth` | not root-caused | ⚠️ **needs one query** |
| 8 | `Passwordless login: Code verification failed for both types` | likely just an expired code | ℹ️ monitor |

The JMAP inbound-body fix from the previous handoff (`docs/jmap-inbound-body-parts-bug.md`) is confirmed
landed — **there are no `CastError` lines in this log any more**, only the connectivity failures in §6.

---

## 1. Enum drift — three workers failing on every tick

`stateMachine.ts` wrote `source: req.source as any` into `JobApplication.stageHistory`, and
`processApplication.ts` passes `'automation_worker'` in **8 places** — but that value was in neither
Mongoose enum. `git log -S"automation_worker"` confirms it was **never** a valid value, so this never
worked: every application-worker transition has been rejected since it shipped.

Two more workers were affected by the same class of mismatch: `reconciliationWorker.ts` and
`watchdog.ts` both pass `'system'`, which `ApplicationEvent` did not allow.

| File | Change |
|---|---|
| `src/models/JobApplication.ts` | added `automation_worker` to the TS union **and** the Mongoose enum |
| `src/models/ApplicationEvent.ts` | added `automation_worker` **and** `system` to both |
| `src/lib/application-state/stateMachine.ts` | **removed the `as any`** that hid the drift |

`automation` is kept alongside `automation_worker` so existing documents stay valid — no migration.

The `as any` was the actual defect: it silenced the one check that would have caught this. It is gone,
so `tsc` now enforces the contract.

## 2. `SystemEmailTracker` — two bugs, and fixing one alone would have made it worse

- It set `creatorId` — **not a schema path**. Mongoose strict mode stripped it silently, while
  `createdBy` and `createdByEmail` are both `required`. Hence the validation failure.
- It also wrote `performance.systemType` (also undeclared → stripped) and used that same path as the
  `findOne` dedup key. **The write is stripped; the read filter is not** — so the find-or-create could
  never match.

**Why that mattered:** fixing only the validation error would have turned a silent no-op into **one new
campaign document per system email**, growing without bound. Both are fixed:

| File | Change |
|---|---|
| `src/models/admin/EmailCampaign.ts` | declared `performance.systemType` (+ index) in schema and interface |
| `src/lib/services/SystemEmailTracker.ts` | set `createdBy` / `createdByEmail` / `createdByName`; dropped `creatorId` |

`createdBy` uses the all-zero ObjectId as an explicit system sentinel — there is no real user to
attribute a transactional container to. No existing documents need migrating (nothing was ever created).

## 3. Apple ES256 — this was a **code** bug, not just a bad env var

`normalizeKeyContent()` un-escaped literal `\n` sequences only `if (!key.includes('-----BEGIN'))`. A
single-line PEM pasted from a Docker/Dokploy env var **still contains the `-----BEGIN` marker**, so the
guard was false and the un-escaping was skipped — in exactly the case it was written for. The key then
reached `jwt.sign()` as one line of literal `\n` text.

Reproduced against a freshly generated EC key, all four encodings:

| Encoding | Before | After |
|---|---|---|
| real multi-line PEM | OK | OK |
| single line, literal `\n` (Docker env) | **FAILED** — exact production error | **OK** |
| base64 of whole PEM | OK | OK |
| fully collapsed, no newlines at all | **FAILED** | **OK** |

Fixed to test for a **real newline** rather than the BEGIN marker, plus a fallback for the fully
collapsed form. Invalid input still fails loudly (negative control).

## 4. Duplicate schema indexes

Two schemas declared the same index more than once:

- `LoginSession.jti` — `unique: true` **and** `index({ jti: 1 })`
- `WorkerSettings.namespace` — `unique: true` + `index: true` + `index({ namespace: 1 }, { unique: true })`

Redundant declarations removed. Build warnings for `Duplicate schema index` went **2 → 0**.

**There is a server-side consequence worth knowing:** MongoDB will **not** upgrade an existing index to
`unique` when one with the same key pattern already exists — it raises `IndexOptionsConflict` and logs it
quietly. So if the non-unique variant was created first, `jti` uniqueness is currently **not enforced**.
See the VPS checklist.

## 5. Three broken image paths, not one

`navigation.tsx` referenced `/images/*.png` for three files that only exist as `.webp`
(`ats_optimization`, `interviewcoach_dashbaord`, `linkedin_enhancer_dashbaord`). Next's image optimiser
only logs the one actually requested, so a single log line hid the other two. All three corrected.

---

## ✅ VPS / Dokploy checklist

Everything here is environment or database state — it cannot be fixed in the repo.

**1. Fix the mail connectivity (this is the one causing the repeating failure).**
`UND_ERR_CONNECT_TIMEOUT` means the TCP connect never completed — it is not DNS, not TLS, not HTTP.
`jmapService.ts` reads `STALWART_JMAP_URL`; the app is trying to reach Stalwart on a **public hostname
from inside the container**. Point it at an internal address — the Stalwart container name on the shared
Docker network, or the host gateway `172.17.0.1`.

```bash
# verify from INSIDE the app container before changing anything
docker exec -it <app-container> sh -c 'curl -sv --max-time 10 http://<stalwart-host>:8085/jmap'
```

**2. Drop the stale non-unique indexes** so the unique ones can actually be built. Run `getIndexes()`
first and confirm the name before dropping.

```js
db.loginsessions.getIndexes()
db.loginsessions.dropIndex('jti_1')          // then restart so Mongoose recreates it as unique

db.workersettings.getIndexes()
db.workersettings.dropIndex('namespace_1')
```

**3. Verify the Apple key after deploying the code fix.** The log showed the *signing* error rather than
the friendly "not fully configured" warning — which proves `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`
and the key material are all present, just unparseable. If it still fails after the deploy, the value
itself is wrong. **Prefer `APPLE_KEY_PATH` (a mounted file) over `APPLE_KEY_CONTENT`** — a file cannot be
mangled by env-var handling.

**4. Confirm `POLAR_ACCESS_TOKEN` is set** in the production environment. It logs
`❌ Polar Configuration Error: POLAR_ACCESS_TOKEN is missing.` during an env-less build (expected there),
so just verify it is present in production rather than assuming the noise is harmless.

**5. Note:** `env.example` has no `APPLE_*`, `STALWART_JMAP_*` or `POLAR_*` entries, so it is not a
reliable list of what production must define.

---

## ⚠️ Still open

**Session jti re-auth spam.** The entire jti/`LoginSession` system landed in a single commit **today**
(`28740ae9`), so it has had no soak time. `validateSession` needs a `LoginSession` row matching
`{ jti, revokedAt: {$exists: false}, expiresAt: {$gt: now} }`, so a warning means the JWT carries a jti
with no valid row.

There is a design flaw either way: `createSession` is called inside a `try/catch` that only logs, and
`token.jti` is set **before** that `try` — so a failed write produces a token that can never validate.
The existing "grace period" covers only tokens with **no** jti.

Settle the cause with one query (take a jti from the log):

```js
db.loginsessions.find({ jti: '<jti from the log>' })
// no row          -> the session write failed silently
// row + revokedAt -> it was revoked
```

Not changed, because a missing row is not the same as a revoked one (`revokeSession` sets `revokedAt`
rather than deleting), so tolerating a missing row would be reasonably safe — **but that is an auth
semantics decision, not a silent fix.**

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (baseline before changes was also 0) |
| Production build, **no env at all** | exit 0, `ƒ Proxy (Middleware)` present |
| `Duplicate schema index` warnings | **2 → 0** |
| Apple normalizer vs 4 encodings | escaped-single-line and collapsed now sign; multiline/base64 unregressed; garbage still fails |
| strict / strictQuery probe (mongoose 8.24.4) | write strips undeclared path, read filter keeps it — confirmed |
| `.env.local` and `.next` | restored and verified |

Nine files changed, +87/−16. Nothing committed — review and commit when ready.

> **Commit note:** `.gitignore` line 52 is a blanket `*.md`, so this file will not commit without
> `git add -f docs/runtime-log-triage-2026-09-20.md`.
