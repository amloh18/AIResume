# BuildAIResume — Full Fix Plan (tracked)

Source: forensic audit 2026-09-24.
Rules: `[x]` only after **verified** (built/tested/observed). `[ ]` = not done.

Legend: **R** = local repo fix · **V** = VPS/host fix (see `docs/application-automation/vps-worker-fixes.md`) · **Q** = needs user decision

---

## 0. Decisions (RESOLVED 2026-09-24)

- [x] **Q1** → Fix on `fix/fe-be-integration`, then **merge to `refactor/simple`** (the branch Dokploy deploys).
- [x] **Q2** → **Wire the application-email queue up properly** (producer + worker drain + reachable states).
- [x] **Q3** → **`manual` hard-blocks Playwright** (stops at `NEEDS_USER_ACTION`, never auto-submits).
- [x] **Q4** → **Everything including observability.** GAP-12 state-model consolidation is *out of scope* for this pass.

---

## 1. Deployment drift / version truth

- [x] R1.1 Align branch strategy per Q1 (all fix work landed on `fix/fe-be-integration`; prod untouched)
- [x] R1.2 Add git commit SHA to build + expose via `/api/health` (version truth)
- [ ] R1.3 Merge `fix/fe-be-integration` → target branch per Q1 — **awaiting explicit go-ahead; do not push/merge unprompted**

## 2. Health endpoint (🔴 never responds)

- [x] R2.1 `/api/health` → non-blocking liveness (fast, no external deps)
- [x] R2.2 Move remote deps (SMTP/JMAP, Ollama, Whisper, Mongo) to timed/async detail with per-dep status + timeout budget
- [x] R2.3 Verify returns < 2s locally (test asserts fast-path < 500 ms with no DB touch)

## 3. Worker role / worker-daemon (🔴 fail-open)

- [x] R3.1 `src/workers/roles.ts` — **resolved by decision: fail-open to `all` retained** (atomic queue claim + email idempotency make duplicate loops wasteful, not corrupting; documented in the module header, pinned by `roles.test.ts`). Role/plan is no longer invisible: `/api/health` → `worker: { role, loops, warning }`.
- [x] R3.2 Fail-safe behaviour — `WORKER_ROLE=web` ⇒ zero loops (pinned by health test); worker explicit via V3.1 (`WORKER_ROLE=worker`, also baked as `ENV` in the Dockerfile `worker` target)
- [x] R3.3 Document worker target wiring so `--target worker` is actually built (Dockerfile header + `vps-worker-fixes.md` §1)
- [ ] V3.1 Set `WORKER_ROLE=worker` on worker-daemon service
- [ ] V3.2 Build/use worker image (`npm run worker`), not `npm run start`
- [ ] V3.3 `Restart=unless-stopped` on worker-daemon
- [ ] V3.4 Remove duplicate published web port on worker container

## 4. Secrets (🔴)

- [x] R4.1 Remove hard-coded Atlas URI from `tests/e2e/job-pipeline.e2e.test.ts` → read from env (throws fast when unset)
- [x] R4.2 Sweep repo for remaining secret literals (tokens/keys/URIs) — found `docs/MIGRATION.md` AWS pair (redacted; rotate — still in history) + `env.example` Firebase key (placeholder)
- [x] R4.3 Confirm `.gitignore` covers `.env*`, history files, cookies (added `.env.*` w/ `!.env.example`, `*.cookies`, `*.cookie`, browser-profile dirs)
- [ ] V4.1 `/etc/cron.d/buildairesume` → mode `0600`, token via env file
- [ ] V4.2 Gateway token out of unit file → `EnvironmentFile` with `0600`
- [ ] V4.3 Rotate: GitHub `ghs_` token in Dokploy remote, cron bearer token, gateway token, LinkedIn cookie in `.bash_history`, Atlas URI in git history
- [ ] V4.4 Scrub LinkedIn cookie from `/home/amloh/.bash_history`

## 5. Auth / SSRF / proxy (🔴🟡)

- [x] R5.1 `src/proxy.ts`: close `/api/cvs*` public allowlist leak (both routes now require `getAuthenticatedUser` too)
- [x] R5.2 `src/proxy.ts`: fix dot-path bypass (`STATIC_EXTENSION` + `isStaticAssetPath`)
- [x] R5.3 `src/proxy.ts`: remove/guard dev-bypass in production (hard-off; `/studio` blanket bypass removed)
- [x] R5.4 Cron routes: constant-time compare on all routes via shared `cronAuth`/`cronAuthFailure` (legacy `X-Api-Key` accepted, `?key=` dropped, fails closed 503 when unconfigured)
- [x] R5.5 Cron routes: add overlap/mutex guard (`acquireCronLock` + `finally` release on all 19 routes, 409 `CRON_ALREADY_RUNNING`; in-process only — documented single-container assumption)

## 6. Network exposure (🔴)

- [ ] V6.1 Enable UFW (allow 22/80/443 only; deny the rest)
- [ ] V6.2 CDP 9222: bind localhost only, drop `0.0.0.0` socat publish (or restrict source IP)
- [ ] V6.3 Gateway 8790: bind to docker/LAN source instead of `0.0.0.0`
- [ ] V6.4 Audit remaining `0.0.0.0` listeners (Samba, VNC, Ollama, ingestion 4001, ports 3000/3001)

## 7. Email pipeline (🔴 dead)

- [x] Q2 decision
- [x] R7.1 Wire `queueApplicationEmail` into an explicit, user-initiated producer — `POST /api/applications/[id]/email` (202 + queue id; auth + ownership; attachments only from the caller's own `JobApplication.attachments`, SSRF-guarded, ≤5 MB)
- [x] R7.2 Make `emailEvents` writer real — `GET /api/applications/[id]/email` reports queue status; transitions `queued → sending → sent/failed/retrying`
- [x] R7.3 Make `retrying` email state reachable — `emailWorker` claim predicate includes `retrying` (4 claim tests)
- [x] R7.4 Fix `WebhookLog` retry stub — reconstructs the Stripe event and calls the shared `handleWebhookEvent` (4 tests)
- [ ] V7.1 App container: add `STALWART_JMAP_URL` (internal `http://172.19.0.1:8085/jmap`) + `OLLAMA_BASE_URL`
- [ ] V7.2 Verify in-container SMTP/JMAP reachability (hairpin issue)

## 8. State machines / dead code (GAP-12 CONFIRMED)

- [x] R8.1 Inventory: `AutoApplyQueue`, `ApplicationRun`, `ApplicationUnified` — **marked, not deleted**: `autoapply-processor.ts`, `models/ApplicationRun.ts`, `models/ApplicationUnified.ts` all carry DEAD-CODE banners (zero importers verified by repo-wide grep; removal queued for GAP-12). The processor's banner also warns that its mode-less `apply()` call would default to `auto` if anyone wired it back up.
- [ ] R8.2 `Job` deprecated-but-live → resolve *(deferred: GAP-12 state-model consolidation out of scope per Q4)*
- [ ] R8.3 `JobApplication` 3 parallel field sets → converge to one *(deferred: GAP-12, Q4)*
- [ ] R8.4 Raw `applications` array → migrate off *(deferred: GAP-12, Q4)*
- [x] R8.5 Watchdog branches matching never-written states → fixed: `queued`-stuck apps now check for a live `ApplicationQueue` item (orphan → `route_review_required`, live item → `retry_transient`) so recovery can no longer loop forever; the `submitting`/`verification` branch is kept deliberately (documented — type-valid crash-guard). 8 tests.
- [ ] R8.6 Dead `buildiresume-whisper-worker` reference in app env → remove or start unit *(VPS-side, see `vps-worker-fixes.md` §4)*

## 9. Decision engine / application modes (GAP-10)

- [x] Q3 decision
- [x] R9.1 `manual` must not trigger Playwright — `processApplication` hard-blocks `manual`/`skip` before browser launch (`NEEDS_USER_ACTION`); `UnifiedApplyService` halts every non-`auto` mode after document prep, before `acquirePlaywrightBrowser` (5 tests pin this)
- [x] R9.2 Expand decision engine call sites — live `apply()` sites are the auto-apply route (runs the engine) and `processApplication` (takes `mode` from the queue doc); the only mode-less call site is in the dead `autoapply-processor.ts`, now banner-marked "do not wire"
- [x] R9.3 Separate AUTO / REVIEW / MANUAL as execution gates — `ApplicationQueue.mode` (schema default `review`) travels with the item; `auto` is the only mode that reaches Playwright; re-queue with `mode:'auto'` = user approval

## 10. Performance / resources

- [ ] V10.1 Address swap exhaustion (9.1/9 Gi) — offload unrelated containers
- [ ] V10.2 Prevent OOM recurrence (cgroup limits, stop hermes crash-loop, cap `llama-server`)
- [ ] V10.3 Container memory/CPU limits for app + worker
- [x] R10.4 Confirm no blocking external calls on hot request paths — **confirmed clean**. Only sync/blocking calls found: `execSync` in `admin/vps-setup` (admin-gated via `requireAdmin`, each with a 3–5 s timeout) and one local `readFileSync` of a prompt template in `linkedin-enhance`. No SMTP/HTTP/network I/O runs synchronously in any user-facing route; `/api/health` fast path does no I/O at all.

## 11. Observability (🟡)

- [x] R11.1 Sentry: lower `tracesSampleRate`, set `sendDefaultPii: false`
- [x] R11.2 Unify 3 loggers → single logger (`structured-logger.ts` core; `logger.ts`/`edge-logger.ts` are thin adapters; raw `console.*` converted across worker/queue/email paths — cron-route inline `console.*` conversion documented as deferred)
- [x] R11.3 Add correlation/trace ID across request → queue → worker (`correlation-id.ts` edge-safe + `correlation.ts` ALS; proxy mints/forwards `x-correlation-id`; queue docs store it; workers reopen via `runWithCorrelation`; 12 + 4 tests)
- [x] Q4 decision on scope

## 12. Tests (🟡)

- [x] R12.1 Tests for `claimNext` (atomic claim, locking) — 7 tests
- [x] R12.2 Tests for decision engine (hard SKIP semantics) — 9 tests
- [x] R12.3 Tests for `unifiedApplyService` — 5 tests (manual/review never launch browser; auto does; **regression test for a real bug found during this pass**: the Greenhouse handler's local `context` shadowed `ApplyJobContext`, so `page.goto(context.jobUrl)` was always `undefined` and every Greenhouse run fell into `automationUnavailable` — renamed to `ctx` like the other handlers)
- [x] R12.4 Tests for webhook retry path — 4 tests (+ email-service 2, email-claim 4, processApplication 7, applicationWorker 4)
- [x] R12.5 Tests for billing — 11 tests (auth fail-closed/401/legacy key/action filter + 409 overlap + lock release, GET and POST)
- [x] R12.6 Test for `/api/health` fast-path — 12 tests (incl. worker-role reporting)
- [x] R12.7 Test for proxy auth gate (dot-path, cvs, dev-bypass) — 25 tests
- [x] R12.8 Test for cron constant-time auth — `cronAuth.test.ts` + `cron-guard.test.ts` + `runCron.test.ts`

## 13. Infrastructure / misc

- [ ] V13.1 `buildairesume.com` DNS → add record (or document as intentional)
- [ ] V13.2 Ingestion container: build from git, not `/opt/cvcircle-build`
- [ ] V13.3 `/opt/cvcircle-build`: establish git-tracked source of truth
- [x] V13.4 Fix doc-link drift (`docs/deployment/repository-audit.md` missing) — **verified: nothing references that path.** The real file exists at `docs/application-automation/repository-audit.md`; the only mention of the deployment-path variant was this task line itself (`grep -rn --include='*.md' repository-audit`).
- [x] R13.5 Add deploy-verification checklist doc → `docs/application-automation/deploy-verification.md`

---

## Status log

| Date | Action |
|---|---|
| 2026-09-24 | Plan created from audit. No fixes applied yet. |
| 2026-09-24 | All repo-side (**R**) tasks implemented and verified on `fix/fe-be-integration` (uncommitted). Verification: `npx tsc --noEmit` clean · ESLint clean (errors = 0) on all 65 touched/new files — whole-tree `eslint src/` OOMs at Node's default heap (pre-existing, unrelated to this diff) · `npx vitest run` → **616 passed / 4 failed**, exactly the 6 known environmental failures (2 "no test suite" files + `tests/e2e/job-pipeline.e2e.test.ts` needing a local server+DB; `ECONNREFUSED :3000`). Extras found & fixed while testing: Greenhouse `context`-shadowing bug (R12.3), watchdog queued-branch retry loop (R8.5), `internalStatus:'queued'` never written on enqueue (now mirrored by the auto-apply route), 5 pre-existing lint errors in touched files (`@ts-nocheck` ×2 removed → 3 real type errors fixed, `require()` ×2 → static imports, `prefer-const`). Deliverables added: `vps-worker-fixes.md` (every **V** task), `deploy-verification.md` (R13.5). Remaining: all **V** tasks (host/Dokploy/DNS — need VPS access) and **R1.3** merge (needs explicit go-ahead). |
