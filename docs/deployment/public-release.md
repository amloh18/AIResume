# Publishing AIResume as a public repository

**Status: 🔴 NOT READY TO PUBLISH. Two P0 blockers are open — both are documented below and both are
still unexecuted as of 2026-10-05.**

Written 2026-10-04, revised 2026-10-05. Target: a public, MIT-licensed monorepo named **AIResume**.

---

## 0. What is actually blocking the publish (verified 2026-10-05)

**P0-1 (admin extraction) is now DONE — both apps build and no admin file is in git's index.**
**P0-2 (internal docs) is still open and is now the single remaining structural blocker.**
**P0-3 (the two blind release gates) is fixed in code but has not been re-run against the tree.**

The write-ups below keep their original "pending" framing where the reasoning still applies; each now
carries a status line.

### P0-1 — the admin panel is still inside the public app — ✅ **RESOLVED 2026-10-05**

> **Status: done.** The codemod has run, both apps build, and the admin files are **not** in git's index.
> The original write-up is kept below because the *trap* it records — a `.gitignore` rule that looks like
> a safety net while the thing it guards is already tracked — is exactly the trap that fired again during
> the move. See "What the move actually required" immediately after.

The codemod that moves the admin surface out has **never been run**. Measured on disk:

| Path under `apps/airesume_app/src` | Count |
| --- | --- |
| `app/api/admin/**/route.ts` | **67** |
| `app/admin/**` (dashboard catch-all, login, unauthorized) | 3 |

`README.md` currently tells the public that *"the admin panel is maintained in a separate private
repository [and] its source is intentionally not part of this public repository."* That statement is
**false today**. `apps/admin/` exists as a hand-written scaffold, but the source it is supposed to own
is still in the app.

> ⚠️ The root `.gitignore` excludes `/apps/admin/`, and the comment above that rule reads as though the
> move already happened. **It protects an almost-empty scaffold while the real admin source sits in the
> public tree.** A rule that looks like a safety net and is not one is worse than no rule.

Fix — one command, then the gates:

```bash
node .verify/codemod-admin-split.mjs           # dry run: prints the move plan and the rewrites
node .verify/codemod-admin-split.mjs --apply   # moves the admin-only set into apps/admin/src
```

It refuses to run if any cross-direction invariant is non-zero, and it will not overwrite the
hand-written files already in `apps/admin` (it deletes the app-side source instead). Then:

```bash
cd apps/airesume_app   && npx next build
cd apps/admin && npx next build
NODE_OPTIONS=--max-old-space-size=4096 npx tsc -p apps/admin/tsconfig.json --noEmit
```

#### What the move actually required (measured, 2026-10-05)

The move itself was 114 files and took one command. Four separate things broke afterwards, none of them
predicted by the plan:

1. **Seven undeclared dependencies** — `lodash`, `@types/lodash`, `xlsx`, `posthog-node`, `razorpay`,
   `@polar-sh/sdk`, `zustand`, plus `@types/jsonwebtoken`. The scaffold's dependency list was derived by
   hand and was wrong; `xlsx` had been written off as "web-only" while an admin component imports it.
2. **Two `node_modules`, therefore two type identities.** `next` and `next-auth` are each installed in
   both apps. `NextResponse` carries a `[INTERNALS]` property keyed by a `unique symbol`, so two installs
   are structurally incompatible (81 TS2345), and `getServerSession(authConfig)` mismatched across the
   `next-auth` copies (20 more). **The bundler pins `next`/`react` and aliases `next-auth`; `tsc` knows
   about neither**, so both must *also* be mirrored in admin's tsconfig `paths`.
3. **Ambient declarations must be `include`d, not merely imported.** The app's NextAuth `Session`
   augmentation lives in `apps/airesume_app/src/types/*.d.ts`; without an explicit include the admin program saw
   `session.user` as optional and without an `id`.
4. **`tsc` needs `--max-old-space-size=4096`** — `.next/types` pulls the whole shared tree into one
   compilation, and without the flag it is killed with exit 137 and no diagnostic.

> ⚠️ **The trap fired again, in a new place.** The codemod **staged** its 114 moved files into git's
> index, and **ignore rules do not apply to tracked files** — so `/apps/admin/` stopped protecting
> anything and a commit would have published the panel. HEAD had zero admin files. Fixed with
> `git rm -r -f --cached apps/admin` (index only; the 127 files stay on disk). **After any bulk move, run
> `git diff --cached --name-only | grep -c "^apps/admin/"` and expect `0`.**

Gates after the fix: admin build ✅ 38 pages · app build ✅ 301 pages · admin type-check ✅ exit 0 ·
`vitest run` ✅ the documented 5 failures / 3 files · `next start` serves `/admin/login` (200) and
redirects `/`, `/admin`, `/admin/dashboard` to it (307).

### P0-2 — the internal ops documentation is still public — ✅ RESOLVED 2026-10-05

`docs/` held 101 markdown files; exactly four may be public (`README`, `app-guide`, `self-hosting`,
`configuration`). None of the rest are tracked any more — `.gitignore` is deny-by-default (`*.md`
plus an explicit allowlist), so they stay on disk and out of git. That set includes
`docs/communication-system/dns-records.md`, which carries the production VPS's **real public IPv4
and IPv6 addresses**.

Untracking is the lesser half. **A file removed from the working tree is still in every clone of
the old history**, so `scripts/publish/prepare-public-release.sh` purges the internal documents from
EVERY commit. It derives that list from history using the same regex §4 verifies against, so the
purge and the check cannot drift apart.

⚠️ The old `node .verify/docs-visibility.mjs --apply` tool is **deleted** — do not look for it.
Three independent reasons:

1. It moved documents into `apps/admin/docs/` and re-added a `/apps/admin/` ignore rule. Both are
   wrong now: admin is tracked in the private monorepo, and its purge happens in the release script.
2. Its `--apply` would have silently untracked the entire admin panel.
3. Worst: it carried the production VPS IPv4/IPv6, both Dokploy application ids and the Atlas
   cluster id as *detection markers* — in a tracked file. **The guard published exactly what it
   guarded**, and `.verify/scan-secrets.mjs` reported "no hits" the whole time, correctly, because
   those are not credential *shapes*.

Those identifiers are now handled out of band via `$SECRET_REDACTIONS_FILE`, which must live
outside the repository. §4 verifies every literal in it is actually gone — a `--replace-text` rule
that matches nothing still prints CLEAN, so "we redacted it" is not evidence.

### P0-3 — two release gates would have passed while shipping live credentials

Both were hardened on 2026-10-05; both were green against the leaks they should have caught.

| Gate | The blind spot | Now |
| --- | --- | --- |
| `.verify/scan-secrets.mjs` | the assignment rule required a **12-character** value, so `PROD_ADMIN_PASSWORD = 'Y@nknenadd1'` (11) passed; the name list had no bare `token`, so `INGESTION_WORKER_TOKEN` passed | floor is **8**; bare `token`/`credential` added; the `env.X \|\| 'literal'` fallback shape added; template files exempted from the assignment rules only |
| `scripts/publish/prepare-public-release.sh` | the verification grep covered 4 shapes and **none** of the new leak classes; the purge list did not include the private tree or the internal docs | shape list mirrors the scanner; purge list covers `apps/admin`, the internal docs, the registers; verification denies by default on `docs/` |

**Neither gate can redact a bare literal it does not know about.** The release script now takes literal
redactions out of band via `SECRET_REDACTIONS_FILE`, because a script that is itself published cannot
contain the password it exists to remove.

### Not blockers, but do them in the same pass

- `packages/shared/` (3 files) and `apps/airesume_app/src/app/probe-check/` — debris from the abandoned
  shared-package design. Still in the tree.
- Root `robots.txt` (a mirror; the served copy is `apps/airesume_app/public/robots.txt`) and root
  `BingSiteAuth.xml` (duplicate of the one in `public/`). Both now in the purge list.
- `scripts/.vps-status.json` — tracked, and it leaks a developer's absolute filesystem path.
- `.gitignore` still ends in `!/docs/**`. Narrowing it is a **guard for the next document, not a fix for
  the existing 96** — ignore rules do not apply to files already in the index. Patch in §6.

---

## 1. What the audit found

A read-only sweep of the working tree, the index and the full git history. Every credential below was
confirmed present; **no value was ever printed** — detection and redaction were done by scripts that
report only key names, file paths and match counts.

### 🔴 Three env files in git history

Deleted from `HEAD` but still reachable from every clone:

| File | Added in | Contained (key names) |
| --- | --- | --- |
| `.env.local.backup` | `114c3c3f` | `MONGODB_URI`, `OLD_/NEW_MONGODB_URI`, `JWT_SECRET`, `NEXTAUTH_SECRET`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `EMAIL_SERVER_PASSWORD`, `GOOGLE_CLIENT_SECRET`, `APPLE_SECRET` |
| `.env.local.backup2` | `272cc14f` | `MONGODB_URI`, `JWT_SECRET`, `NEXTAUTH_SECRET`, 7× `NEXT_PUBLIC_FIREBASE_*` |
| `.env.new` | `a09daa72` | `MONGODB_URI`, `OLD_/NEW_MONGODB_URI`, `JWT_SECRET`, `NEXTAUTH_SECRET`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `EMAIL_SERVER_PASSWORD` |

### 🔴 Live credentials in tracked files

Three tracked docs carried credential-bearing MongoDB URIs — 10 occurrences in total, including a real
Atlas cluster identifier:

- `docs/mongodb-local-vps-migration.md` — 8
- `docs/MIGRATION.md` — 2
- `docs/application-automation/deploy-verification.md` — 1

### 🔴 A local database directory in the index

`.tmp-mongo/` — **367 files, 47 MB** of WiredTiger data. Database files can contain real documents.
Never source.

### 🟡 A real env file tracked instead of a template

`deploy/docker/.env.stalwart` (values were placeholders, but the filename is wrong for a committed file).

### 🟡 Real identifiers in the env template

`env.example` shipped the actual Firebase project id, sender id, app id, storage bucket and
measurement id. Not secrets, but not example values either.

### 🟢 Clean

- `src/`, `scripts/`, `deploy/`, `Dockerfile` — **zero** hardcoded secrets. The 103 initial
  "secret assignment" hits were all documentation examples under `.claude/skills/`.
- `.env.local` (125 keys) is correctly untracked.

---

## 2. What has been done

| # | Change | Where |
| --- | --- | --- |
| 1 | Redacted all 10 credential-bearing URIs + the Atlas cluster id + 3 real secret assignments | `docs/**` (via `.verify/redact-docs.mjs`) |
| 2 | Replaced the real Firebase identifiers with placeholders | `env.example` |
| 3 | Hardened the env rules to every depth, with explicit template negations | `.gitignore` |
| 4 | Added rules for local databases and dumps | `.gitignore` |
| 5 | Untracked `.tmp-mongo/` (kept on disk) | index |
| 6 | Untracked `deploy/docker/.env.stalwart` (kept on disk) | index |
| 7 | Fixed the blanket `*.md` rule that was silently swallowing release docs | `.gitignore` |
| 8 | Added `LICENSE` (MIT), `README.md`, `SECURITY.md`, `CONTRIBUTING.md` | repo root |
| 9 | Wrote and **tested** the history-purge script | `scripts/publish/prepare-public-release.sh` |
| 10 | Added a credential scanner | `.verify/scan-secrets.mjs` |

The purge script was run against a throwaway clone and reported **CLEAN**: the three env files, the
data directory and the env file are absent from all history, and no credential shape survives in any
reachable blob.

---

## 3. ⚠️ Rotate before you publish

**Removing text is not remediation. Rotation is.** Everything in §1 must be treated as compromised —
it has existed in a git history for months.

| Credential | Provider action |
| --- | --- |
| MongoDB user password (Atlas **and** the internal `mongodb:27017` user) | Rotate the database user; update every consumer's env |
| `JWT_SECRET`, `NEXTAUTH_SECRET`, `BETTER_AUTH_SECRET` | Rotate — **this invalidates every active session** |
| `GEMINI_API_KEY`, `PERPLEXITY_API_KEY` | Revoke and reissue |
| `EMAIL_SERVER_PASSWORD`, `STALWART_*_PASSWORD` | Rotate the mailbox password |
| `GOOGLE_CLIENT_SECRET`, `APPLE_SECRET` | Roll the OAuth client secrets |
| Stripe / Razorpay live keys | Roll in the dashboard |
| Firebase service-account key | Delete the key, issue a new one |
| `CRON_SECRET`, `INGESTION_WORKER_TOKEN`, `KV_URL`/`REDIS_URL` | Rotate |

Rotate **first**, then purge. Purging first only removes the text, not the access.

---

## 4. The restructure — done, except the admin extraction

### Step A — extract the admin panel out of the app — NOT DONE

The admin source currently lives **inside** the app (`apps/airesume_app/src/app/admin`,
`apps/airesume_app/src/components/admin`, `apps/airesume_app/src/app/api/admin`, 67 API routes). Because admin must not
be public, it has to come out before this repository can be published as-is.

The measured boundary is in `docs/deployment/admin-split-plan.md`: **118 admin-only files move, 150
shared files become a package, 998 stay in the app.** The shared set is closed — verified, zero
leaks — so the extraction is clean.

**Gate:** both apps build; admin login → dashboard → a data-backed tab works.

### Step B — move the app to `apps/airesume_app` — DONE

`apps/airesume_app/` holds the Next.js app: `src/`, `public/`, `tests/`, `scripts/` (app-owned tooling), and
every config (`next.config.ts`, `tsconfig*.json`, `vitest*`, `eslint.config.mjs`, `tailwind.config.js`,
`postcss.config.js`, `components.json`, `.npmrc`, `.env.example`, `package.json`, `package-lock.json`).

Two things had to be handled that the original plan missed:

1. **`scripts/build-worker.mjs` needed no edit at all.** It derives its project root from
   `import.meta.url`, so moving it to `apps/airesume_app/scripts/` alongside `src/` kept every derived path
   (`src/workers/entry.ts`, `dist/worker.mjs`, `tsconfig.json`, the shims) correct. Verified by
   running it.
2. **The app-owned scripts had to move with `src/`, not stay at the root.** Twenty-nine of them
   import `../src/...`, so `scripts/` and `src/` must remain siblings. The root `scripts/` now holds
   only host/VPS tooling (the JobSpy and LinkedIn workers, the worker gateway, `vps-*.sh`, audit
   scripts).

**Verified:** `npm run build:worker` (947 KB bundle, externals resolved), `next build` (full route
manifest, exit 0), `npx vitest run` → **5 failures in 3 files, 677 passing — identical to the
pre-move baseline.**

### Step C — move the worker to `apps/resumebuilder-worker` — DONE

Self-contained; it never imports the app's `src/`, so its Dockerfile and compose file stayed valid
and needed no changes.

**One real defect fixed:** the service had **no committed `package-lock.json`**, so its Dockerfile's
`npm ci` could never have succeeded. A lockfile is now committed (272 packages) and `npm ci` +
`npm run build` were both run to confirm.

### Step D — introduce npm workspaces — DELIBERATELY NOT DONE

The plan called for `"workspaces": ["apps/*", "packages/*"]` and a single root lockfile. That was
dropped after measuring, for two reasons:

- **npm workspaces hoist to one root `node_modules` and one root lockfile.** The job-ingestion
  service builds from its **own** Docker context (`apps/resumebuilder-worker`), where the root
  lockfile is not present — so a workspace root lockfile would break its image build. Its runtime is
  also different (Node 20 Alpine vs Node 22 Bookworm) and it shares no source with the app.
- The two projects share **zero** code, so workspaces would buy deduplication that never happens
  while adding real coupling.

Instead each project keeps its own lockfile and the root `package.json` is a thin task runner that
delegates via `npm --prefix`. Each project installs and deploys independently, which is the actual
goal. If the admin app is later extracted into `apps/admin`, revisit this: the app and admin *would*
share code, and that is the case workspaces are for.

**Update (2026-10-04, after the admin split was attempted): revisited — and workspaces are still not
the answer.** Admin consumes the app's shared code by **inverting its own alias**: in the admin build
`@/` means `apps/airesume_app/src` (`@shared/*` is kept as a synonym), so the shared files never move and keep
resolving their npm dependencies from `apps/airesume_app/node_modules` via the ordinary ancestor walk. No
hoisted root `node_modules` is needed, so no workspaces. Extracting a `packages/shared` instead would
force workspaces **and** break the 520 web-only files that reach the shared set through `@/` — a path
alias is per-build, not per-directory. Measurements in `admin-split-plan.md` §0.1.

---

## 5. Release procedure

Once §3 is done and §4 has landed:

```bash
# 1. commit the security work
git add -A && git commit -m "chore: prepare for public release — secrets, env templates, licence"

# 2. rewrite history on a clone (never on your working tree)
GIT_FILTER_REPO=/path/to/git-filter-repo \
  ./scripts/publish/prepare-public-release.sh /tmp/AIResume-public

# 3. read the verdict. It must say CLEAN. If it says NOT CLEAN, do not push.

# 4. create the empty public repo on GitHub (do NOT initialise it with a README), then:
cd /tmp/AIResume-public
git remote add origin git@github.com:<you>/AIResume.git
git push origin --all
git push origin --tags
```

### Post-push checks

```bash
# the tree is clean of credential shapes
node .verify/scan-secrets.mjs

# no env file is tracked
git ls-files | grep -E '(^|/)\.env' | grep -v '\.example' || echo "ok — only templates tracked"

# no data directory is tracked
git ls-files | grep -E '\.(wt|bson)$' || echo "ok — no database files"
```

Then, in the GitHub UI:

- Set the repository to **Public** and confirm the licence is detected as **MIT**.
- Enable **secret scanning** and **push protection** (Settings → Code security).
- Confirm no Actions secrets, no Environments, and no deploy keys were created.

---

## 6. Open question — should the internal ops docs be public?

`docs/` is tracked in full and contains operational runbooks: VPS topology, internal service names and
ports, deployment procedures, and the admin panel's dependency map. The credentials are gone, but the
**infrastructure detail is still there**, and it is not obviously something you want indexed publicly.

Options:

1. **Publish `docs/` as-is** — everything is redacted, so nothing sensitive leaks. Simplest.
2. **Exclude the ops docs** — keep `docs/application-automation/`, `docs/deployment/`,
   `docs/mongodb-local-vps-migration.md`, `docs/MIGRATION.md` out of the public repo (move to a
   private repo, or add to `.gitignore`). Keeps the public repo to product documentation only.

Recommendation: **option 2.** A public MIT repository does not need your VPS runbooks, and the safest
document is the one that was never published.

---

## 7. ⚠️ The working tree and the history are two different problems

Moving a document into the private tree, or deleting it at HEAD, removes it from the *working tree*.
It does **not** remove it from any clone of the old history — and a public clone is a full-history
clone. `docs/communication-system/dns-records.md` has been tracked, so **the production VPS addresses
must be treated as disclosed.**

That makes the history rewrite mandatory, not optional, and it is the reason
`scripts/publish/prepare-public-release.sh` now purges these paths from **every commit** rather than
relying on the docs move:

```
docs/communication-system/dns-records.md
docs/mongodb-local-vps-migration.md
docs/MIGRATION.md
docs/deployment
docs/application-automation
server_bugs.md
refactor_audit.md
apps/admin
packages/shared
apps/airesume_app/src/app/probe-check
scripts/.vps-status.json
BingSiteAuth.xml
```

Its verification step now denies by default on `docs/`: every `.md` under `docs/` that has ever
existed must match `docs/(README|app-guide|self-hosting|configuration).md`, or the run fails. It also
scans every reachable blob for 13 credential shapes, not 4.

**Purging is still not remediation.** Removing the text does not remove the access — rotate first
(§3), then purge.

---

## 8. The `.gitignore` docs allowlist — exact change

`!/docs/**` is the rule that made all 96 internal documents public. Replace it with the four-file
allowlist, and fix two adjacent defects found on 2026-10-05:

```gitignore
# REMOVE:  !/docs/**
# ADD:
!docs/README.md
!docs/app-guide.md
!docs/self-hosting.md
!docs/configuration.md

# ADD — `CLAUDE.md` is in the tree and public by design, but was never allowlisted, so the
# blanket `*.md` rule above was silently dropping it. Same failure mode as SB-15.
!CLAUDE.md

# REMOVE:  !server_bugs.md   (internal register)
# REMOVE:  !refactor_audit.md (internal register)
```

Then, and only then:

```bash
git rm -r --cached docs        # keeps every file on disk
git rm --cached server_bugs.md refactor_audit.md
git add docs
```

> ⚠️ **Narrowing the allowlist does not untrack anything.** Gitignore rules do not apply to files
> already in the index. The allowlist change is a guard against the *next* internal document; the
> `git rm --cached` is what actually takes the existing ones out. Do the move first, or the private
> tree ends up empty.

This change was **not applied** — the editing tool could not resolve `.gitignore` in this session
(`Read` and `Glob` both reported it missing while `.dockerignore` resolved), and writing it blind would
have destroyed 187 lines of unrelated rules. Apply it by hand.
