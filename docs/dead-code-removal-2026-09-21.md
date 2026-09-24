# Dead Code & Stale Config Removal — 2026-09-21

Second pass, five days after [the first](dead-code-removal-2026-09-16.md). Same method, same tool:
**`scripts/dead-reachability.py`** (import-graph reachability from framework entry points, not a naive
zero-importer scan).

```bash
python3 scripts/dead-reachability.py . --list-dead
```

| | Before this pass | After |
| --- | --- | --- |
| Unreachable paths under `src/` | **19** | **5** |

The 5 survivors are all deliberate — see *Kept* below. **No cascade orphans**: nothing that was reachable
became dead as a result of these deletions.

## What the 15 new dead files were

All 15 appeared since the 2026-09-16 pass, and all came from the same two commits:

- `a6e22a85` — *feat: implement entitlement engine with features, limits, and plans* (2026-09-19)
- `d2935086` — *feat(payment): implement payment provider integration* (2026-09-14)

The entitlement **engine** that shipped in `a6e22a85` is live and in use
(`src/lib/entitlements/*` → `/api/entitlements`, `src/lib/hooks/useEntitlements.ts`,
`src/components/jobs/EntitlementNotice.tsx`). What was never wired is a parallel **hook + UI layer**:

| Deleted | Note |
| --- | --- |
| `src/components/entitlements/` (9 files) | `EntitlementGate`, `FeatureBadge`, `LimitReached`, `QuotaIndicator`, `SubscriptionIssueBanner`, `TrialBanner`, `UpgradePrompt`, `UsageMeter`, `index`. Superseded by `EntitlementNotice` + `useEntitlements`. |
| `src/lib/billing/entitlements.ts` | Alternative resolver; the live one is `src/lib/entitlements/`. `src/lib/billing/stripe-price-map.ts` is unaffected and kept. |
| `src/lib/hooks/useMembership.ts` | Superseded by `useEntitlements` / `useUsageLimits`. |
| `src/lib/hooks/useUserPlan.ts` + `src/lib/utils/userPlanUtils.ts` | Transitively dead pair — the only importer of `userPlanUtils` was `useUserPlan`. |
| `src/components/resume-enhancer/SidebarMembershipCard.tsx` | Unreferenced membership upsell card. |

**Not included:** `src/components/jobs/CvTailoringModeToggle.tsx` is unreachable too, but another agent
thread was mid-work on it on 2026-09-21 (its imports had just been clobbered by a concurrent edit), and
`docs/application-automation/task.md` tracks re-wiring it. Deleting it would delete the thing being fixed.

## Also removed

**One-shot scripts with zero references** (in code, `package.json`, or docs):

```
scripts/cleanup-job-duplicates.ts      scripts/migrate-to-airesume.js
scripts/create-test-users.ts           scripts/migrate-users-onboarding.ts
scripts/fix-legacy-jobs.ts             scripts/run-golden-path.ts
scripts/fix-user-index.ts              scripts/setup-amarl-b2b.ts
scripts/migrate-jobs-schema.ts         scripts/setup-b2b-test-tenant.ts
scripts/setup-mongodb.js               scripts/validate-job-search-profile-migration.ts
```

**Local scratch, several never committed to git — these are NOT recoverable with `git checkout`:**

```
scripts/test-api-endpoints.ts          scripts/test-mongodb.ts
scripts/test-e2e-job-discovery-ingestion.ts  scripts/test-portal-connections.ts
scripts/test-entitlement-limits.ts     scripts/test-workflow-integration.ts
scripts/tmp-check-accounts.mjs         scripts/README-notification-toast-test.md
scripts/find-registry-urls.md          scripts/__pycache__/, scripts/linkedin-worker/__pycache__/
tsconfig.tsbuildinfo                   (2.4 MB, gitignored build artefact)
```

Note `scripts/test-*.ts` and `scripts/setup-*.ts` were described as "operational, not temp files" in
`.workbuddy-ai/memory/OPS-NOTES.md`. That judgement was reversed here on the owner's instruction; they are
one-off manual connectivity/limit checks, all last touched between June and September 12, and none is
referenced by `package.json` or any doc. If one turns out to be missed, it is gone — recreate it.

**Stale deploy configs** (the owner resolved the "pending product decision" flagged in `REFACTOR_PLAN.md:52`
and `OPS-NOTES.md`, in favour of Docker + Dokploy):

```
railway.json  render.yaml  deploy.sh  deploy-vercel.sh  install.sh  vercel.json  .vercelignore  nixpacks.toml
```

Two operational consequences to check on the host **before the next deploy**:

1. **`nixpacks.toml`.** If the Dokploy service for this app is configured with the **Nixpacks** build type
   rather than **Dockerfile**, that config was what built production. Switch the build type to Dockerfile,
   or restore the file with `git checkout -- nixpacks.toml`.
2. **`vercel.json`.** It carried the Vercel cron entries (`/api/cron/daily-summary`,
   `/api/cron/ingestion`) and the CORS header block. If anything still deploys to Vercel, those schedules
   are now gone; the equivalent endpoints still exist for the VPS scheduler, and `next.config.ts` still
   sets the security headers.

## Kept deliberately

| Path | Why |
| --- | --- |
| `src/models/ApplicationUnified.ts`, `src/models/ApplicationRun.ts` | The only written description of those collections' shapes; zero runtime cost. `docs/architecture/implementation-plan.md` says to kill `ApplicationUnified` whenever the model consolidation happens. |
| `src/platforms/lever/LeverAdapter.ts`, `src/platforms/ashby/AshbyAdapter.ts` | Scaffolding for the `AGENTS.md` §10 ATS-source roadmap; only `GreenhouseAdapter` is wired (to `goldenPathProductionRunner`). |
| `src/components/jobs/CvTailoringModeToggle.tsx` | Actively being re-wired by another thread (see above). |
| `scripts/.vps-status.json`, `src/.!79790!.DS_Store` | Owner chose to leave these two tracked artefacts alone. `.vps-status.json` is read at runtime by `src/app/api/admin/vps-setup/route.ts`. |
| `buildairesume-job-ingestion/` (244 files) | Standalone microservice, unreferenced by the app or root build config, but cited throughout the docs as the reference for the ingestion/evidence-engine roadmap (`AGENTS.md` §9–§10). |
| `scripts/dead-reachability.py`, `scripts/audit-api-routes.py`, `scripts/backup-database.js`, `scripts/seed-pricing-plans.ts`, `scripts/generate-favicons.ts`, `scripts/deploy-build.sh`, `scripts/server-only-shim.js` | Reusable audit/ops tooling. `server-only-shim.js` is required by `scripts/tests/engine-gateway.e2e.mjs`. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| Dead-file re-scan | 19 → **5** (all intentionally retained); no cascade orphans |
| `npx vitest run` | 412 passed / 2 failed, 3 failing files — **same environmental failures as before the deletions** |
| Full `next build` | **not re-run in this pass** — it uploads source maps to Sentry (`SENTRY_AUTH_TOKEN` is present in `.env.sentry-build-plugin`). Typecheck covers every import path the deletions touch; run `npm run build` if you want the bundle-level check. |

The 2 failures are the pre-existing environmental ones, none related to these deletions:
`tests/e2e/job-pipeline.e2e.test.ts` needs a live server + MongoDB Atlas, and
`src/tests/{automation-reliability/crashRecovery,intelligent-discovery/pipeline}.test.ts` are hand-rolled
scripts with no `describe`/`it` blocks, so vitest reports "no test suite found".

## Recovering a deletion

Every tracked file above is recoverable:

```bash
git checkout -- path/to/file          # or: git checkout HEAD -- <path>
```

Untracked/gitignored files (the scratch list) are not.

## Correction for the next reader

`.workbuddy-ai/memory/OPS-NOTES.md` and `.workbuddy-ai/memory/2026-09-20.md` still say the deploy configs
are "all live" and that `nixpacks.toml` etc. are a pending product decision. That decision has since been
made and the files removed. Those memory entries were left untouched because a concurrent thread owns them
— treat them as historical.
