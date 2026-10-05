# Documentation visibility — plan and classification

**Status: PLAN + TOOLING WRITTEN. Not executed — the shell is down (see §7).**

Written 2026-10-04. Companion tooling: `.verify/docs-visibility.mjs` (classify / move / verify) and
`.verify/scan-doc-references.mjs` (find stale breadcrumbs left in source).

---

## 1. The rule

**Deny by default.** A file under `docs/` is public only if it is on an explicit allowlist.
Everything else is internal and belongs in the private tree.

The direction matters. An internal doc that defaults to public is a **leak**. A public doc that
defaults to internal is a two-second fix. Never invert this, and never express the rule as
"exclude these known-bad paths" — a denylist fails open on every document nobody has written yet.

## 2. What is public

| Path | Why |
| --- | --- |
| `README.md` | Entry point. |
| `SECURITY.md` | Vulnerability reporting + the secrets policy. |
| `CONTRIBUTING.md` | How to contribute. |
| `CODE_OF_CONDUCT.md` | Created in this change — `.gitignore` already allowlisted it but the file did not exist. |
| `LICENSE` | MIT. |
| `AGENTS.md`, `CLAUDE.md` | Agent/contributor guidance. Published deliberately — see §5. |
| `docs/README.md` | Public docs index. |
| `docs/app-guide.md` | The product guide. Created in this change. |
| `docs/self-hosting.md` | Running your own instance. Created in this change. |
| `docs/configuration.md` | Environment-variable reference. Created in this change. |

## 3. What is internal — all 96 remaining files under `docs/`

**Every other document under `docs/` is internal.** There is no partial case. The tree is:

| Group | Examples | Why internal |
| --- | --- | --- |
| Deployment runbooks | `deployment/worker-service.md`, `deployment/vps-automation-workers.md`, `deployment/dokploy-worker-*.md` | Names our topology, service names and Dokploy settings. |
| Infrastructure | `communication-system/dns-records.md` | **Contains the production VPS's real public IPv4 and IPv6.** See §4. |
| Migration / recovery | `mongodb-local-vps-migration.md`, `MIGRATION.md`, `mongodb-split-database-recovery.md` | Historical credentials (redacted, but the shape is a map). |
| Audits | `DATA_ARCHITECTURE_AUDIT.md`, `admin_panel_audit_report.md`, `api-route-contract-audit-*.md` | Internal findings. |
| Phase / rollout reports | `PHASE_*` (12 files) | Internal process. |
| Bug and incident notes | `login_issues.md`, `runtime-log-triage-*.md`, `jmap-inbound-body-parts-bug.md` | Names defects, sometimes unpatched. |
| Implementation plans & task tracking | `IMPLEMENTATION_PLAN.md`, `plan*.md`, `task*.md`, `*-task-tracking.md` | Internal working state. |
| Product / design internals | `design-system.md`, `seo-*-content.md` | Internal working documents. |
| `application-automation/` (14 files), `cv-layout/` (4), `journey/`, `auto-apply/`, `architecture/` | | Internal analysis. |

Root-level registers, also internal:

- `server_bugs.md` — the bug register. **Currently tracked** (`.gitignore` negates it explicitly).
- `refactor_audit.md` — the refactor register. Same.

## 4. ⚠️ What the audit found

**`docs/communication-system/dns-records.md` exposes the production VPS.** It carries the real
public IPv4 and IPv6 addresses, the mail hostname, the DNS provider, and the full SPF/DKIM/DMARC
record set. This is the single most sensitive document in the tree, and it is currently tracked in a
repository intended to be public.

Also in the tree: `docs/apple-login-setup.md` names a real deployment domain in its callback-URL
examples. Less severe (domains are semi-public), but it is deployment-specific and does not belong in
a generic guide.

Neither is fixed by moving the files alone — **anything that was ever committed must be treated as
disclosed.** See §6.

## 5. Traps this move hits — all four are silent

1. **`docs/lindkedin_prompt.md` is read at runtime.**
   `apps/airesume_app/src/app/api/linkedin-enhance/route.ts` reads it via `findUpDir()`, and
   `apps/airesume_app/src/lib/prompts/linkedin-enhancer-prompt.ts` declares it the **source of truth** for the
   generated prompt file. It is a build/regeneration input, not documentation.
   **→ It must move to `apps/airesume_app/src/lib/prompts/`, beside its generated counterpart — not to the
   private tree.** The route and the generator comment both need updating. This is the one file where
   "move everything under docs/" is the wrong answer.

2. **~100 source files carry a breadcrumb to `docs/application-automation/fix-tasks.md`** in a
   `@ts-nocheck` / `@ts-ignore` marker. They break nothing, which is exactly why they would go
   unnoticed. `.verify/scan-doc-references.mjs` enumerates them; the fix is a single scripted rewrite
   per group, not 100 hand edits.

3. **`.gitignore` contains `!/docs/**`, which re-includes the entire tree.** So a private file parked
   under a public path is *tracked*, not ignored. The negation must be narrowed to the public
   allowlist when the split lands.

4. **`*.md` matches at every depth.** Anything moved under `apps/admin/` would be **silently dropped**
   from the public repo — no error, no diff. This is the SB-15 failure mode, and it is why
   `.verify/docs-visibility.mjs --check` asserts the exclusion rather than assuming it.

A fifth, related trap: **public files reference internal docs.** `README.md` and
`apps/airesume_app/.env.example` both point readers at `docs/deployment/*`. A public file naming a private
document leaks its existence and title. The references in `README.md` and `.env.example` were
rewritten in this change; a scan for the rest is worth running.

## 6. Target layout

```
/
├── README.md  SECURITY.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  LICENSE
├── AGENTS.md  CLAUDE.md
├── docs/                          ← PUBLIC only
│   ├── README.md  app-guide.md  self-hosting.md  configuration.md
├── apps/
│   ├── app/
│   │   └── src/lib/prompts/lindkedin_prompt.md   ← relocated (trap 1)
│   ├── resumebuilder-worker/
│   └── admin/                     ← private submodule
│       ├── docs/                  ← all 96 internal documents, tree preserved
│       └── registers/             ← server_bugs.md, refactor_audit.md
```

`apps/admin` is the repository's only private project, so it is the private tree. The admin app
itself does not exist yet — the extraction is still pending — so `--apply` creates the directory and
the `.gitignore` exclusion, and the documents sit there ready for the submodule.

> **Worth reconsidering:** the app's architecture documents have nothing to do with the admin panel.
> A dedicated private `AIResume-internal` repository would be the cleaner home, and would avoid
> coupling app documentation to the admin project's lifecycle. `apps/admin/docs` is used here only
> because it is the private repository that already exists in the plan.

## 7. Execution

The shell is currently dead — every command, including `echo`, returns exit 137 / SIGTERM, and a
background `ls docs/` hung for 3m49s before being killed. **Nothing below has been run.**

```bash
# 1. classify (no writes)
node .verify/docs-visibility.mjs

# 2. relocate trap 1 first, by hand — it is not a documentation move
#    docs/lindkedin_prompt.md -> apps/airesume_app/src/lib/prompts/lindkedin_prompt.md
#    then update:
#      apps/airesume_app/src/app/api/linkedin-enhance/route.ts
#      apps/airesume_app/src/lib/prompts/linkedin-enhancer-prompt.ts

# 3. move the internal set
node .verify/docs-visibility.mjs --apply

# 4. verify visibility
node .verify/docs-visibility.mjs --check

# 5. find and fix the breadcrumbs
node .verify/scan-doc-references.mjs

# 6. no credential shape in the public tree
node .verify/scan-secrets.mjs
```

Then the extraneous-file sweep (§8) and a build/test gate:

```bash
cd apps/airesume_app && npx next build && npx vitest run   # baseline: 5 failures / 3 files, 677 passing
```

## 8. Extraneous files to remove

| Path | Why |
| --- | --- |
| `docs/.DS_Store` | OS metadata, tracked (the `!/docs/**` negation re-included it). |
| `apps/airesume_app/src/app/probe-check/` | Temporary Turbopack alias probe. Must not ship. |
| `packages/shared/` (3 files) | Leftover from the abandoned shared-package attempt. |
| `/package-lock.json` (root) | Written by the failed workspace install; the root package has no dependencies. |
| `scripts/.vps-status.json` | A local status cache that leaks a developer's absolute filesystem path. Should be gitignored, not tracked. |
| `docs/1783075281063-canvas-header-rendering.md` | Timestamp-named scratch file. |
| `/tmp/cvcircle-app-nm-backup` | 1.4 GB backup of `node_modules` from the abandoned attempt. Outside the repo; delete for disk. |

**Not extraneous — do not remove:** `apps/airesume_app/package-lock.json`. An earlier note called it a "stale
duplicate", but that was under the abandoned npm-workspaces design. With workspaces dropped it is
the app's authoritative lockfile, and the Dockerfile's `npm ci` depends on it.

`brag-output/` (5,812 files) and `dist/` are already gitignored, so they are not in the repository —
but they are large on disk. `brag-output/` is worth reviewing separately.

## 9. Verification — what "correct visibility" means

`.verify/docs-visibility.mjs --check` must pass all four:

1. Every file under `docs/` is on the public allowlist.
2. Neither root register is present.
3. No private marker (VPS addresses, internal hostnames, Dokploy ids, Atlas cluster id) appears in any
   public file.
4. The private tree is excluded from the public repo.

Plus `node .verify/scan-secrets.mjs` reporting no new hits.

## 10. ⚠️ Rotation is still required

Moving and untracking a document does not un-disclose it. `docs/communication-system/dns-records.md`
has been tracked, so **treat the VPS addresses as known**. The same applies to every credential listed
in `docs/deployment/public-release.md` §3. Rotate first, then purge history — the existing
`scripts/publish/prepare-public-release.sh` handles the history rewrite.

## 11. Open decisions

1. **`apps/admin/docs` or a dedicated private repo?** See the note in §6.
2. **Publish `AGENTS.md`?** It is useful contributor context, but it references the internal
   registers by name and §53/54 instructs maintainers to keep `docs/application-automation/` current
   — a path that will no longer exist in the public tree. Either sanitise it or move it.
3. **`brag-output/`** — keep or delete? Untracked either way, but it is the largest thing on disk.
