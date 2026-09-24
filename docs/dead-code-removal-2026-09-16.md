# Dead Code Removal — 2026-09-16

## 1. First, a correction about performance

This work was requested to "save a lot of service calling and speed up the app."
**Deleting unreferenced modules does not speed anything up.** Code that nothing
imports is never executed — it is bytes in the repository and in the source tree,
not work at runtime. Removing it is a **maintainability** win:

- less code to read, search, and reason about
- no more "is this the live implementation?" confusion
- smaller lint/typecheck surface
- no risk of someone wiring up a stale duplicate

The only genuine runtime savings found in this audit were wasted HTTP round-trips,
and both were already addressed separately:

| Wasted call | Live? | Cost |
| --- | --- | --- |
| `POST /api/ai/comprehensive-ats-analysis` | yes | one doomed 404 per ATS analysis |
| `POST /api/sync-history` | **no** — inside unused `SyncEngine` | never runs, so zero runtime cost |

The ATS one is the only real speedup available, and it is one failed request per
analysis — not a meaningful change to perceived performance. If the goal is
perceived speed, the wins are elsewhere (query/index work, payload size, caching).

## 2. Method

Script: [`scripts/dead-reachability.py`](../scripts/dead-reachability.py)

A "zero importers" scan is not enough — it misses files that are only imported by
*other dead files*. This does a proper reachability analysis:

1. Build the import graph across `src/` (static `import`, `import type`,
   `export … from`, dynamic `import()`, and `require()`).
2. Mark the roots: Next.js convention entry points (`route`/`page`/`layout`/
   `error`/`loading`/`not-found`/`template`/`default`), framework-loaded files
   (`middleware`, `instrumentation`, `sitemap`, `robots`, `manifest`, Sentry
   configs), **every test file**, and anything referenced from `next.config.ts`.
3. BFS from the roots. **Anything not reached is dead.**

```bash
python3 scripts/dead-reachability.py . --list-dead
```

## 3. The near-miss that mattered: `src/proxy.ts`

The first run flagged **`src/proxy.ts`** as dead — it has zero importers and looks
like an orphan. It is not.

**Next.js 16 renamed the `middleware` file convention to `proxy`.** From
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`:

> **Note**: The `middleware` file convention is deprecated and has been renamed to
> `proxy`.
> Create a `proxy.ts` (or `.js`) file in the project root, **or inside `src`** if
> applicable, so that it is located at the same level as `pages` or `app`.

`src/proxy.ts` sits alongside `src/app` — exactly the documented location — and
there is no `middleware.ts` anywhere. The production build confirms it is live:

```
ƒ Proxy (Middleware)
```

Deleting it would have **removed the app's authentication and redirect handling** —
a silent security regression that no typecheck, lint, test, or build would have
caught, because nothing imports it by design.

The scanner's entry-point list was corrected to include `proxy.ts`, plus the other
Next 16 conventions it was missing: `instrumentation-client.ts`, `forbidden.tsx`,
`unauthorized.tsx`, `mdx-components.tsx`.

**This is the whole argument for `AGENTS.md`'s "read the Next docs before writing
code" rule.** A convention rename is invisible to every static tool in the project.

## 4. Safety gate: string references

A file can be used without being imported — via a registry, a lookup table, or a
path in a config string. Neither `tsc` nor the build catches that. Every dead
module's basename was checked against the contents of every **live** file.

Six apparent hits, all confirmed as substring coincidences, not references:

| Dead module | Apparent hit | Reality |
| --- | --- | --- |
| `JobsDashboard/StatusBadge.tsx` | `admin/EmailCampaignManager.tsx` | matched a local `getStatusBadge` function |
| `jobs/ManualConfirmModal.tsx` | `goldenPathProductionRunner.ts` | matched the phrase `"I have applied"` |
| `interview-coach/SessionHub.tsx` | `interview-coach/[jobId]/page.tsx` | matched the page's own name `SessionHubPage`; the page imports only React + `next/navigation` |
| `lib/services/autoSyncService.ts` | `models/Job.ts` | a comment mentioning it |
| `proxy.ts` | `linkedin-enhancer/page.tsx` | the word "proxy" in a comment |
| `types/job-search.ts` | `welcome/page.tsx` | the words "job-search" in a comment |

## 5. Removed

**87 files, 12,289 lines.** Deleted in three verified batches.

| Area | Files | What |
| --- | --- | --- |
| `src/lib/services/` | 10 | `jobMatchingService`, `jobAnalysisService`, `jobPreferencesService`, `userJobPreferencesService`, `watchlistService`, `autoSyncService`, `trackerNotificationService`, `b2b-webhook-dispatcher`, `aiCVParser`, `surgicalFixToIssueAdapter` |
| `src/components/dashboard/` | 35 | the retired `redesigned/` widget set (19), `jobs/` (8), `JobsDashboard/` (5), `settings/` (3) |
| `src/components/` (other) | 16 | admin (5), interview-coach (3), resume-enhancer (4), linkedin-enhancer (2), jobs (2), auth, landing, notifications |
| `src/lib/` (non-service) | 10 | `autoapply/quotaEnforcer`, `hooks/useJobsKeyboardShortcuts`, `interview/index`, `migration/jobSearchProfileValidation`, `prompts/comprehensive-analysis-prompt`, `staging/*` (3), `utils/cv-analysis-utils`, `utils/s3-utils` |
| top-level areas | 12 | `analytics/*` (2), `email/*` (2), `events/jobChangeStream`, `hooks/useContextToasts`, `matching/*` (2), `types/*` (3), `verification/unknownFormShield` |

Several were transitively dead — e.g. `jobMatchingService` is imported only by
`jobPreferencesService`, which is itself dead. A zero-importer scan would have
missed those.

## 6. Deliberately retained (4 files)

These are unreachable, but deleting them would trade a real thing for a tidy tree.

| File | Why kept |
| --- | --- |
| `src/platforms/lever/LeverAdapter.ts` | `AGENTS.md` §10 names Lever and Ashby as **priority ATS sources** in the target source-adapter architecture, and §9 makes direct ATS ingestion a roadmap direction. Only Greenhouse is wired today (to `goldenPathProductionRunner`). These are scaffolding for a documented plan — deleting them contradicts the stated roadmap. |
| `src/platforms/ashby/AshbyAdapter.ts` | same |
| `src/models/ApplicationRun.ts` | Mongoose model. Deleting the file does not drop the collection, but it removes the only description of that collection's shape. Zero runtime cost to keep; possible value if the collection holds production data. |
| `src/models/ApplicationUnified.ts` | same |

Say the word and these four go too — all are recoverable from git.

## 7. Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | `✓ Compiled successfully in 9.7s`, 326/326 pages |
| `ƒ Proxy (Middleware)` in build output | present — `src/proxy.ts` still active |
| `npx vitest run` | 289 passed / 4 failed — **identical to the pre-deletion baseline** |
| Dead-file re-scan | 91 → **4** (all 4 intentionally retained); no cascade orphans |
| Build warnings | 5, all pre-existing `fs.statSync` tracing warnings in admin routes |

The 4 test failures are the same pre-existing environmental ones
(`job-pipeline.e2e` needs a live MongoDB Atlas cluster; `docxService`/`pdfService`
import timeouts).

**Recovering a deletion:** every removed file was git-tracked, so
`git checkout -- <path>` restores it.

## 8. A caveat about this technique

Reachability analysis proves *nothing imports it*. It cannot prove *nothing
needs it*. Specifically it will not see:

- a file loaded by a **string path** in a config or runtime lookup
- a **framework convention** not in the scanner's list (this is exactly how
  `proxy.ts` was nearly deleted — check the framework's file-convention docs
  after a major upgrade)
- code intended as **scaffolding for a roadmap item** that is not wired yet
- anything referenced from **outside `src/`** (a worker, a cron definition, a
  deployment script) — those were checked by hand for every file deleted here

Re-run the scanner after a framework upgrade, and re-check the entry-point list.
