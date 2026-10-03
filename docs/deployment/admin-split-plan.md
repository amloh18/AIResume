# Splitting the admin panel into its own app (monorepo)

**Status: PLAN ONLY — nothing here has been implemented.**

Written 2026-10-04 from a read-only measurement of the working tree on `refactor/simple`.

> **Reconciliation with the monorepo move (later the same day).** The web app has since moved to
> **`apps/app/`**, not `apps/web/` — read every `apps/web` below as `apps/app`. The move was done
> *without* npm workspaces (see `docs/deployment/public-release.md` §4 for why), so §3's workspace
> layout and §6's Phase 1 also need that adjustment. The measured boundary in §2 is unchanged and
> still holds: re-running `.verify/scan-admin-boundary.mjs` after the move reports the same **118
> admin-only / 998 web-only / 0 closure violations**.

## 0. Decisions locked

| Question | Decision |
| --- | --- |
| How deep is the separation? | **Full code split (monorepo).** Admin becomes its own Next.js app with shared packages. |
| Admin hostname | **`admin.buildairesume.com`** |
| What the main app does with `/admin/*` | **301 → the admin domain** |

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
A ∩ W  shared (must EXTRACT)      150
W \ A  web-only (stays in web)    998
```

**The load-bearing result: the shared set is closed — 0 violations.** No file in `A ∩ W` imports a
file that is web-only or admin-only. Verified explicitly (not inferred) with
`/tmp/verify-closure.mjs`, which walks every shared file's resolved imports and reports any that
land outside the shared set:

```
shared files: 150
VIOLATIONS (shared -> web-only leak): 0
```

That is what makes the split tractable: `packages/shared` needs **nothing** from either app, so it
can be extracted first and both apps can be moved onto it afterwards.

### What moves, and what is shared

**`A \ W` — 118 files, move into `apps/admin`:**

| Dir | Files | Notes |
| --- | --- | --- |
| `app` | 71 | 3 pages + 67 API routes + admin layout |
| `components` | 42 | `src/components/admin/**` |
| `lib` | 4 | `lib/config/adminConfig.ts`, `lib/config/adminTheme.ts`, `lib/utils/adminAuth.ts`, `lib/utils/currencyConverter.ts` |
| `models` | 1 | `models/AdminAuditLog.ts` |

**`A ∩ W` — 150 files, become `packages/shared`:**

| Dir | Files | Notes |
| --- | --- | --- |
| `lib` | 74 | `services` 15, `utils` 10, `auth` 8, `payment` 6, `ingestion` 5, `cache` 3, `repositories` 2, + singletons |
| `models` | 45 | of 62 total — the shared Mongoose models |
| `components` | 21 | `ui` 14 (of 53), `auth` 6 (`UnifiedAuthPage`), `payment` 1 |
| `types` | 5 | e.g. `types/pricing.ts` |
| `hooks` | 2 | `use-toast.ts`, `useDebounce.ts` |
| `workers` | 2 | shared worker helpers |
| `contexts` | 1 | `ThemeContext` |

## 3. Target layout (npm workspaces)

npm workspaces is chosen because the repo already uses npm (`package-lock.json`, Node 22). No new
tooling is required; Turborepo can be layered on later for task orchestration.

```
/
├── package.json                 # "workspaces": ["apps/*", "packages/*"]
├── tsconfig.base.json           # shared compilerOptions + the @shared/* path
├── Dockerfile                   # targets: runner (web), admin, worker
├── apps/
│   ├── web/                     # the 998 web-only files + imports @shared/*
│   │   ├── src/app/             # (minus admin)
│   │   ├── src/components/      # (minus admin, minus the shared ui subset)
│   │   ├── src/workers/entry.ts # the worker bundle entry
│   │   ├── src/proxy.ts         # web: redirects /admin/* → admin domain
│   │   ├── next.config.ts
│   │   └── package.json         # @buildai/web
│   └── admin/                   # the 118 admin-only files
│       ├── src/app/             # admin pages + /api/admin/*
│       ├── src/app/layout.tsx   # NEW — trimmed root layout (see §4)
│       ├── src/components/admin/
│       ├── src/proxy.ts         # NEW — admin gate (only admin traffic served)
│       ├── next.config.ts       # trimmed copy
│       └── package.json         # @buildai/admin
└── packages/
    └── shared/                  # the 150 shared files (+ §4 promotions)
        ├── src/lib/**  src/models/**  src/types/**  src/hooks/**
        ├── src/contexts/**  src/workers/**  src/components/ui/**
        ├── package.json         # @buildai/shared, subpath exports
        └── tsconfig.json
```

## 4. ⚠️ The 150 is a floor, not the package contents

The closure counts what admin **imports today**. But several things admin *uses* are currently
supplied by the shared root layout `src/app/layout.tsx`, so nothing in admin imports them and they
were classified web-only. The split must **promote** them, or admin will not render:

| Item | Today | Why admin needs it |
| --- | --- | --- |
| `src/app/globals.css` | root layout imports it | every admin component uses Tailwind classes + `ADMIN_THEME` |
| `src/lib/fonts.ts` (`geistFont`) | root layout `<body className>` | admin root layout must reproduce the font variables |
| `src/components/providers/SessionProvider.tsx` | via `ClientProviders` | `useSession()` is used by the admin dashboard page |
| `tailwind.config.js` / `postcss.config.js` | repo root | both apps compile Tailwind; `content` must cover both |
| `next-env.d.ts`, Sentry config | repo root | per-app build needs them |

Conversely, the admin root layout should **not** copy `DeferredAnalytics`, `GlobalCommandBar`,
`ResourceHints` or the marketing metadata — those are web concerns. The admin layout is a *trimmed*
recreation, not a copy.

## 5. Import strategy

`@/` cannot survive unchanged in both apps: `@/lib/services/x` may be shared while
`@/lib/services/y` is web-only, so one alias cannot resolve to two roots.

**Recommended: an explicit `@shared/*` alias + a scripted codemod.**

- `packages/shared/package.json` exposes subpaths (`./lib/*`, `./models/*`, …).
- Both apps' `tsconfig.json` add `"@shared/*": ["../../packages/shared/src/*"]`.
- A codemod rewrites **only** the import specifiers whose resolved target is in the shared set
  (`@/lib/...` → `@shared/lib/...`, etc.). Local targets keep `@/`.
- Every rewrite is verified by `tsc` per app — a wrong rewrite fails the build, it does not fail
  silently.

**Lower-churn alternative** (documented, not recommended): keep `@/` and give each app tsconfig
paths where the more specific prefix wins —
`"@/lib/*": ["../packages/shared/src/lib/*"]` alongside `"@/components/*": ["./src/components/*"]`.
TypeScript resolves longest-prefix-first, so this works, but it leaves `@/lib` meaning "shared"
while `@/components/jobs` means "local" — a standing trap for the next contributor. Prefer the
explicit alias.

## 6. Phases

Each phase is independently shippable, verifiable and reversible. Do not combine them.

### Phase 0 — extract `packages/shared` (no behaviour change)

1. Add `workspaces` to the root `package.json`; add `tsconfig.base.json`.
2. `git mv` the 150 files into `packages/shared/src/…`, plus the §4 promotions.
3. Add the `@shared/*` alias; run the codemod over both the shared set and everything that imports
   it.
4. **Gate:** `npm run build` (web, still at root) succeeds and `npx vitest run` shows only the 5
   documented pre-existing failures.

Runtime behaviour must be identical — the same modules are loaded from a different path.

### Phase 1 — create `apps/web`

5. `git mv` the web app into `apps/web` (`src/`, `next.config.ts`, `public/`, its tsconfig).
6. Update `tsconfig.chips.json` / `.pipeline.json` / `.portal.json`, `vitest.config.ts` and the
   `scripts/` tooling that references `src/`.
7. **Gate:** web builds, `tsc -p tsconfig.*.json` passes, the 5-failure baseline holds.

### Phase 2 — create `apps/admin`

8. `git mv` the 118 admin files into `apps/admin/src/`.
9. Write `apps/admin/src/app/layout.tsx` (§4), `apps/admin/src/proxy.ts` (the gate), and a trimmed
   `next.config.ts`.
10. **Gate:** `npm run build -w @buildai/admin` succeeds; run both apps locally on different ports
    and confirm admin login → dashboard → a data-backed tab (e.g. Management → Users) works.

### Phase 3 — Dockerfile + Dokploy + the redirect

11. Add an `admin` target to the Dockerfile that builds only `@buildai/admin`, sharing the `deps`
    layer with `runner`. The `worker` target must keep working unchanged.
12. Add the web-side redirect, **feature-flagged on `ADMIN_APP_URL`**: unset → today's behaviour.
13. Create the Dokploy application (`dockerBuildStage: admin`), domain
    `admin.buildairesume.com`, env = the web env **plus** `APP_TIER=admin` and
    `NEXTAUTH_URL=https://admin.buildairesume.com`.
14. **Gate:** the §8 verification list.

### Phase 4 — cleanup

15. Delete the now-dead `isAdminHost` rewriting from the web proxy; keep only the redirect.
16. Update `AGENTS.md`, `docs/deployment/` and the deploy runbook.

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
| 4 | **Import rewrite is large.** A codemod touches every file importing shared code. | Medium | Medium | Only rewrite specifiers that resolve into the shared set; verify with per-app `tsc`; keep everything in one repo so one revert undoes it. |
| 5 | **Root-layout gaps (§4).** Fonts / `globals.css` / `SessionProvider` missing → admin renders unstyled or throws on `useSession`. | High if missed | Medium | Treat §4 as a checklist; the Phase 2 gate explicitly exercises login + a data-backed tab. |
| 6 | **`next.config.ts` port.** The web config carries bespoke webpack/Sentry/polyfill work. | Medium | Medium | Port a trimmed copy; do not copy the PostHog rewrites or marketing redirects. |
| 7 | **Worker build breaks.** `build:worker` bundles `src/workers/entry.ts`, which moves. | Medium | High | Update `scripts/build-worker.mjs` and the `worker` target in the same phase; the worker build is only ~4 s, so it is cheap to re-verify. |
| 8 | **Two proxies to keep in step.** The web redirect and the admin gate must agree. | Low | Medium | One shared constant for the admin origin (`ADMIN_APP_URL`). |

## 8. Rollback

- **Code:** everything lands in one repo on `refactor/simple`. `git revert` the phase's commits.
- **Redirect:** feature-flagged on `ADMIN_APP_URL`. Unset it → the web app serves `/admin/*` exactly
  as today, with no build.
- **Dokploy:** delete the admin application. The web app is untouched throughout.
- **Phase 0/1 are path-only changes** — rollback is a revert with no data or config implications.

## 9. Verification (must all hold)

```bash
# boundary is still clean (must print VIOLATIONS: 0)
node .verify/scan-admin-boundary.mjs

# per-app builds
npm run build -w @buildai/web
npm run build -w @buildai/admin

# the worker still bundles from its new location
npm run build:worker

# type-check each app (repo-wide tsc dies — use the per-app configs)
npx tsc -p apps/web/tsconfig.json --noEmit
npx tsc -p apps/admin/tsconfig.json --noEmit

# baseline: exactly the 5 documented pre-existing failures
npx vitest run

# on the box, after cutover
curl -s https://admin.buildairesume.com/api/health
curl -sI https://buildairesume.com/admin/dashboard   # → 301 to admin.buildairesume.com
```

## 10. Open decisions

1. **Move `apps/web`, or leave the web app at the repo root?** Moving it is symmetric and cleaner;
   leaving it is materially less churn (998 files). Recommendation: move it, but it can be deferred
   to a final Phase 5 without affecting anything else.
2. **Shared package granularity.** One `@buildai/shared`, or split into `db` / `auth` / `ui` /
   `core`? Recommendation: one package first — it is a mechanical move, and splitting later is a
   pure refactor with no deploy implications.
3. **Separate admin sessions.** Confirm that signing into the web app should *not* sign you into
   admin. If it should, the cookie domain has to be widened deliberately.
4. **Phase 1.5 or straight to the split?** Phase 1.5 buys the separate Dokploy app in hours.
