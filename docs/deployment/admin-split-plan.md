# Splitting the admin panel into its own app (monorepo)

**Status: REVISED PLAN — not implemented. The app has been reverted to pristine.**

Originally written 2026-10-04 from a read-only measurement of the working tree. Revised the same day
after the first execution attempt was blocked; see §0.1 for what changed and why.

> **Reconciliation with the monorepo move (same day).** The web app now lives at **`apps/airesume_app/`**, not
> `apps/web/` — read every `apps/web` below as `apps/airesume_app`. The move was done *without* npm workspaces
> (`docs/deployment/public-release.md` §4). The measured boundary in §2 is unchanged and still holds:
> re-running `.verify/scan-admin-boundary.mjs` after the move reports the same **118 admin-only / 998
> web-only / 0 closure violations**.

## 0. Decisions locked

| Question | Decision |
| --- | --- |
| How deep is the separation? | **Full code split (monorepo).** Admin becomes its own Next.js app. |
| Admin hostname | **`admin.buildairesume.com`** |
| What the main app does with `/admin/*` | **301 → the admin domain** |
| Admin repo privacy | **Separate private repo**, added to the public monorepo as a git submodule |
| Where shared code lives | **Stays in `apps/airesume_app/src`. Admin aliases into it.** ← revised, see §0.1 |
| Docker admin target | Written, but **flagged unverified** — Docker is not available locally |

### 0.1 ⚠️ Why "extract `packages/shared`" was dropped

The original plan extracted the 151 shared files into `packages/shared` and repointed everything at
`@shared/*`. That was measured and then rejected.

**A path alias is per-BUILD, not per-directory.** `@/` resolves to exactly one target in a given
Next/Turbopack build. The shared files use `@/lib/...` **internally**, and `@/` means
`apps/airesume_app/src`. So moving them into a package breaks their own internal imports *and* every file in
the web app that reaches them via `@/`. `resolveAlias` cannot map `@/` to two roots — there is one
namespace.

The consequence, measured by `.verify/scan-shared-import-surface.mjs`:

| Shape | Files rewritten | Specifiers | Web app touched | Needs workspaces + hoisting |
| --- | --- | --- | --- | --- |
| Extract `packages/shared` | **695** | 1,889 | 520 files + 2 configs | **yes** |
| **Alias into `apps/airesume_app/src`** | **~253** | ~565 | **0 files** | **no** |

Of the 1,889 specifiers, **1,324 were in the 520 web-only files** — i.e. the churn was in the app
that was supposed to stay untouched, not in the shared set.

Two further reasons, both hard blockers rather than preferences:

1. **A `packages/` layout forces npm workspaces**, because a file at `<repo>/packages/shared/src/x.ts`
   has no `node_modules` anywhere above it (sibling `apps/airesume_app/node_modules` is not an ancestor).
   With workspaces declared, `npm install` **still refused to hoist** — the lockfile recorded
   `apps/airesume_app/node_modules/mongoose` rather than `node_modules/mongoose`. Unresolved at time of
   writing. The revised shape never needs workspaces, so the blocker evaporates: shared files live
   under `apps/airesume_app/` and resolve `mongoose` by the ordinary ancestor walk.
2. **`turbopack.root: <repo root>` in the app** makes Turbopack watch the entire monorepo (a
   74k-file `node_modules` plus media directories) — a real OOM/perf hazard on the 4-core / 7 GB box,
   and a likely contributor to the OOM that killed the shell during the attempt.

**The revised shape is strictly less invasive:** the web app receives **zero** edits, so "nothing
should be broken" is structural rather than a hope.

## 1. What "the admin panel" is today (measured)

It is **not** a separate app. It is a route group inside the one Next.js build:

| Piece | Count | Location |
| --- | --- | --- |
| Admin pages | 3 | `src/app/admin/` — `dashboard/[[...slug]]/page.tsx`, `login/`, `unauthorized/` |
| Admin components | 42 files / ~17,048 lines | `src/components/admin/` |
| Admin API routes | 67 | `src/app/api/admin/**/route.ts` |

Two facts that shape everything below:

1. **The subdomain intent already exists.** `src/proxy.ts:87` computes
   `isAdminHost = host.startsWith('admin.') || host.includes('admin.localhost')` and rewrites
   `/` → `/admin/dashboard`, `/login` → `/admin/login`, and any non-`/admin` path into `/admin/*`.
   Nothing enforces it today, and it is served by the same container. The scaffold is half-built.
2. **The admin API routes share the server layer.** All 67 import `@/models/*`, `@/lib/auth/*`,
   `@/lib/database`, etc. The admin panel cannot be split off without also moving or sharing that
   layer — which is exactly what the boundary measurement in §2 sizes.

Deployment today: one `runner` image; Dokploy application `resumebuiler` (branch `refactor/simple`),
`cleanCache=t`, so every deploy is a cold build measured at roughly 18 minutes.

## 2. The measured boundary — and why this split is safe

Computed by `.verify/scan-admin-boundary.mjs` (transitive import closure over `src/`, `@/` and
relative specifiers):

```
total files under src/            1352
admin seed files                  113
web seed files                    656

A  admin closure                  268
W  web closure                    1148
A \ W  admin-only (can MOVE)      118
A ∩ W  shared (stays in app)      150
W \ A  web-only (stays in web)    998
```

**The load-bearing result: the shared set is closed — 0 violations.** No file in `A ∩ W` imports a
file that is web-only or admin-only. Verified explicitly (not inferred) by walking every shared
file's resolved imports and reporting any that land outside the shared set:

```
shared files: 150
VIOLATIONS (shared -> web-only leak): 0
```

Two more cross-direction checks, also **0**, which the revised design depends on:

- `shared → admin-only`: 0 — so the shared set needs nothing from admin.
- `admin-only → web-only`: 0 — so admin never reaches a web-only file. This is what makes it safe for
  admin to keep using `@/` for shared code (§5): the alias points at `apps/airesume_app/src`, and no admin file
  can accidentally land on web-only code, because none of them reference any.

### What moves, and what stays

**`A \ W` — 118 files, move into `apps/admin`:**

| Dir | Files | Notes |
| --- | --- | --- |
| `app` | 71 | 3 pages + 67 API routes + admin layout |
| `components` | 42 | `src/components/admin/**` |
| `lib` | 4 | `lib/config/adminConfig.ts`, `lib/config/adminTheme.ts`, `lib/utils/adminAuth.ts`, `lib/utils/currencyConverter.ts` |
| `models` | 1 | `models/AdminAuditLog.ts` |

**`A ∩ W` — 150 files, stay in `apps/airesume_app/src` and are consumed through the admin app's `@/` (see §5):**

| Dir | Files | Notes |
| --- | --- | --- |
| `lib` | 74 | `services` 15, `utils` 10, `auth` 8, `payment` 6, `ingestion` 5, `cache` 3, `repositories` 2, + singletons |
| `models` | 45 | of 62 total — the shared Mongoose models |
| `components` | 21 | `ui` 14 (of 53), `auth` 6 (`UnifiedAuthPage`), `payment` 1 |
| `types` | 5 | e.g. `types/pricing.ts` |
| `hooks` | 2 | `use-toast.ts`, `useDebounce.ts` |
| `workers` | 2 | shared worker helpers |
| `contexts` | 1 | `ThemeContext` |

## 3. Target layout

```
/
├── package.json                 # thin task runner — NO workspaces (see §0.1)
├── Dockerfile                   # targets: runner (web), admin, worker
├── apps/
│   ├── app/                     # the web app — 100% UNTOUCHED, config included
│   │   ├── src/app/             # (minus admin)
│   │   ├── src/components/      # (minus admin)
│   │   ├── src/lib/             # web-only AND shared, all in place
│   │   ├── src/workers/entry.ts # the worker bundle entry
│   │   ├── src/proxy.ts         # web: redirects /admin/* → admin domain
│   │   ├── next.config.ts       # UNCHANGED — needs no @shared alias (§5)
│   │   ├── tsconfig.json        # UNCHANGED
│   │   └── node_modules/        # resolves deps for BOTH apps' shared code
│   └── admin/                   # the 118 admin-only files — private repo (submodule)
│       ├── src/app/             # admin pages + /api/admin/*
│       ├── src/app/layout.tsx   # NEW — trimmed root layout (see §4)
│       ├── src/app/globals.css  # GENERATED — full copy of the web stylesheet (sync:styles)
│       ├── src/components/admin/
│       ├── src/proxy.ts         # NEW — admin gate (only admin traffic served)
│       ├── scripts/             # init-env.mjs (env deltas) + sync-styles.mjs (the CSS copy)
│       ├── next.config.ts       # NEW — root=apps/; @ and @shared → ../airesume_app/src, @admin → ./src
│       ├── tsconfig.json        # NEW — @/* → ../airesume_app/src/*, @shared/* → ../airesume_app/src/*, @admin/* → ./src/*
│       ├── package.json         # @buildai/admin, own lockfile
│       ├── node_modules/        # admin's own deps — a plain, non-workspace install
│       └── .env.example         # template only; real values never committed
└── (no packages/)
```

`apps/admin` is added to the public repo as a **git submodule** pointing at its own private remote.
On disk it sits at `apps/admin`, so `../../airesume_app/src` resolves normally; for Dokploy the build context
stays the repo root with submodules initialised.

## 4. ⚠️ The 150 is a floor, not the shared set

The closure counts what admin **imports today**. But several things admin *uses* are currently
supplied by the shared root layout `src/app/layout.tsx`, so nothing in admin imports them and they
were classified web-only. The split must **promote** them, or admin will not render:

| Item | Today | Why admin needs it |
| --- | --- | --- |
| `src/app/globals.css` | root layout imports it | every admin component uses Tailwind classes + `ADMIN_THEME` |
| `src/lib/fonts.ts` (`geistFont`) | root layout `<body className>` | admin root layout must reproduce the font variables |
| `src/components/providers/SessionProvider.tsx` | via `ClientProviders` | `useSession()` is used by the admin dashboard page |
| `tailwind.config.js` / `postcss.config.js` | repo root | both apps compile Tailwind; admin needs its own copy |
| `next-env.d.ts`, Sentry config | repo root | per-app build needs them |

Because shared code stays in `apps/airesume_app/src`, these promotions are **free** — they are already in the
right place. Admin simply aliases to them. Only `tailwind.config.js` / `postcss.config.js` need
duplicating, since Tailwind resolves config relative to the app.

Conversely, the admin root layout should **not** copy `DeferredAnalytics`, `GlobalCommandBar`,
`ResourceHints` or the marketing metadata — those are web concerns. The admin layout is a *trimmed*
recreation, not a copy.

## 5. Import strategy

### The alias rule — `@/` is the shared tree, `@admin/` is admin's own

The non-obvious decision: in the admin build, **`@/` resolves to the app's `src`, not admin's own**.

| Alias | Resolves to | Used for |
| --- | --- | --- |
| `@/*` | `<repo>/apps/airesume_app/src/*` | the shared set — *and* the ~151 shared files' own internal imports |
| `@shared/*` | `<repo>/apps/airesume_app/src/*` | a synonym for the above (compatibility + the escape hatch) |
| `@admin/*` | `<repo>/apps/admin/src/*` | the 118 admin-only files |

Why invert rather than repoint the shared set at `@shared/…`:

* An alias is resolved **per-BUILD from the project's own import map** — Turbopack states this in its
  own error text: `Import map: aliased to relative './src/lib/cache' inside of [project]/admin`.
* Every shared file already writes `@/lib/…` internally, so pointing admin's `@/` at `apps/airesume_app/src`
  makes all ~151 of them resolve **unedited**.
* The alternative rewrites ~225 specifiers across ~151 files **in the production app** in order to buy
  a tidier namespace in the new one. The blast radius belongs in `apps/admin`.

```ts
// apps/admin/next.config.ts — `__dirname` is apps/admin
const SHARED_SRC = path.resolve(__dirname, '../airesume_app/src');   // apps/airesume_app/src
const ADMIN_SRC  = path.resolve(__dirname, 'src');          // apps/admin/src

turbopack: {
  root: path.resolve(__dirname, '..'),                      // apps/  (required)
  resolveAlias: { '@': SHARED_SRC, '@shared': SHARED_SRC, '@admin': ADMIN_SRC },
}
```

`root` **and** `resolveAlias` **and** the tsconfig `paths` entry are all required — see §5.1.

> ⚠️ **`root` must be an ancestor of every alias target, but the repository root is the wrong choice.**
> §0.1 point 2 records that `turbopack.root: <repo root>` makes Turbopack watch the whole monorepo — a
> 74k-file root `node_modules` plus `brag-output/`. `apps/` is the smallest root that contains both
> targets. `apps/admin/next.config.ts` asserts this relationship at load time and throws with an
> explanatory message, because a target outside `root` fails *silently* at build time.

> ⚠️ **`'@'` is a bare key, and that is a documented risk.** Next's docs do not specify whether
> `resolveAlias` keys match on a segment boundary or as a plain string prefix. A plain-prefix matcher
> would also swallow every scoped package — `@sentry/nextjs`, `@aws-sdk/client-s3`, `@dnd-kit/core` —
> failing loudly, once per package. Webpack's `resolve.alias`, which Turbopack's is documented as
> being "similar to", is segment-aware and would be fine. **Escape hatch:** delete `'@'` and rename
> admin's `@/…` imports to `@shared/…`; `@shared` is pre-wired for exactly that.

### The codemod

**One pass, and it touches only admin-only files.** The shared set is not rewritten at all.

| Reference | Action |
| --- | --- |
| admin-only → **another admin-only** file | → `@admin/…` — the target moves, so `@/` no longer reaches it |
| admin-only → shared, written **relative** | → `@/…` — the relative path stops reaching across the split |
| admin-only → shared, already written `@/…` | **left alone** — `@/` still means `apps/airesume_app/src` |
| admin-only → admin-only, written **relative** | **left alone** — both files move, layout preserved |

The **520 web-only files are untouched**, the **~151 shared files are untouched**, and the web app's
config is untouched. The web app receives **zero** edits from the entire split.

Rule, in one line: **rewrite a specifier only when the move breaks it.**

### 5.1 The three-part requirement (verified by building, not assumed)

An alias to a target **outside the app directory** does **not** resolve from tsconfig alone. Turbopack
needs **all** of `turbopack.root`, `turbopack.resolveAlias`, **and** the tsconfig `paths` entry (for
`tsc` and the editor). `root` alone fails; `resolveAlias` alone fails; tsconfig alone fails.

> ⚠️ **A green build can prove nothing.** The first probe "passed" while proving nothing: it lived at
> `src/app/__probe/`, and **Next treats a leading-underscore directory as a private folder** — never
> compiled, never resolved, never failed. Renaming it to `probe-check` failed instantly with
> `Module not found`. **Confirm the route appears in the build manifest before believing a probe.**

## 6. Phases

Each phase is independently shippable, verifiable and reversible. Do not combine them.

### Phase 0 — revert to pristine ✅ DONE

The app was restored: root `package.json` `workspaces` removed, `apps/airesume_app/tsconfig.json` `@shared/*`
path removed, `apps/airesume_app/next.config.ts` turbopack block and `node:path` import removed.

**Still to delete** (needs a shell): `packages/shared/` (3 files), `apps/airesume_app/src/app/probe-check/`,
the root `package-lock.json` written by the failed workspace install, the stale
`apps/airesume_app/package-lock.json`, and `/tmp/cvcircle-app-nm-backup` (1.4 GB).

### Phase 1 — the admin aliases ✅ DONE (the web app is never touched)

`apps/admin/next.config.ts` (`turbopack.root = apps/`, `resolveAlias` for `@`, `@shared`, `@admin`) and
`apps/admin/tsconfig.json` (the matching `paths`). There is **no Phase-1 codemod** any more — the
shared set is not rewritten, so there is nothing to rewrite on the app's side.

**Gate:** `apps/airesume_app` is untouched, so its build and tests must be identical to the pre-change baseline
— 5 documented pre-existing failures / 677 passing. Nothing under `apps/airesume_app` may appear in the diff.

### Phase 2 — create `apps/admin`

4. ✅ **Done** — `apps/admin` exists with its own `package.json`, `tsconfig.json`, `next.config.ts`,
   Tailwind/PostCSS configs, `scripts/` (`init-env.mjs`, `sync-styles.mjs`) and `.env.example`;
   `npm install` runs plain (no workspaces). `npm run sync:styles` regenerates `globals.css` as a full
   copy of the web stylesheet.
5. ⬜ **Outstanding** — `git mv` the 118 admin files into `apps/admin/src/` and run the codemod
   (one pass, admin-only files only).
6. ✅ **Done** — `apps/admin/src/app/layout.tsx` (§4), `src/proxy.ts` (the gate), the trimmed
   `next.config.ts`, `src/components/providers/AdminProviders.tsx`, and the two API routes.
7. **Gate:** `next build` in `apps/admin` succeeds; run both apps on different ports and confirm
   admin login → dashboard → a data-backed tab (e.g. Management → Users) works.

### Phase 3 — Dockerfile + Dokploy + the redirect

8. Add an `admin` target to the Dockerfile sharing the `deps` layer. The `worker` target must keep
   working unchanged. **⚠️ Cannot be build-verified locally — Docker is unavailable. Flag as unbuilt.**
9. Add the web-side redirect, **feature-flagged on `ADMIN_APP_URL`**: unset → today's behaviour.
10. Create the Dokploy application (`dockerBuildStage: admin`), domain `admin.buildairesume.com`,
    env = the web env **plus** `APP_TIER=admin` and `NEXTAUTH_URL=https://admin.buildairesume.com`.
11. **Gate:** the §9 verification list.

### Phase 4 — cleanup

12. Delete the now-dead `isAdminHost` rewriting from the web proxy; keep only the redirect.
13. Update `AGENTS.md`, `docs/deployment/` and the deploy runbook.

### Optional Phase 1.5 — the quick win

If the separate Dokploy application is wanted **before** the code split lands, deploy a second
application from the *current* image with `APP_TIER=admin` and an env gate in `proxy.ts` that serves
only `/admin/*` + `/api/admin/*`. Hours, not weeks; the gate and domain survive into the final
design. This is the same pattern as the worker migration.

## 7. Risks

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | **Build time roughly doubles.** Two Dokploy applications each run a full `next build` on a 4-core / 7 GB box — the exact OOM risk `dokploy-worker-migration-plan.md` §4 flags. | High | High | Share the `deps` layer across targets; consider path-filtered autoDeploy so an admin-only change does not rebuild web and vice versa. Measure `free`/`df` on the first admin build before enabling `autoDeploy`. |
| 2 | **Env re-entry by hand.** Dokploy stores env encrypted at rest (`enc:v1:`), so it cannot be cloned by SQL. A missing var is a silent failure. | High | High | Create through the Dokploy UI; diff the running admin container's env names against the web container's before cutover. |
| 3 | **Auth is per-host.** The session cookie is host-only (no `domain` attribute), so a web session does not carry to `admin.buildairesume.com` and vice versa. `NEXTAUTH_URL` must be the admin host or `isSecureSessionCookie()` mis-derives the cookie name. | Medium | Medium | Set `NEXTAUTH_URL=https://admin.buildairesume.com` on the admin app. Accept separate sessions, or set a shared `.buildairesume.com` cookie domain as a deliberate follow-up. |
| 4 | **Import rewrite.** A codemod touches the shared set and the admin set. | Medium | Medium | Only rewrite specifiers that resolve into the shared set; verify with per-app `tsc`; keep everything in one repo so one revert undoes it. |
| 5 | **Root-layout gaps (§4).** Fonts / `globals.css` / `SessionProvider` missing → admin renders unstyled or throws on `useSession`. | High if missed | Medium | Treat §4 as a checklist; the Phase 2 gate explicitly exercises login + a data-backed tab. |
| 6 | **`next.config.ts` port.** The web config carries bespoke webpack/Sentry/polyfill work. | Medium | Medium | Port a trimmed copy; do not copy the PostHog rewrites or marketing redirects. |
| 7 | **Worker build breaks.** `build:worker` bundles `src/workers/entry.ts`, which stays put under the revised design. | Low | High | Re-run `npm run build:worker` after every phase regardless — it is only ~4 s. |
| 8 | **Two proxies to keep in step.** The web redirect and the admin gate must agree. | Low | Medium | One shared constant for the admin origin (`ADMIN_APP_URL`). |
| 9 | **`@shared` drift.** Nothing structurally prevents a future admin file from importing web-only code, since the alias exposes all of `apps/airesume_app/src`. | Low | Medium | Today the closure proves it is 0. Add `.verify/scan-shared-import-surface.mjs` (or the boundary scanner) to CI so a regression fails a check rather than a deploy. |

## 8. Rollback

- **Code:** everything lands in one repo on a feature branch. `git revert` the phase's commits.
- **Redirect:** feature-flagged on `ADMIN_APP_URL`. Unset it → the web app serves `/admin/*` exactly
  as today, with no build.
- **Dokploy:** delete the admin application. The web app is untouched throughout.
- **Phase 1 is an admin-side alias only — the web app has no edits to revert.** Rollback is a revert
  with no data or config implications.

## 9. Verification (must all hold)

```bash
# boundary is still clean (must print VIOLATIONS: 0)
node .verify/scan-admin-boundary.mjs

# the import surface, after the codemods (all four integrity checks must be 0)
node .verify/scan-shared-import-surface.mjs

# web app: must be byte-identical behaviour to before (0 web-only files rewritten)
cd apps/airesume_app && npx next build

# admin app
cd apps/admin && npx next build

# the worker still bundles
npm run build:worker

# type-check each app (repo-wide tsc dies — use the per-app configs)
npx tsc -p apps/airesume_app/tsconfig.json --noEmit
npx tsc -p apps/admin/tsconfig.json --noEmit

# baseline: exactly the 5 documented pre-existing failures
npx vitest run

# on the box, after cutover
curl -s https://admin.buildairesume.com/api/health
curl -sI https://buildairesume.com/admin/dashboard   # → 301 to admin.buildairesume.com
```

## 10. Open decisions

1. **Separate admin sessions.** Confirm that signing into the web app should *not* sign you into
   admin. If it should, the cookie domain has to be widened deliberately.
2. **Submodule vs subtree for `apps/admin`.** Submodule keeps the public repo clean and the admin
   source private; it does mean every clone needs `--recurse-submodules` and Dokploy needs a deploy
   key for the private remote.
3. **Phase 1.5 or straight to the split?** Phase 1.5 buys the separate Dokploy app in hours.
