# Publishing AIResume as a public repository

**Status: security work DONE. Restructure PENDING (deliberately deferred until it can be build-verified).**

Written 2026-10-04. Target: a public, MIT-licensed monorepo named **AIResume**.

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

The admin source currently lives **inside** the app (`apps/app/src/app/admin`,
`apps/app/src/components/admin`, `apps/app/src/app/api/admin`, 67 API routes). Because admin must not
be public, it has to come out before this repository can be published as-is.

The measured boundary is in `docs/deployment/admin-split-plan.md`: **118 admin-only files move, 150
shared files become a package, 998 stay in the app.** The shared set is closed — verified, zero
leaks — so the extraction is clean.

**Gate:** both apps build; admin login → dashboard → a data-backed tab works.

### Step B — move the app to `apps/app` — DONE

`apps/app/` holds the Next.js app: `src/`, `public/`, `tests/`, `scripts/` (app-owned tooling), and
every config (`next.config.ts`, `tsconfig*.json`, `vitest*`, `eslint.config.mjs`, `tailwind.config.js`,
`postcss.config.js`, `components.json`, `.npmrc`, `.env.example`, `package.json`, `package-lock.json`).

Two things had to be handled that the original plan missed:

1. **`scripts/build-worker.mjs` needed no edit at all.** It derives its project root from
   `import.meta.url`, so moving it to `apps/app/scripts/` alongside `src/` kept every derived path
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
