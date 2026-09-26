# Dead Code Removal — 2026-09-24

Third pass, after [2026-09-16](dead-code-removal-2026-09-16.md) and
[2026-09-21](dead-code-removal-2026-09-21.md). Requested as a full page-by-page /
section-by-section forensic cleanup of the whole repository.

## 1. Method

Three independent signals were required before any file was touched:

1. **`scripts/dead-reachability.py . --list-dead`** — the repo's own audited
   importer (framework conventions + every test as roots, BFS).
2. **An independent import-graph scan** (static `import` / `export…from` /
   side-effect `import` / dynamic `import('literal')` / `require('literal')`,
   resolved through `@/` aliases, relative specifiers and `index.*` barrels,
   iterated to a fixpoint so files imported only by other dead files are also
   caught). Protected: app-router convention files (including the **root**
   `layout.tsx`/`page.tsx` — the first version of this scan got that wrong and
   cascaded a false "dead" verdict onto everything the root layout imports),
   ambient `*.d.ts`, tooling configs, tests, `scripts/`, `public/`, and the
   nested `buildairesume-job-ingestion/` microservice.
3. **A test-only query** — files whose *only* importers are tests (neither
   scanner calls that dead, because tests are roots).

Plus four safety sweeps: literal references from outside `src/`
(`package.json`, `Dockerfile`, `deploy/`, `docs/`), `scripts/audit-api-routes.py`,
a zero-caller scan of all 350 API routes, and a `package.json` dependency
cross-check.

The keep-lists from the first two passes were loaded and honored as defaults;
the owner was asked about the seven files that were *provably dead but
deliberately retained* and answered **"Delete all 7"** — that answer is the
authority for those rows below.

## 2. Removed — 18 tracked files, 4,349 lines

| File | Lines | Evidence |
| --- | ---: | --- |
| `src/lib/services/autoapply-processor.ts` | 1,028 | Both scanners: dead. Carried a DEAD-CODE banner ("mode-less `apply()` would default to `auto` if wired"); docs call it an orphaned landmine. Removal was queued in R8.1 for the deferred GAP-12 pass — **owner approved bringing it forward**. |
| `src/lib/services/autoApplyConfigurationService.ts` | 182 | Its only importer was the dead processor (a literal `await import(...)` inside it). |
| `src/lib/sync-engine/SyncEngine.ts` | 1,024 | Only importer is its own test. `docs/api-route-contract-audit-2026-09-16.md` already proved its only external effect — `POST /api/sync-history` — targets a route that does not exist and a model that has no reader. |
| `src/__tests__/sync-engine/SyncEngine.test.ts` | 593 | Tests only the deleted engine. |
| `src/models/ApplicationUnified.ts` | 450 | Both prior passes retained it *only* as the written shape description of a possibly-live collection, with removal deferred to GAP-12 — **owner approved**. (The Mongoose collection itself is untouched; nothing registered this model.) |
| `src/models/ApplicationRun.ts` | 69 | Same. |
| `src/lib/services/jobService.ts` | 278 | Dead: every call site is now a historical comment ("Previously this called `JobService.getJob`"), and `audit-api-routes.py` shows all five API paths it fetches (`/api/jobs/{id}/status`, `/api/interviews*`, `/api/jobs/{id}/link-cv`) **do not exist as routes**. Superseded by `src/lib/jobs/serverJobContext.ts`. |
| `src/lib/stores/jobStore.ts` | 58 | Only importer was `jobService.ts`; one remaining mention is a comment in `src/types/job-prompt-context.ts` (kept — it explains history). |
| `.verify/vitest-shim.mjs` + `run-test.mjs` + 3 `probe-*.mjs` | 452 | Agent-verification scratch from earlier sessions; the documented runner (`node .verify/run-test.mjs`) has been replaced everywhere it was referenced. |
| `src/components/jobs/CvTailoringModeToggle.tsx` | 57 | Zero references anywhere. The 09-21 hold was "another thread is re-wiring it; `task.md` tracks it" — `task.md` no longer contains any such item (verified 2026-09-24), so the hold condition expired. |
| `src/platforms/lever/LeverAdapter.ts` | 53 | Zero references. Retained twice before as AGENTS §10 ATS-roadmap scaffolding — **owner approved deletion**; only `base/ApplicationPlatform` + `greenhouse` (both harness-wired) remain. |
| `src/platforms/ashby/AshbyAdapter.ts` | 45 | Same. |
| `src/components/notifications/utils.ts` | 31 | Test-only, and superseded: `NotificationCenter.tsx` renders relative timestamps through its own `formatSafeTimeAgo`. |
| `src/components/notifications/__tests__/notificationUtils.test.ts` | 29 | Tests only the deleted util. |

Additionally, the **untracked** `.verify/build/` scratch bundles (6 files) were
removed — as on 09-21, untracked scratch is *not* recoverable from git.

### Relocated (2, not deleted)

The two real regression suites that lived in `.verify/` — 42 passing tests
against active code — moved to `src/tests/regression/` (imports are `@/`-alias
based and `ROOT = process.cwd()`, so they are location-independent; vitest's
default include picks them up unchanged):

```
.verify/comms-thread-reuse.test.tsx → src/tests/regression/comms-thread-reuse.test.tsx
.verify/journey-documents.test.ts   → src/tests/regression/journey-documents.test.ts
```

## 3. Dead-code chains removed

```
(none was chained behind an already-deleted root this pass — but these pairs went together):

jobService ─► jobStore                    (both deleted as one chain)
autoapply-processor ─► autoApplyConfigurationService
SyncEngine ─► (PersistenceLayer, internal) ─► POST /api/sync-history   [route already absent]
notifications/utils ─► notificationUtils.test
```

Post-deletion cascade check: `dead-reachability.py` re-scan reports
**1 unreachable file** (`src/models/AutoApplyConfiguration.ts`, see below) and
1,290/1,291 reachable — no new orphans appeared.

## 4. Protected / kept deliberately

| Path | Why |
| --- | --- |
| `src/models/AutoApplyConfiguration.ts` | The only "dead" file both scanners flag that **cannot** go: four ops scripts (`scripts/migrate-job-search-profiles.ts`, both rollbacks, `validate-migration.ts`) `await import('../src/models/AutoApplyConfiguration')`, and `tsconfig.json` includes `**/*.ts` — deleting it fails `tsc --noEmit`. |
| `src/styles/cv-editor-print-styles.css` | Pulled in by `@import` in `globals.css` — CSS `@import` is invisible to import-graph scanners. |
| `src/workers/entry.ts` | Bundled by name: `Dockerfile` (`esbuild bundles src/workers/entry.ts into dist/worker.mjs`) + `scripts/build-worker.mjs`. |
| `src/platforms/base/`, `src/platforms/greenhouse/`, `src/verification/*`, `src/email/emailClassifier.ts`, `src/matching/explainableReasons.ts` | All imported **only** by the `src/tests/automation-reliability/` golden-path verification harness — which is active, documented infrastructure (R-tasks, prior audits), not an abandoned experiment. |
| `buildairesume-job-ingestion/` (244 files) | Standalone microservice with its own Dockerfile; kept per the 09-21 decision (AGENTS §9–§10 roadmap reference). |
| `public/seo-llm-content.md`, `public/seo-meta-content.md` | Unreferenced *in code* by design — they are served content for crawlers/LLMs (external consumers). |
| All 154 other `public/` assets | Every one is referenced (code, CSS, or layout `<Script src>`). |
| `src/components/resume-enhancer/CVCanvasEngine.tsx` fake AI-scan score | Not deleted — flagged as debt in the UX pass (score-display risk if "fixed" blindly). |
| All `package.json` dependencies | Cross-checked: every dependency and devDependency has at least one import/config/script reference after the deletions — **0 removals**. |
| All API routes (350) | See §5 — none deleted. |

## 5. API route audit — report-only, no deletions

`scripts/audit-api-routes.py`: 350 routes, 487 call sites, **0 method/route
mismatches**. A supplementary zero-caller scan (every route path probed against
every text file in the repo, wildcard routes probed by directory prefix) found
**83 routes with zero in-repo textual callers** — including entire clusters
(`/api/ai/{optimize,quantify,summary,…}`, `/api/admin/*` older panels,
`/api/auth/forgot-password`, `/api/users/profile`, `/api/dashboard-data`).

These were **not** deleted. §13 of the working agreement: a route can be
consumed from outside the repository, and several in this list are *provably*
external:

- `/api/auth/callback/microsoft` — OAuth redirect target registered with
  Microsoft; deleting it breaks Microsoft sign-in.
- `/api/auth/extension-signin`, `/api/auth/custom-session` — browser-extension
  surface (the extension lives outside this repo).
- `/api/auth/forgot-password`, `/api/auth/verify-code` — candidate email-link
  endpoints; email content was not fully traceable from this repo.
- `/api/payment/polar/health` and other health checks — monitoring surface.

**Recommended follow-up before any route is removed:** grep the deployed nginx/
Dokploy config and cron env for URLs, check the Chrome-extension repo, check
sent email templates, then re-run the zero-caller scan with that evidence.

### Pre-existing broken calls found (reported, NOT fixed — behavior change is out of scope)

| Call site | Target | Status |
| --- | --- | --- |
| `src/app/shared/candidate/[token]/page.tsx` (GET + POST) | `/api/public/shared-candidate/{token}` | **No such route exists** — the public share page is calling into the void. Either the route died in a prior redesign or the page is orphaned; needs a product decision, not a cleanup edit. |
| `src/lib/error-tracking.ts:157` | `/api/error-tracking` | No route; the POST 404s (presumably swallowed). |
| `src/lib/services/aiAssistantService.ts:1299` | `/api/ai/comprehensive-ats-analysis` | No route — but `/api/ai/comprehensive-analysis` exists (rename casualty). The 09-16 audit claimed this was "addressed separately"; the stale call is still present. |

## 6. Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 (run immediately after deletions) |
| `npm run lint` | exit 0 — **0 errors**, 6,473 warnings across the 5 chunks (baseline 6,525; −52 from the deleted files) |
| `npx vitest run` | exit 0 — **565 passed / 31 skipped (e2e by design) / 0 failed**, 60 files. Baseline 590 passed; the −25 is exactly the deleted suites (`notificationUtils` 3 + `SyncEngine` 22). The 2 relocated `.verify` suites (42 tests) still run and pass. The `Error: down` line in the log is `applicationEmailService.test.ts`'s intentional error-path assertion (pre-existing, passing). |
| `npm run build` | exit 0 — `✓ Compiled successfully in 57s`, **329/329** static pages generated, `ƒ Proxy (Middleware)` present (root `src/proxy.ts` still active), no new warnings |
| `python3 scripts/dead-reachability.py . --list-dead` | 10 → **1** (`AutoApplyConfiguration.ts`, kept for scripts); 1,290/1,291 reachable; no cascade orphans |
| Post-deletion reference sweep | no import/require of any deleted module remains; only historical prose in 3 comments (annotated with the deletion date) |
| Dependency cross-check | 0 dependencies became unreferenced |

## 7. Recovering a deletion

Every tracked file is recoverable:

```bash
git checkout HEAD -- path/to/file
```

The untracked `.verify/build/` bundles are not (by design).
